// LLM e2e — 전체 페이지 / 모달 / UX 흐름 screenshot 캡처
//
// 본 spec 은 사용자 요청 (2026-05-26 cycle) 의 "LLM 환경에서 전체 화면 캡처" 을 충족.
// 실 backend (8080) + frontend (3000) + tw-dev-postgres (5433) + tw-dev-redis (6380)
// 가 떠 있는 상태에서 실행 — playwright.config.ts 의 webServer 설정 없이 외부 server 가정.
//
// 출력: test-results/screenshots/*.png (기본 Playwright location).
// 인증 필요 페이지는 fixture user 자동 가입 + 로그인 후 캡처.
//
// 카테고리:
//   1) 공개 페이지 (auth/login + share)
//   2) 인증 후 메인 페이지 (홈 / 캘린더 / 기록 / 테라리움 / 상점 / 서랍)
//   3) 인증 후 서브 페이지 (친구 / 랭킹 / 자유배치 / upgrade)
//   4) admin 페이지 5종 (admin role 필요 — DB 직접 UPDATE)
//   5) 모달 7종 — 트리거 후 캡처
//   6) Phase 4 진화 / 시들기 / 보상 토스트 등 시각 effect

import { test, expect, Page } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOT_DIR = path.resolve(__dirname, '../test-results/screenshots')

// fixture 사용자 — test 별 unique (Date.now + Math.random)
// 같은 email 중복 signup 시 better-auth 가 422 응답 → cookie 미set 회귀.
function freshUser() {
  const rand = Math.random().toString(36).slice(2, 8)
  return {
    email: `e2e-${Date.now()}-${rand}@terraworld.test`,
    password: 'TestPassword!1234',
    name: 'E2E 테스터',
    birthDate: '2000-01-01', // 만 14세 차단 통과 (성인)
  }
}

test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  }
})

async function shot(page: Page, name: string) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  })
}

async function signUpAndLogin(page: Page) {
  const user = freshUser()
  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

  // 가입 mode 토글 — login.vue 의 toggle button (type="button") 명시. ko.json:
  //   noAccount + signupAction = "계정이 없으신가요? 가입하기"
  //   hasAccount + login = "이미 계정이 있으신가요? 로그인"
  const toggleBtn = page.locator('button[type="button"]', {
    hasText: /계정이 없으신가요|가입하기/,
  }).first()
  if (await toggleBtn.isVisible().catch(() => false)) {
    await toggleBtn.click()
    // signup mode 전환 후 nickname + birthDate input 가 v-if 로 렌더링
    await page.locator('input[v-model="nickname"], input[type="date"]').first().waitFor({ timeout: 5000 }).catch(() => {})
  }

  // form fill — placeholder 기반 (i18n key 정합)
  await page.locator('input[type="email"]').first().fill(user.email)
  await page.locator('input[type="password"]').first().fill(user.password)
  // nickname: placeholder "닉네임"
  const nameInput = page.locator('input[placeholder*="닉네임"]').first()
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill(user.name)
  }
  // birthDate: type=date
  const birthInput = page.locator('input[type="date"]').first()
  if (await birthInput.isVisible().catch(() => false)) {
    await birthInput.fill(user.birthDate)
  }

  // 응답 모니터 — better-auth signup endpoint 응답 대기
  const signupResp = page.waitForResponse(
    (r) => r.url().includes('/api/auth/sign-up') && r.request().method() === 'POST',
    { timeout: 30_000 },
  ).catch(() => null)

  // submit button (form 안의 type="submit") 명시
  await page.locator('button[type="submit"]').first().click()

  const resp = await signupResp
  if (resp) {
    // 응답 status code 출력 (debugging)
    console.log(`signup status: ${resp.status()}`)
  }

  // backend bootstrap (frontend databaseHooks → Spring /internal/users/bootstrap)
  // + loadJwt (useAuth) 완료 대기
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(2000) // bootstrap 비동기 buffer

  // cookie set 확인 (debugging) — 상세 dump
  const cookies = await page.context().cookies()
  const sessionCookie = cookies.find((c) => c.name.includes('session_token'))
  if (!sessionCookie) {
    console.warn('session_token cookie 미set — signup 실패 또는 cookie 미persist')
    console.warn('all cookies:', JSON.stringify(cookies.map((c) => `${c.name}@${c.domain}${c.path}`), null, 2))
  }
  else {
    console.log(`cookie OK: ${sessionCookie.name}@${sessionCookie.domain}${sessionCookie.path} sameSite=${sessionCookie.sameSite} httpOnly=${sessionCookie.httpOnly}`)

    // 2단 cookie 전략 — chromium headless IPv6 [::1] cookie attach bug 회피:
    //  1) setExtraHTTPHeaders 로 모든 request 의 Cookie header 강제 inject
    //     → SSR middleware 의 useCookie 가 정상 read
    //  2) addCookies (url-based, Lax) 로 chromium cookie store 에도 set
    //     → client side hydration 후 useCookie 가 reactive cookie 봄 (auth middleware CSR 통과)
    //  3) tw.session_data 는 httpOnly=false 라 document.cookie 로도 read 가능
    const allSessionCookies = cookies.filter(
      (c) => c.name.startsWith('tw.') || c.name.includes('session') || c.name.includes('csrf'),
    )
    const cookieHeader = allSessionCookies.map((c) => `${c.name}=${c.value}`).join('; ')
    await page.context().setExtraHTTPHeaders({ cookie: cookieHeader })

    const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001'
    await page.context().clearCookies()
    await page.context().addCookies(
      allSessionCookies.map((c) => ({
        name: c.name,
        value: c.value,
        url: baseUrl,
        httpOnly: false, // client useCookie 가 read 할 수 있도록 dev e2e 한정 강제
        secure: false,
        sameSite: 'Lax' as const,
      })),
    )
    console.log(`cookies installed: ${allSessionCookies.length} (extraHTTPHeaders + addCookies host-only Lax httpOnly=false)`)

    // Onboarding modal skip — 신규 user signup 직후 / 진입 시 localStorage 첫 진입 플래그
    // 보고 5단계 onboarding 자동 표시. 본 e2e 는 메인 화면 캡처가 목적이므로 onboarding
    // skip. (app/pages/index.vue:370 + app/utils/constants.ts: ONBOARDING_DONE='tw-onboarding-done')
    await page.addInitScript(() => {
      try {
        localStorage.setItem('tw-onboarding-done', 'true')
      }
      catch { /* SSR or first-load context — ignore */ }
    })

    // JWT bearer token preload — useAuth.loadJwt() 의 module-scoped clientJwt 가 page
    // navigation 시 reset 되지 않도록 (Nuxt SPA navigation 은 module 유지), signup 직후
    // /api/auth/token 호출해 JWT 받고 그것을 spec 의 모든 backend 호출에 Bearer 로 inject.
    try {
      const tokenResp = await page.request.get(`${process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001'}/api/auth/token`)
      if (tokenResp.ok()) {
        const { token } = await tokenResp.json() as { token: string }
        if (token) {
          await page.context().setExtraHTTPHeaders({
            cookie: cookieHeader,
            authorization: `Bearer ${token}`,
          })
          console.log(`JWT loaded (${token.length}c) — Bearer in extraHTTPHeaders`)
        }
      }
      else {
        console.warn(`/api/auth/token status=${tokenResp.status()}`)
      }
    }
    catch (e) {
      console.warn('JWT preload error:', (e as Error).message)
    }
  }
}

// ─────────────────────────────────────────────────────────
// 1) 공개 페이지 (인증 불요)
// ─────────────────────────────────────────────────────────

test.describe('공개 페이지', () => {
  test('01-auth-login', async ({ page }) => {
    await page.goto('/auth/login')
    await shot(page, '01-auth-login')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('02-share-code-invalid', async ({ page }) => {
    // 잘못된 invite 코드 → 404 or fallback
    await page.goto('/share/INVALID123')
    await shot(page, '02-share-code-invalid')
  })

  test('03-error-page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-404-test')
    await shot(page, '03-error-page')
  })
})

// ─────────────────────────────────────────────────────────
// 2) 인증 후 메인 페이지 (서브 페이지 포함)
// ─────────────────────────────────────────────────────────

test.describe('인증 후 페이지', () => {
  test('04-홈-인증-후', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    await shot(page, '04-home-authed')
    // 인증 통과 sanity check — auth/login URL 로 redirect 되면 인증 fail
    expect(page.url()).not.toContain('/auth/login')
  })

  test('05-record', async ({ page }) => {
    await signUpAndLogin(page)
    page.on('response', (resp) => {
      if (resp.url().includes('/api/v1/') || resp.url().includes('/api/auth/')) {
        console.log(`[05-record API] ${resp.status()} ${resp.url()}`)
      }
    })
    await page.goto('/record')
    await page.waitForLoadState('networkidle').catch(() => {})
    await shot(page, '05-record')
  })

  test('06-calendar', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/calendar')
    await shot(page, '06-calendar')
  })

  test('07-terrarium', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/terrarium')
    await shot(page, '07-terrarium')
  })

  test('08-terrarium-free', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/terrarium/free')
    await shot(page, '08-terrarium-free')
  })

  test('09-shop', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/shop')
    await shot(page, '09-shop')
  })

  test('10-profile', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/profile')
    await shot(page, '10-profile')
  })

  test('11-friends', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/friends')
    await shot(page, '11-friends')
  })

  test('12-ranking', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/ranking')
    await shot(page, '12-ranking')
  })

  test('13-upgrade-free-placement', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/upgrade/free-placement')
    await shot(page, '13-upgrade-free-placement')
  })
})

// ─────────────────────────────────────────────────────────
// 3) Admin 페이지 5종 (현재 비 admin user 라 redirect 또는 403 예상)
// ─────────────────────────────────────────────────────────

test.describe('Admin 페이지 (비 admin user 진입 동작 캡처)', () => {
  test('14-admin-index', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/admin')
    await shot(page, '14-admin-index')
  })

  test('15-admin-items', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/admin/items')
    await shot(page, '15-admin-items')
  })

  test('16-admin-categories', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/admin/categories')
    await shot(page, '16-admin-categories')
  })

  test('17-admin-exchange', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/admin/exchange')
    await shot(page, '17-admin-exchange')
  })

  test('18-admin-levels', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/admin/levels')
    await shot(page, '18-admin-levels')
  })
})

// ─────────────────────────────────────────────────────────
// 4) 모달 / 오버레이 7종 — 트리거 후 캡처
// ─────────────────────────────────────────────────────────

test.describe('모달 7종', () => {
  test('M-A-활동통계-modal', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle').catch(() => {})
    // 캘린더 상단 통계 박스 클릭 시도
    const statBox = page.locator('[data-testid="stat-today"], button:has-text("오늘"), button:has-text("이번 달")').first()
    if (await statBox.isVisible().catch(() => false)) {
      await statBox.click().catch(() => {})
    }
    await shot(page, 'M-A-activity-stats-modal')
  })

  test('M-B-이미지저장-modal', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    const dlBtn = page.locator('button:has-text("저장"), button:has-text("다운로드"), [aria-label*="저장"], [aria-label*="공유"]').first()
    if (await dlBtn.isVisible().catch(() => false)) {
      await dlBtn.click().catch(() => {})
    }
    await shot(page, 'M-B-image-save-modal')
  })

  test('M-C-무료코인-광고-modal', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    const adBtn = page.locator('button:has-text("광고"), button:has-text("햇살"), button:has-text("무료")').first()
    if (await adBtn.isVisible().catch(() => false)) {
      await adBtn.click().catch(() => {})
    }
    await shot(page, 'M-C-ad-reward-modal')
  })

  test('M-D-친구함께-modal', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/record')
    const partnerBtn = page.locator('button:has-text("친구와"), button:has-text("함께")').first()
    if (await partnerBtn.isVisible().catch(() => false)) {
      await partnerBtn.click().catch(() => {})
    }
    await shot(page, 'M-D-partner-record-modal')
  })

  test('M-E-환전-modal', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/profile')
    const exchangeBtn = page.locator('button:has-text("환전"), button:has-text("교환")').first()
    if (await exchangeBtn.isVisible().catch(() => false)) {
      await exchangeBtn.click().catch(() => {})
    }
    await shot(page, 'M-E-exchange-modal')
  })

  test('M-F-보유아이템-modal', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/profile')
    const itemsBtn = page.locator('button:has-text("아이템"), button:has-text("보유")').first()
    if (await itemsBtn.isVisible().catch(() => false)) {
      await itemsBtn.click().catch(() => {})
    }
    await shot(page, 'M-F-items-inventory-modal')
  })

  test('M-G-진화-upgrade-modal', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/terrarium')
    const upBtn = page.locator('button:has-text("진화"), button:has-text("업그레이드")').first()
    if (await upBtn.isVisible().catch(() => false)) {
      await upBtn.click().catch(() => {})
    }
    await shot(page, 'M-G-evolution-upgrade-modal')
  })
})

// ─────────────────────────────────────────────────────────
// 5) UX 흐름 캡처 — Onboarding / 기록 입력 / 상점 구매
// ─────────────────────────────────────────────────────────

test.describe('UX 흐름', () => {
  test('flow-1-온보딩-step', async ({ page }) => {
    // 신규 가입 직후 onboarding 첫 화면
    await page.goto('/auth/login')
    await signUpAndLogin(page)
    await page.waitForTimeout(2000)
    await shot(page, 'flow-01-onboarding')
  })

  test('flow-2-기록-입력-flow', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/record')
    // 첫 카테고리 (산책) 클릭
    const categoryBtn = page.locator('button:has-text("산책"), [data-category-id]').first()
    if (await categoryBtn.isVisible().catch(() => false)) {
      await categoryBtn.click().catch(() => {})
      await shot(page, 'flow-02-record-category-selected')
    }
    // memo 입력
    const memoInput = page.locator('textarea, input[name="memo"]').first()
    if (await memoInput.isVisible().catch(() => false)) {
      await memoInput.fill('오늘 30분 산책하며 봄을 느꼈다')
      await shot(page, 'flow-03-record-memo-typed')
    }
  })

  test('flow-4-홈-진입후-반응형', async ({ page, viewport }) => {
    await signUpAndLogin(page)

    // mobile viewport
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await shot(page, 'flow-04a-home-mobile')

    // tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await shot(page, 'flow-04b-home-tablet')

    // desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await shot(page, 'flow-04c-home-desktop')
  })

  test('flow-5-다크모드-시간연동', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    // useTimeAwareColorMode 가 06:00~18:00 light / 그 외 dark 자동
    // 실 시간 의존이라 캡처만
    await shot(page, 'flow-05-color-mode-current')
  })

  test('flow-6-홈-스크롤-아래쪽', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    await shot(page, 'flow-06-home-scrolled')
  })

  test('flow-7-출석-위젯-클릭', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    const attendanceBtn = page.locator('button:has-text("출석"), [data-testid="attendance"]').first()
    if (await attendanceBtn.isVisible().catch(() => false)) {
      await attendanceBtn.click().catch(() => {})
      await page.waitForTimeout(1500)
    }
    await shot(page, 'flow-07-attendance-clicked')
  })

  test('flow-8-기록-카테고리-산책-선택', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/record')
    await page.waitForLoadState('networkidle').catch(() => {})
    // 카테고리 grid 의 산책 선택 — `iconUrl + name` 매칭
    const walkBtn = page.locator('button:has-text("산책"), [data-category="WALK"]').first()
    if (await walkBtn.isVisible().catch(() => false)) {
      await walkBtn.click()
      await page.waitForTimeout(500)
    }
    await shot(page, 'flow-08-record-walk-selected')
  })

  test('flow-9-상점-식물-탭', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/shop')
    await page.waitForLoadState('networkidle').catch(() => {})
    const plantTab = page.locator('button:has-text("식물"), [data-tab="plant"]').first()
    if (await plantTab.isVisible().catch(() => false)) {
      await plantTab.click()
      await page.waitForTimeout(800)
    }
    await shot(page, 'flow-09-shop-plant-tab')
  })

  test('flow-10-프로필-스크롤', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/profile')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.evaluate(() => window.scrollTo(0, 400))
    await page.waitForTimeout(300)
    await shot(page, 'flow-10-profile-scrolled')
  })
})
