// @vitest-environment nuxt
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mocks = vi.hoisted(() => ({
  native: false,
  fetchMe: vi.fn(),
  request: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android', isNativePlatform: () => mocks.native } }))
vi.mock('~/stores/user', () => ({ useUserStore: () => ({ me: { userId: 'user-1' }, fetchMe: mocks.fetchMe }) }))
mockNuxtImport('useNative', () => () => ({ isNative: mocks.native }))
mockNuxtImport('useInternalApi', () => () => ({ request: mocks.request }))
mockNuxtImport('useToast', () => () => mocks.toast)

afterEach(() => {
  mocks.native = false
  delete (window as unknown as { CdvPurchase?: unknown }).CdvPurchase
  vi.clearAllMocks()
})

/**
 * usePayment 는 Phase 4 에서 cordova-plugin-purchase(window.CdvPurchase) 기반 IAP 로 재배선됨.
 * 단위 테스트 환경(non-native + CdvPurchase 부재)에서는 startPurchase 가 안전하게 false 를 반환한다.
 * 실제 구매 플로우(스토어 order → 백엔드 verify → entitlement)는 실기기 통합 테스트(G3) 영역.
 */
describe('usePayment', () => {
  it('exports usePayment factory', async () => {
    const mod = await import('~/composables/usePayment')
    expect(typeof mod.usePayment).toBe('function')
  })

  it('initial state — loading false, lastError null', async () => {
    const { usePayment } = await import('~/composables/usePayment')
    const p = usePayment()
    expect(p.loading.value).toBe(false)
    expect(p.lastError.value).toBeNull()
  })

  it('startPurchase returns false in non-native/test env (loading stays false)', async () => {
    const { usePayment } = await import('~/composables/usePayment')
    const p = usePayment()
    const result = await p.startPurchase('free_placement_unlock')
    expect(result).toBe(false)
    expect(p.loading.value).toBe(false)
  })

  it('exposes only the IAP surface (legacy initPayment/confirmPayment/reset 제거됨)', async () => {
    const { usePayment } = await import('~/composables/usePayment')
    const p = usePayment()
    expect('startPurchase' in p).toBe(true)
    expect('initPayment' in p).toBe(false)
    expect('confirmPayment' in p).toBe(false)
    expect('reset' in p).toBe(false)
  })

  it('지급 후 잔액 조회가 실패해도 구매 성공과 복구 성공 토스트를 유지한다', async () => {
    mocks.native = true
    mocks.fetchMe.mockRejectedValue(new Error('balance unavailable'))
    mocks.request.mockResolvedValue({ granted: true, entitlementKey: 'free_placement_unlock' })
    let approved!: (tx: unknown) => void
    const tx = {
      transactionId: 'tx-1', products: [{ id: 'free_placement_unlock' }],
      nativePurchase: { purchaseToken: 'purchase-token' }, finish: vi.fn().mockResolvedValue(undefined),
    }
    const store = {
      when: () => ({ approved: (callback: typeof approved) => { approved = callback } }),
      register: vi.fn(), initialize: vi.fn().mockResolvedValue([]),
      get: () => ({ getOffer: () => ({ order: () => { approved(tx); return Promise.resolve() } }) }),
    }
    ;(window as unknown as { CdvPurchase: unknown }).CdvPurchase = {
      store, Platform: { GOOGLE_PLAY: 'android' }, ProductType: { NON_CONSUMABLE: 'non-consumable' },
    }
    const { usePayment } = await import('~/composables/usePayment')
    const payment = usePayment()
    await expect(payment.startPurchase('free_placement_unlock')).resolves.toBe(true)
    await flushPromises()
    expect(payment.lastError.value).toBeNull()
    expect(payment.loading.value).toBe(false)
    expect(tx.finish).toHaveBeenCalledOnce()
    expect(mocks.fetchMe).toHaveBeenCalledWith(true)
    expect(mocks.request).toHaveBeenCalledWith('/api/v1/billing/iap/verify', expect.objectContaining({ deadlineMs: 60_000 }))
    expect(mocks.toast.error).not.toHaveBeenCalled()

    // 구매 대기자가 없는 재방출도 동일한 지급/잔액 분리를 사용한다.
    approved({ ...tx, transactionId: 'tx-2' })
    await flushPromises()
    expect(mocks.toast.success).toHaveBeenCalledOnce()
    expect(mocks.toast.error).not.toHaveBeenCalled()
  })
})
