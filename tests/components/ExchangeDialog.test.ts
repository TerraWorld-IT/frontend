import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { ExchangeRateListResponse } from '@terraworld-it/openapi-frontend'
import ExchangeDialog from '~/components/shop/ExchangeDialog.vue'

const getExchangeRates = vi.fn()
const { exchange, success, updateCurrency, fetchMe } = vi.hoisted(() => ({
  exchange: vi.fn(), success: vi.fn(), updateCurrency: vi.fn(), fetchMe: vi.fn(),
}))
vi.mock('~/stores/user', () => ({ useUserStore: () => ({
  currency: { balances: [{ code: 'COIN', amount: 100 }, { code: 'DEW', amount: 100 }] },
  updateCurrency,
  fetchMe,
}) }))
mockNuxtImport('useOpenApi', () => () => ({ sdk: { getExchangeRates, exchange }, client: {} }))
mockNuxtImport('useGtagEvents', () => () => ({ trackTokenExchanged: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ success, error: vi.fn() }))
mockNuxtImport('useDialogFocusTrap', () => () => undefined)
mockNuxtImport('useBackButtonStack', () => () => ({ pushBackHandler: () => () => undefined }))

function rateResponse(): ExchangeRateListResponse {
  return {
    rates: [
      { from: 'DEW', to: 'COIN', rate: 0.1, rateLabel: '10:1', feeBps: 1000, dailyCap: 500 },
      { from: 'RUBY', to: 'COIN', rate: 50, rateLabel: '1:50', feeBps: 0, dailyCap: 100 },
      ...['DEW', 'SUN', 'BOLT', 'WIND'].map(to => ({
        from: 'COIN', to, rate: 5, rateLabel: '1:5', feeBps: 1000, dailyCap: 100,
      })),
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
    vi.clearAllMocks()
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

  it('COIN 출발은 토큰 4종을 선택하고 선택한 pair로 환전하여 실제 도착 재화 안내를 표시한다', async () => {
    getExchangeRates.mockResolvedValue({ data: rateResponse(), error: undefined })
    const currency = { balances: [{ code: 'COIN', amount: 99 }, { code: 'SUN', amount: 4 }] }
    exchange.mockResolvedValue({ data: {
      from: 'COIN', to: 'SUN', fromAmount: 1, toAmount: 4, rate: '1:5', updatedCurrency: currency,
    } })
    await mountSuspended(ExchangeDialog, { props: { modelValue: true } })
    await flush()
    const fromGroup = document.body.querySelector('[aria-label="환전할 재화 선택"]')!
    Array.from(fromGroup.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.includes('코인'))!.click()
    await nextTick()
    const toGroup = document.body.querySelector('[aria-label="받을 재화 선택"]')!
    expect(toGroup.querySelectorAll('button')).toHaveLength(4)
    Array.from(toGroup.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.includes('햇살'))!.click()
    await nextTick()
    expect(document.body.querySelector('[data-testid="exchange-rate-info"]')!.textContent)
      .toContain('환율 1:5 · 수수료 10% · 일일 한도 100개')
    Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.includes('햇살 받기'))!.click()
    await flush()
    expect(exchange).toHaveBeenCalledWith({ client: {}, body: { from: 'COIN', to: 'SUN', amount: 1 } })
    expect(updateCurrency).toHaveBeenCalledWith(currency)
    expect(success).toHaveBeenCalledWith('햇살 4개를 받았습니다! (환율 1:5)')
    expect(fetchMe).toHaveBeenCalledWith(true)

    Array.from(fromGroup.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.includes('이슬'))!.click()
    await nextTick()
    expect(document.body.querySelector('[aria-label="받을 재화 선택"]')).toBeNull()
    expect(document.body.querySelector('[data-testid="exchange-rate-info"]')!.textContent).toContain('환율 10:1')
  })

  it('서버에 COIN 도착 토큰 pair가 없으면 환전을 실행하지 않는다', async () => {
    getExchangeRates.mockResolvedValue({ data: { rates: [] } })
    await mountSuspended(ExchangeDialog, { props: { modelValue: true } })
    await flush()
    const fromGroup = document.body.querySelector('[aria-label="환전할 재화 선택"]')!
    Array.from(fromGroup.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.includes('코인'))!.click()
    await nextTick()
    const submit = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.includes('이슬 받기'))!
    expect(submit.disabled).toBe(true)
    submit.click()
    expect(exchange).not.toHaveBeenCalled()
  })
})
