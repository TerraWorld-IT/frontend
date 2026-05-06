// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'

/**
 * usePayment 는 SIMULATE=true 모드 (Phase 3 이전) 전제로 동작.
 * Phase 4 IAP 통합 후에는 실제 PG SDK 호출 분기를 별도 테스트로 추가.
 */
describe('usePayment', () => {
  it('exports usePayment factory', async () => {
    const mod = await import('~/composables/usePayment')
    expect(typeof mod.usePayment).toBe('function')
  })

  it('initial status is idle', async () => {
    const { usePayment } = await import('~/composables/usePayment')
    const p = usePayment()
    expect(p.status.value).toBe('idle')
    expect(p.lastResult.value).toBeNull()
    expect(p.lastError.value).toBeNull()
  })

  it('initPayment (SIMULATE) eventually resolves to success with sim_<orderId>', async () => {
    const { usePayment } = await import('~/composables/usePayment')
    const p = usePayment()

    const result = await p.initPayment({
      orderId: 'order-1',
      amount: 1900,
      name: '자유배치',
    })

    expect(result.orderId).toBe('order-1')
    expect(result.pgTxId).toBe('sim_order-1')
    expect(result.amount).toBe(1900)
    expect(p.status.value).toBe('success')
    expect(p.lastResult.value?.orderId).toBe('order-1')
  })

  it('startPurchase always returns false in SIMULATE (Phase 4 placeholder)', async () => {
    const { usePayment } = await import('~/composables/usePayment')
    const p = usePayment()

    const result = await p.startPurchase('free-placement')

    expect(result).toBe(false)
    expect(p.loading.value).toBe(false)
  })

  it('reset() returns to idle and clears state', async () => {
    const { usePayment } = await import('~/composables/usePayment')
    const p = usePayment()
    await p.initPayment({ orderId: 'order-2', amount: 500, name: 'Item' })
    expect(p.status.value).toBe('success')

    p.reset()
    expect(p.status.value).toBe('idle')
    expect(p.lastResult.value).toBeNull()
    expect(p.lastError.value).toBeNull()
  })

  it('confirmPayment in idle state throws', async () => {
    const { usePayment } = await import('~/composables/usePayment')
    const p = usePayment()
    await expect(p.confirmPayment('order-x')).rejects.toThrow(/Invalid state/i)
  })
})
