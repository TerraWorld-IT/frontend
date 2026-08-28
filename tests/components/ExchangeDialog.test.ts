import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { ExchangeRateListResponse } from '@terraworld-it/openapi-frontend'
import ExchangeDialog from '~/components/shop/ExchangeDialog.vue'

const getExchangeRates = vi.fn()
mockNuxtImport('useOpenApi', () => () => ({ sdk: { getExchangeRates, exchange: vi.fn() }, client: {} }))
mockNuxtImport('useGtagEvents', () => () => ({ trackTokenExchanged: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ success: vi.fn(), error: vi.fn() }))
mockNuxtImport('useDialogFocusTrap', () => () => undefined)
mockNuxtImport('useBackButtonStack', () => () => ({ pushBackHandler: () => () => undefined }))

function rateResponse(): ExchangeRateListResponse {
  return {
    rates: [
      { from: 'DEW', to: 'COIN', rate: 0.1, rateLabel: '10:1', feeBps: 1000, dailyCap: 500 },
      { from: 'RUBY', to: 'COIN', rate: 50, rateLabel: '1:50', feeBps: 0, dailyCap: 100 },
    ],
  }
}

async function flush(): Promise<void> {
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await nextTick()
}

describe('ExchangeDialog', () => {
  beforeEach(() => {
    getExchangeRates.mockReset()
  })

  afterEach(() => {
    // Teleport 잔류 DOM 과 다이얼로그 스크롤 잠금을 함께 초기화한다.
    document.body.innerHTML = ''
    document.documentElement.classList.remove('scroll-locked')
    document.documentElement.removeAttribute('data-scroll-lock-count')
  })

  it('열릴 때 환율표를 조회하고 선택 pair 의 환율 수수료 일일 한도를 사전 표시한다', async () => {
    getExchangeRates.mockResolvedValue({ data: rateResponse(), error: undefined })
    await mountSuspended(ExchangeDialog, { props: { modelValue: true } })
    await flush()

    expect(getExchangeRates).toHaveBeenCalledTimes(1)
    const info = document.body.querySelector<HTMLElement>('[data-testid="exchange-rate-info"]')!
    expect(info.textContent).toContain('환율 10:1 · 수수료 10% · 일일 한도 500개')

    const rubyButton = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('루비'))!
    rubyButton.click()
    await nextTick()

    expect(info.textContent).toContain('환율 1:50 · 수수료 0% · 일일 한도 100개')
  })
})
