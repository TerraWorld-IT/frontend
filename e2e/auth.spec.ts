// UltraPlan M6-min smoke 1 — auth flow
//
// 시나리오: /auth/login 진입 → form 요소 존재 확인 → 가짜 credentials submit 시
// 401 또는 에러 응답 확인 (실제 로그인은 backend dependency 가짜 fixture 필요).
//
// 정상 로그인 검증은 M2 R2 integration 단계에서 fixture user + 실 DB 와 함께 보강 예정.

import { test, expect } from '@playwright/test'

test.describe('Auth — login page smoke', () => {
  test('/auth/login 진입 시 핵심 form 요소 존재', async ({ page }) => {
    await page.goto('/auth/login')

    // 페이지가 정상 로드 (Nuxt SSR 또는 CSR fallback)
    await expect(page).toHaveURL(/\/auth\/login/)

    // email + password input
    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    await expect(emailInput).toBeVisible({ timeout: 10_000 })
    await expect(passwordInput).toBeVisible()
  })

  test('console error 없음 (regression check)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
    })

    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle', { timeout: 10_000 })

    // 알려진 noise (Vue dev warnings, third-party tracker init 실패 등) allowlist
    const ALLOW = [/favicon/, /OPN/, /devtools/]
    const significant = errors.filter((e) => !ALLOW.some((p) => p.test(e)))

    expect(significant, `Unexpected page errors:\n${significant.join('\n')}`).toEqual([])
  })
})
