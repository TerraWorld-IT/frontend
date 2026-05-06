/**
 * usePayment — 결제 상태 머신 스켈레톤
 *
 * 실제 PG SDK 연동은 Phase 3 이후. 현재는 상태 머신 + 인터페이스만 정의.
 * SIMULATE=true 플래그로 모든 결제를 mock resolve 한다.
 */

export type PaymentStatus = 'idle' | 'loading' | 'processing' | 'success' | 'failed'

export interface PaymentRequest {
  /** 고유 주문 ID (멱등성 키로 활용) */
  orderId: string
  /** 결제 금액 (원) */
  amount: number
  /** 결제 항목명 */
  name: string
  /** 구매자 이메일 (optional) */
  buyerEmail?: string
}

export interface PaymentResult {
  orderId: string
  /** PG 거래 고유 ID (시뮬레이션: 'sim_' + orderId) */
  pgTxId: string
  amount: number
  paidAt: string
}

export interface RefundRequest {
  orderId: string
  /** 부분 환불 금액 (없으면 전액 환불) */
  amount?: number
  reason: string
}

/** 시뮬레이션 모드 — PG SDK 없이 즉시 성공으로 처리 */
const SIMULATE = true

export function usePayment() {
  const status = ref<PaymentStatus>('idle')
  const lastResult = ref<PaymentResult | null>(null)
  const lastError = ref<string | null>(null)

  /**
   * 결제 초기화 및 실행
   * SIMULATE=true 면 1초 후 success 반환.
   * 실제 PG 연동 시 이 함수에서 SDK load + checkout 호출.
   */
  async function initPayment(req: PaymentRequest): Promise<PaymentResult> {
    status.value = 'loading'
    lastError.value = null

    try {
      if (SIMULATE) {
        await _sleep(800)
        status.value = 'processing'
        await _sleep(400)

        const result: PaymentResult = {
          orderId: req.orderId,
          pgTxId: `sim_${req.orderId}`,
          amount: req.amount,
          paidAt: new Date().toISOString(),
        }
        lastResult.value = result
        status.value = 'success'
        return result
      }

      // TODO(Phase-3): 실제 PG SDK 로딩 및 checkout 호출
      // const pg = await loadPgSdk()
      // const result = await pg.requestPayment({ ... })
      // ...
      throw new Error('PG SDK not integrated yet')
    }
    catch (err) {
      status.value = 'failed'
      lastError.value = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  /**
   * 결제 승인 (3DS 또는 서버 검증 단계)
   * SIMULATE=true 면 즉시 성공 반환.
   */
  async function confirmPayment(_orderId: string): Promise<void> {
    if (status.value !== 'processing' && status.value !== 'success') {
      throw new Error(`Invalid state for confirmation: ${status.value}`)
    }

    if (SIMULATE) {
      await _sleep(200)
      status.value = 'success'
      return
    }

    // TODO(Phase-3): 서버 검증 API 호출
    // await useOpenApi().confirmPayment({ body: { orderId: _orderId } })
  }

  /**
   * 환불 요청 스켈레톤
   * SIMULATE=true 면 즉시 성공 처리 (실제 환불 실행 없음).
   */
  async function refund(_req: RefundRequest): Promise<void> {
    status.value = 'loading'
    lastError.value = null

    try {
      if (SIMULATE) {
        await _sleep(600)
        status.value = 'idle'
        lastResult.value = null
        return
      }

      // TODO(Phase-3): 환불 API 호출
      // await useOpenApi().refundPayment({ body: { orderId: _req.orderId, amount: _req.amount, reason: _req.reason } })
      throw new Error('Refund API not integrated yet')
    }
    catch (err) {
      status.value = 'failed'
      lastError.value = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  function reset() {
    status.value = 'idle'
    lastResult.value = null
    lastError.value = null
  }

  /**
   * 단일 상품 구매 — IAP/Play Billing 통합 전 placeholder.
   * Tier 3 scaffold: 현재는 항상 false 반환 (결제 모듈 미통합).
   * Phase 4 통합 시 productId → Capacitor InAppPurchase plugin → 서버 검증 흐름.
   */
  const loading = ref(false)
  async function startPurchase(productId: string): Promise<boolean> {
    loading.value = true
    try {
      if (SIMULATE) {
        await _sleep(400)
        // Phase 4 까지는 항상 false (entitlement 변경 없음). 사용자에게 안내 메시지 유도.
        return false
      }
      // TODO(Phase-4): native IAP / Play Billing
      // const result = await capacitorPurchase.purchase({ productId })
      // await sdk.confirmPurchase({ ... })
      void productId
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    status: readonly(status),
    lastResult: readonly(lastResult),
    lastError: readonly(lastError),
    initPayment,
    confirmPayment,
    refund,
    reset,
    loading: readonly(loading),
    startPurchase,
  }
}

function _sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
