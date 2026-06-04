// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'

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
})
