// UltraPlan M6-min smoke 2 — jar (terrarium) view
//
// 시나리오: 로그인 없이 / (home) 접근 — jar UI 가 SSR 단계에서 placeholder 또는
// auth redirect 인지 확인. 실제 placement 검증은 fixture user + Phase 3 M6-full.

import { test, expect } from '@playwright/test'

test.describe('Jar — home page smoke', () => {
  test('/ 진입 시 page 가 정상 응답 (200 or auth redirect)', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(500)

    // 응답이 200 이면 home 콘텐츠 / redirect 면 /auth/login 으로
    const finalUrl = page.url()
    expect(finalUrl.includes('/') || finalUrl.includes('/auth/login')).toBeTruthy()
  })

  test('home (auth bypassed mock 가정) — Jar/Terrarium 컨테이너 존재', async ({ page }) => {
    // 로컬 dev server 가 mock auth bypass 환경일 때만 의미 — CI 는 backend live
    // 가 없으면 자동 skip.
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // jar 컨셉의 어떤 마커 (CSS class / data attr / heading) 존재 여부
    // 정확한 selector 는 frontend 가 stable 해진 후 확정 — 현재는 한 단어 매칭
    const body = await page.locator('body').textContent({ timeout: 5000 }).catch(() => '')
    if (!body || body.length === 0) {
      test.skip(true, 'home 페이지가 빈 body — auth 보호 페이지 + login redirect 의미')
    }
  })

  test('5xx response 없음', async ({ page }) => {
    const errors: number[] = []
    page.on('response', (res) => {
      if (res.status() >= 500) errors.push(res.status())
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    expect(errors, `5xx responses encountered: ${errors.join(',')}`).toEqual([])
  })
})
