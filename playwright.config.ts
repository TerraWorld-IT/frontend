// UltraPlan M6-minimal — Playwright config
//
// CI 는 본 config 의 `bun e2e` 또는 `bunx playwright test` 로 실행 (unattended).
// LLM/agent local 검증은 Playwright MCP 사용 (CI 환경에 MCP 없음).
// 두 layer 분리: ADR-001 + UltraPlan §0 / §4.5.
//
// 환경:
//   BASE_URL 미지정 → http://localhost:3000 (dev server 가정)
//   BASE_URL=https://terraworld.app → production smoke (manual trigger)

import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    // visual regression: pixi canvas 영역 mask (Codex Q7 권고)
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: process.env.CI
    ? [['html', { outputFolder: 'playwright-report', open: 'never' }], ['line']]
    : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // 한국어 UI 가정
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // mobile viewport — Capacitor WebView 와 가까운 viewport
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // CI 에서는 외부 dev server 가 별도 step 으로 기동된다고 가정.
  // 로컬에서 자동 spawn 필요 시 webServer 블록 활성화 (주석 해제):
  // webServer: {
  //   command: 'bun dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
})
