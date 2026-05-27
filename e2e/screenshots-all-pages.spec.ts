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
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// test-results/ 는 Playwright 가 매 실행마다 auto-clean → grep 필터 retry 시 직전 PNG 가 사라짐.
// 캡처 산출물은 별 디렉토리에 저장 (e2e/output-screenshots/).
const SCREENSHOT_DIR = path.resolve(__dirname, './output-screenshots')

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
  // Nuxt devtools floating anchor 가 fullPage screenshot 의 하단 nav 와 겹쳐서 보임 — 캡처 직전 제거.
  // cycle 5 UI 깨짐 fix: AttendanceWidget header wrap + devtools overlay 가림 정리.
  // Nuxt 4 devtools 의 실제 host tag: <nuxt-route-announcer>, <nuxt-devtools-host>, anchor html element.
  await page.addStyleTag({
    content: `
      nuxt-devtools-host,
      nuxt-route-announcer,
      iframe[src*="__nuxt_devtools__"],
      #nuxt-devtools-anchor,
      [class*="__nuxt-devtools"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
    `,
  }).catch(() => {})
  await page.evaluate(() => {
    // shadow root + custom element host 둘 다 제거
    document.querySelectorAll('nuxt-devtools-host, nuxt-route-announcer, #nuxt-devtools-anchor').forEach((el) => el.remove())
  }).catch(() => {})
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

  test('flow-4-홈-기본-mobile-portrait', async ({ page }) => {
    // TerraWorld 는 mobile 세로 전용 — playwright.config 의 project (Pixel 5 393×851)
    // 그대로 사용. 반응형 multi-viewport 캡처는 본 서비스 정책 외.
    await signUpAndLogin(page)
    await page.goto('/')
    await shot(page, 'flow-04-home-mobile-portrait')
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

  // ───── cycle 6 추가 — 잔여 화면 ─────

  test('flow-11-가입모드-폼', async ({ page }) => {
    // signup mode 토글 후 nickname + birthDate 필드 노출 상태
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle').catch(() => {})
    const toggleBtn = page.locator('button[type="button"]', {
      hasText: /계정이 없으신가요|가입하기/,
    }).first()
    if (await toggleBtn.isVisible().catch(() => false)) {
      await toggleBtn.click()
      await page.waitForTimeout(500)
    }
    await shot(page, 'flow-11-signup-mode')
  })

  test('flow-12-effect-button-cycle', async ({ page }) => {
    // 파티클 4종 (rain/snow/firefly/bubble) 의 fullPage 캡처는 PixiJS WebGL headless 한계로
    // visual 차이가 사실상 button icon 미세 변화에 그침 → 4장 PNG (rain/snow/firefly/bubble) 을
    // 단일 PNG 로 통합 + effect button row 영역만 element-level screenshot 으로 close-up 캡처.
    // 본 PNG 는 cycle 의 한 stage (bubble = 4번 클릭 후) 만 캡처. 4 icon 의 차이는 코드 주석으로 기록:
    //   - 0회 클릭 (default): lucide:cloud (자동)
    //   - 1회: lucide:cloud-rain-wind (rain)
    //   - 2회: lucide:snowflake (snow)
    //   - 3회: lucide:sparkle (firefly)
    //   - 4회: lucide:droplets (bubble)
    //   - 5회: lucide:cloud-off (off)
    await signUpAndLogin(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    for (let i = 0; i < 4; i++) {
      await page.locator('[data-testid="home-effect"]').click().catch(() => {})
      await page.waitForTimeout(300)
    }
    await page.waitForTimeout(1500)
    // effect button row close-up — 5 effect button 그룹 전체 영역 element-level screenshot
    const effectRow = page.locator('[data-testid="home-effect"]').locator('xpath=..').first()
    if (await effectRow.isVisible().catch(() => false)) {
      await effectRow.screenshot({
        path: path.join(SCREENSHOT_DIR, 'flow-12-effect-button-cycle.png'),
      })
    }
    else {
      // fallback — fullPage 캡처
      await shot(page, 'flow-12-effect-button-cycle')
    }
  })

  test('flow-13-자세히보기-expanded', async ({ page }) => {
    // calendar 활동 통계 자세히보기 toggle 후 카테고리 별 progress 보임
    await signUpAndLogin(page)
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle').catch(() => {})
    const detailBtn = page.locator('button', { hasText: /자세히보기/ }).first()
    if (await detailBtn.isVisible().catch(() => false)) {
      await detailBtn.click()
      await page.waitForTimeout(500)
    }
    await shot(page, 'flow-13-calendar-stats-expanded')
  })

  test('flow-14-친구코드-발급', async ({ page }) => {
    // friends 페이지 진입 시 초대 코드 자동 생성 또는 발급 button 클릭
    await signUpAndLogin(page)
    await page.goto('/friends')
    await page.waitForLoadState('networkidle').catch(() => {})
    const createBtn = page.locator('[data-testid="friends-create-code"]').first()
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click()
      await page.waitForTimeout(1500)
    }
    await shot(page, 'flow-14-friends-code-issued')
  })

  test('flow-15-캘린더-날짜선택', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle').catch(() => {})
    // 캘린더 그리드 의 첫 번째 활성 날짜 클릭 (오늘 또는 임의 날짜)
    const dayBtn = page.locator('button:has-text("15"), button:has-text("20")').first()
    if (await dayBtn.isVisible().catch(() => false)) {
      await dayBtn.click()
      await page.waitForTimeout(500)
    }
    await shot(page, 'flow-15-calendar-day-selected')
  })

  test('flow-16-테라리움-편집모드', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/terrarium')
    await page.waitForLoadState('networkidle').catch(() => {})
    const editTab = page.locator('button', { hasText: /편집/ }).first()
    if (await editTab.isVisible().catch(() => false)) {
      await editTab.click()
      await page.waitForTimeout(500)
    }
    await shot(page, 'flow-16-terrarium-edit-mode')
  })

  test('flow-17-다크모드-강제', async ({ page }) => {
    // useTimeAwareColorMode 가 'system' preference 일 때만 시간 기반 자동 — 'dark' 명시
    // 시 그대로. addInitScript 으로 page load 전 localStorage 주입 (hydration 시 적용).
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.addInitScript(() => {
      try { localStorage.setItem('nuxt-color-mode', 'dark') } catch { /* noop */ }
    })
    await signUpAndLogin(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(800)
    await shot(page, 'flow-17-dark-mode-forced')
  })

  test('flow-18-라이트모드-강제', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.addInitScript(() => {
      try { localStorage.setItem('nuxt-color-mode', 'light') } catch { /* noop */ }
    })
    await signUpAndLogin(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(800)
    await shot(page, 'flow-18-light-mode-forced')
  })

  test('flow-19-record-friend-tab', async ({ page }) => {
    // record 페이지의 "친구와 함께 기록" tab toggle
    await signUpAndLogin(page)
    await page.goto('/record')
    await page.waitForLoadState('networkidle').catch(() => {})
    const friendTab = page.locator('button', { hasText: /친구와 함께/ }).first()
    if (await friendTab.isVisible().catch(() => false)) {
      await friendTab.click()
      await page.waitForTimeout(500)
    }
    await shot(page, 'flow-19-record-friend-tab')
  })

  test('flow-20-shop-figure-tab', async ({ page }) => {
    // shop 의 "피규어 상점" tab
    await signUpAndLogin(page)
    await page.goto('/shop')
    await page.waitForLoadState('networkidle').catch(() => {})
    const figureTab = page.locator('button', { hasText: /피규어/ }).first()
    if (await figureTab.isVisible().catch(() => false)) {
      await figureTab.click()
      await page.waitForTimeout(800)
    }
    await shot(page, 'flow-20-shop-figure-tab')
  })

  test('flow-21-ranking-decoration-tab', async ({ page }) => {
    // ranking 의 "꾸미기 (배치 수)" tab
    await signUpAndLogin(page)
    await page.goto('/ranking')
    await page.waitForLoadState('networkidle').catch(() => {})
    const decoTab = page.locator('button', { hasText: /꾸미기|배치/ }).first()
    if (await decoTab.isVisible().catch(() => false)) {
      await decoTab.click()
      await page.waitForTimeout(500)
    }
    await shot(page, 'flow-21-ranking-decoration')
  })

  test('flow-22-shop-rare-filter', async ({ page }) => {
    // shop 의 "레어" 희귀도 필터
    await signUpAndLogin(page)
    await page.goto('/shop')
    await page.waitForLoadState('networkidle').catch(() => {})
    const rareFilter = page.locator('button', { hasText: /^레어$/ }).first()
    if (await rareFilter.isVisible().catch(() => false)) {
      await rareFilter.click()
      await page.waitForTimeout(500)
    }
    await shot(page, 'flow-22-shop-rare-filter')
  })
})

// ─────────────────────────────────────────────────────────
// 6) cycle 6 신규 모달 캡처 — data-testid 기반
// ─────────────────────────────────────────────────────────

test.describe('cycle 6 모달 정밀화', () => {
  test('M-E2-shop-교환-modal', async ({ page }) => {
    // M-E 교환은 shop 페이지의 모달 (profile 아님)
    await signUpAndLogin(page)
    await page.goto('/shop')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.locator('[data-testid="shop-exchange-trigger"]').click().catch(() => {})
    await page.waitForTimeout(800)
    await shot(page, 'M-E2-shop-exchange-modal')
  })

  test('M-G2-진화-modal-trigger', async ({ page }) => {
    // 홈의 진화 button (data-testid="home-evolution") 클릭 → showUpgradeModal=true
    // Lv1 이라 조건 미충족 일 수도 있지만 modal 자체는 노출됨 (조건 안내 UI 포함)
    await signUpAndLogin(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.locator('[data-testid="home-evolution"]').click().catch(() => {})
    await page.waitForTimeout(800)
    await shot(page, 'M-G2-evolution-upgrade-modal')
  })

  test('M-B2-홈-다운로드-trigger', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    // onShareClick → html2canvas 가 dom 캡처 후 share UI 노출 (또는 toast)
    // download dialog 가 native 라 캡처 후 reload
    await page.locator('[data-testid="home-download"]').click().catch(() => {})
    await page.waitForTimeout(2000)
    await shot(page, 'M-B2-download-share-flow')
  })

  test('M-C2-홈-무료코인-광고-trigger', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    // showFreeCoinDialog = true
    await page.locator('[data-testid="home-freecoin"]').click().catch(() => {})
    await page.waitForTimeout(1000)
    await shot(page, 'M-C2-freecoin-ad-modal')
  })

  test('M-H-홈-레벨업-안내-modal', async ({ page }) => {
    // 레벨업 안내 button (data-testid="home-levelup") — showLevelUpDialog=true
    await signUpAndLogin(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.locator('[data-testid="home-levelup"]').click().catch(() => {})
    await page.waitForTimeout(800)
    await shot(page, 'M-H-levelup-info-modal')
  })
})

// ─────────────────────────────────────────────────────────
// 7) cycle 7 — onboarding step + reward flow + 로그아웃 confirm
// ─────────────────────────────────────────────────────────

/**
 * onboarding 캡처 helper — localStorage flag 미주입 후 가입해 onboarding 활성화 상태로 시작.
 * signUpAndLogin 은 `tw-onboarding-done='true'` addInitScript 으로 skip 하지만, 본 helper 는
 * 그 init script 가 적용되기 전 raw signup 으로 onboarding 첫 step 노출 보장.
 */
/**
 * cycle 10 — backend state seed helper.
 * signUpAndLogin 직후 호출 → user_id 추출 → docker exec 으로 user-specific seed.
 * dev DB 만 변경 (tw-dev-postgres). production 영향 없음.
 * 사용자 명시 승인 phrase 통과 후 진행.
 */
async function seedCurrentUserState(page: Page) {
  const meResp = await page.request.get(`${process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001'}/api/v1/users/me`)
  if (!meResp.ok()) return null
  const me = await meResp.json() as { id?: string }
  const userId = me.id
  if (!userId) return null
  const sql = `UPDATE users SET level=10, total_exp=4500 WHERE id='${userId}'; `
    + `UPDATE terrariums SET evolution_stage='PALUDARIUM' WHERE user_id='${userId}'; `
    + `INSERT INTO activity_records (user_id, category_id, memo, recorded_date, created_at) `
    + `SELECT '${userId}', (1+(gs%4))::bigint, 'memo '||gs, `
    + `  CURRENT_DATE - (gs||' days')::interval, NOW() - (gs||' days')::interval `
    + `FROM generate_series(0,29) gs;`
  try {
    execSync(`docker exec tw-dev-postgres psql -U terraworld -d terraworld -c "${sql.replace(/"/g, '\\"')}"`, { stdio: 'pipe' })
  }
  catch (e) {
    console.warn('seed fail:', (e as Error).message)
  }
  return userId
}

async function signupWithoutOnboardingSkip(page: Page) {
  const user = freshUser()
  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

  const toggleBtn = page.locator('button[type="button"]', {
    hasText: /계정이 없으신가요|가입하기/,
  }).first()
  if (await toggleBtn.isVisible().catch(() => false)) {
    await toggleBtn.click()
  }

  await page.locator('input[type="email"]').first().fill(user.email)
  await page.locator('input[type="password"]').first().fill(user.password)
  const nameInput = page.locator('input[placeholder*="닉네임"]').first()
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill(user.name)
  }
  const birthInput = page.locator('input[type="date"]').first()
  if (await birthInput.isVisible().catch(() => false)) {
    await birthInput.fill(user.birthDate)
  }

  await page.locator('button[type="submit"]').first().click()
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(2000)

  // cookie 강제 inject (chromium IPv6 attach bug 회피)
  const cookies = await page.context().cookies()
  const allSessionCookies = cookies.filter(
    (c) => c.name.startsWith('tw.') || c.name.includes('session') || c.name.includes('csrf'),
  )
  if (allSessionCookies.length > 0) {
    const cookieHeader = allSessionCookies.map((c) => `${c.name}=${c.value}`).join('; ')
    await page.context().setExtraHTTPHeaders({ cookie: cookieHeader })
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001'
    await page.context().clearCookies()
    await page.context().addCookies(
      allSessionCookies.map((c) => ({
        name: c.name,
        value: c.value,
        url: baseUrl,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      })),
    )
  }
}

test.describe('cycle 7 onboarding step + UX', () => {
  test('flow-23-onboarding-step-2', async ({ page }) => {
    await signupWithoutOnboardingSkip(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(2000) // onboarding 자동 표시 대기
    await page.locator('[data-testid="onboarding-next"]').click().catch(() => {})
    await page.waitForTimeout(500)
    await shot(page, 'flow-23-onboarding-step-2')
  })

  test('flow-24-onboarding-step-3', async ({ page }) => {
    await signupWithoutOnboardingSkip(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(2000)
    for (let i = 0; i < 2; i++) {
      await page.locator('[data-testid="onboarding-next"]').click().catch(() => {})
      await page.waitForTimeout(400)
    }
    await shot(page, 'flow-24-onboarding-step-3')
  })

  test('flow-25-onboarding-step-4', async ({ page }) => {
    await signupWithoutOnboardingSkip(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(2000)
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="onboarding-next"]').click().catch(() => {})
      await page.waitForTimeout(400)
    }
    await shot(page, 'flow-25-onboarding-step-4')
  })

  test('flow-26-onboarding-step-5-start', async ({ page }) => {
    await signupWithoutOnboardingSkip(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(2000)
    for (let i = 0; i < 4; i++) {
      await page.locator('[data-testid="onboarding-next"]').click().catch(() => {})
      await page.waitForTimeout(400)
    }
    // step 5 — "시작하기" button 노출
    await shot(page, 'flow-26-onboarding-step-5-start')
  })

  test('flow-27-record-saved-reward-toast', async ({ page }) => {
    // 기록 저장 flow + RewardToast 노출
    await signUpAndLogin(page)
    await page.goto('/record')
    await page.waitForLoadState('networkidle').catch(() => {})
    // 산책 카테고리 클릭
    const walkBtn = page.locator('button', { hasText: /산책/ }).first()
    if (await walkBtn.isVisible().catch(() => false)) {
      await walkBtn.click()
      await page.waitForTimeout(400)
    }
    // 저장 button 클릭
    const saveBtn = page.locator('button', { hasText: /저장|기록 저장|완료/ }).first()
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click()
      // confetti + toast 노출 timing
      await page.waitForTimeout(1500)
    }
    await shot(page, 'flow-27-record-saved-reward-toast')
  })

  test('flow-28-profile-logout-confirm', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/profile')
    await page.waitForLoadState('networkidle').catch(() => {})
    // 프로필 하단 로그아웃 button
    const logoutBtn = page.locator('button', { hasText: /^로그아웃$/ }).first()
    if (await logoutBtn.isVisible().catch(() => false)) {
      // confirm dialog (window.confirm) 가 native — page.on('dialog') 으로 dismiss + 캡처
      page.on('dialog', async (dialog) => {
        // 캡처 시점에 dialog 활성. dismiss 로 logout cancel
        await dialog.dismiss()
      })
      await logoutBtn.click().catch(() => {})
      await page.waitForTimeout(800)
    }
    await shot(page, 'flow-28-profile-logout-confirm')
  })

  test('flow-29-friends-section3-empty', async ({ page }) => {
    // friends 페이지의 "내 친구" 빈 상태 — 11-friends 의 scroll 하단
    await signUpAndLogin(page)
    await page.goto('/friends')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(400)
    await shot(page, 'flow-29-friends-list-empty')
  })

  test('flow-31-friends-code-input-active', async ({ page }) => {
    // 친구 코드 8자 입력 후 "코드 수락하기" 활성 상태
    await signUpAndLogin(page)
    await page.goto('/friends')
    await page.waitForLoadState('networkidle').catch(() => {})
    const codeInput = page.locator('input[maxlength="8"]').first()
    if (await codeInput.isVisible().catch(() => false)) {
      await codeInput.fill('ABCD1234')
      await page.waitForTimeout(300)
    }
    await shot(page, 'flow-31-friends-code-input-active')
  })

  test('flow-32-shop-rare-filter', async ({ page }) => {
    // shop 식물 + 레어 필터
    await signUpAndLogin(page)
    await page.goto('/shop')
    await page.waitForLoadState('networkidle').catch(() => {})
    const rareBtn = page.locator('button', { hasText: /^레어$/ }).first()
    if (await rareBtn.isVisible().catch(() => false)) {
      await rareBtn.click()
      await page.waitForTimeout(500)
    }
    await shot(page, 'flow-32-shop-plant-rare-filter')
  })

  test('flow-33-shop-epic-filter', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/shop')
    await page.waitForLoadState('networkidle').catch(() => {})
    const epicBtn = page.locator('button', { hasText: /^에픽$/ }).first()
    if (await epicBtn.isVisible().catch(() => false)) {
      await epicBtn.click()
      await page.waitForTimeout(500)
    }
    await shot(page, 'flow-33-shop-plant-epic-filter')
  })

  test('flow-34-shop-background-filter', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/shop')
    await page.waitForLoadState('networkidle').catch(() => {})
    const bgBtn = page.locator('button', { hasText: /^배경$/ }).first()
    if (await bgBtn.isVisible().catch(() => false)) {
      await bgBtn.click()
      await page.waitForTimeout(500)
    }
    await shot(page, 'flow-34-shop-background-filter')
  })

  test('M-F2-홈-slot-itemselect', async ({ page }) => {
    // 홈 페이지 slot 0 (후경 첫 번째) 클릭 → ItemSelectDialog 모달 노출
    await signUpAndLogin(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    // slot 0 는 jar 안의 첫 button — 후경 (background) 슬롯
    const slot0 = page.locator('button:has-text("후경")').first()
    if (await slot0.isVisible().catch(() => false)) {
      await slot0.click()
      await page.waitForTimeout(800)
    }
    await shot(page, 'M-F2-home-slot-itemselect-modal')
  })

  test('flow-35-share-valid-code', async ({ page }) => {
    // valid share code 경로 — 사용자 자신의 코드를 발급해 본인 share 페이지 접근
    // 본 e2e 에서는 본인 코드라 unable to accept self-invite 결과 캡처
    await signUpAndLogin(page)
    await page.goto('/friends')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.locator('[data-testid="friends-create-code"]').click().catch(() => {})
    await page.waitForTimeout(1500)
    // 발급된 코드 추출
    const codeEl = page.locator('code.font-mono').first()
    const code = await codeEl.textContent().catch(() => null)
    if (code) {
      await page.goto(`/share/${code.trim()}`)
      await page.waitForLoadState('networkidle').catch(() => {})
      await page.waitForTimeout(800)
    }
    await shot(page, 'flow-35-share-valid-code')
  })

  // ───── cycle 10 — backend state seed 후 캡처 ─────

  test('flow-36-shop-카탈로그-식물', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/shop')
    await page.waitForLoadState('networkidle').catch(() => {})
    // 식물 상점 = default tab. items 카탈로그 (잔디/새싹/파란꽃/해바라기/큰나무) 노출 기대
    await shot(page, 'flow-36-shop-plant-catalog-loaded')
  })

  test('flow-37-shop-카탈로그-피규어', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/shop')
    await page.waitForLoadState('networkidle').catch(() => {})
    const figureTab = page.locator('button', { hasText: /피규어/ }).first()
    if (await figureTab.isVisible().catch(() => false)) {
      await figureTab.click()
      await page.waitForTimeout(800)
    }
    await shot(page, 'flow-37-shop-figure-catalog-loaded')
  })

  test('flow-38-calendar-with-records', async ({ page }) => {
    await signUpAndLogin(page)
    // user-specific seed (records 30 day + Lv10 + paludarium)
    await seedCurrentUserState(page)
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1000)
    await shot(page, 'flow-38-calendar-with-records')
  })

  test('flow-39-ranking-with-data', async ({ page }) => {
    await signUpAndLogin(page)
    await seedCurrentUserState(page)
    await page.goto('/ranking')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1000)
    await shot(page, 'flow-39-ranking-with-data')
  })

  test('M-G3-진화-paludarium-unlocked', async ({ page }) => {
    // Lv10 + paludarium seed 후 진화 모달 → 다음 단계 (나만의 세계 Lv20) 도 unlock 표시
    await signUpAndLogin(page)
    await seedCurrentUserState(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)
    await page.locator('[data-testid="home-evolution"]').click().catch(() => {})
    await page.waitForTimeout(800)
    await shot(page, 'M-G3-evolution-paludarium-unlocked')
  })

  test('flow-40-profile-with-records', async ({ page }) => {
    // profile 페이지의 레벨/EXP 채워진 상태
    await signUpAndLogin(page)
    await seedCurrentUserState(page)
    await page.goto('/profile')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(800)
    await shot(page, 'flow-40-profile-lv10-with-records')
  })

  test('flow-30-record-form-memo-typed', async ({ page }) => {
    // record 산책 선택 + memo 타이핑 후
    await signUpAndLogin(page)
    await page.goto('/record')
    await page.waitForLoadState('networkidle').catch(() => {})
    const walkBtn = page.locator('button', { hasText: /산책/ }).first()
    if (await walkBtn.isVisible().catch(() => false)) {
      await walkBtn.click()
      await page.waitForTimeout(400)
    }
    const memoInput = page.locator('textarea, input[name="memo"]').first()
    if (await memoInput.isVisible().catch(() => false)) {
      await memoInput.fill('오늘 30분 산책하며 봄을 느꼈다. 길가의 진달래가 활짝.')
      await page.waitForTimeout(300)
    }
    await shot(page, 'flow-30-record-memo-typed')
  })
})
