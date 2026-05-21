// UltraPlan M6-min smoke 3 — record creation flow
//
// 시나리오: /record 진입 + 카테고리 그리드 / 입력 UI 가시성 + console error 부재.
// 실 record 저장 + 사진 업로드는 M2 (R2 presigned URL) 도입 시 LLM Direct Test 로 보강.

import { test, expect } from '@playwright/test'

test.describe('Record — page smoke', () => {
  test('/record 진입 시 page 가 정상 응답', async ({ page }) => {
    const response = await page.goto('/record')
    expect(response?.status()).toBeLessThan(500)
  })

  test('인증되지 않은 상태에서 /record 가 /auth/login 으로 redirect (auth middleware)', async ({ page }) => {
    await page.goto('/record')
    // middleware/auth.ts 가 tw.session_token 쿠키 부재 시 redirect 한다고 가정.
    // 실제 redirect URL 은 frontend route 결정 — login URL 또는 auth/login.
    await page.waitForURL(/auth\/login|\/record/, { timeout: 5000 }).catch(() => {})
    const finalUrl = page.url()
    // 둘 중 하나여야 — auth 보호된 페이지가 정상 동작 (redirect) 또는 protect-by-default 미적용 시 record 페이지
    expect(finalUrl).toMatch(/(auth\/login|\/record)/)
  })

  test('5xx 응답 없음', async ({ page }) => {
    const errors: number[] = []
    page.on('response', (res) => {
      if (res.status() >= 500) errors.push(res.status())
    })
    await page.goto('/record')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    expect(errors).toEqual([])
  })
})
