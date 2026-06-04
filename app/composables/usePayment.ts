import { useUserStore } from '~/stores/user'

/**
 * usePayment — Play Billing IAP(인앱결제) 연동. (fullstack-ultraplan WP-1, 2026-06-04)
 *
 * 흐름:
 *   1. client 가 cordova-plugin-purchase(v13) 로 Play Billing 구매 → `approved` 트랜잭션 획득
 *   2. 트랜잭션의 purchaseToken 을 backend `POST /api/v1/billing/iap/verify`(@Hidden) 로 전달
 *   3. 서버가 (test-mode) 즉시 또는 (live) Google Play Developer API 검증 후 entitlement 부여
 *   4. 검증/지급 성공 시에만 `transaction.finish()` (실패 시 미완료 유지 → 재처리)
 *
 * - 플러그인은 mobile/ 네이티브 셸에 포함(cap sync)되어 WebView 전역 `window.CdvPurchase` 로 노출.
 *   frontend 웹 빌드는 별도 npm 의존성 불요(런타임 global 접근) — remote WebView 구조와 정합.
 * - 웹/미지원 플랫폼: "앱에서만 구매" 안내 후 false.
 *
 * ⚠️ 실 결제 흐름은 실기기 + Play Console 상품 등록 후 검증 필요(.env-ready). debug 는 정적 SKU
 *   `android.test.purchased` 또는 license tester + 백엔드 BILLING_TEST_MODE=true 로 테스트.
 *   (cordova-plugin-purchase 의 정확한 트랜잭션 필드/리스너 수명은 실기기 검증 항목.)
 */

interface IapVerifyResponse {
  granted: boolean
  entitlementKey: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// 네이티브 런타임 global(타입 패키지 미설치) — any 접근. 실기기 검증 대상.
type AnyCdv = any

// 등록 1회 가드(productId 별) + 단일 approved 리스너 라우팅.
const registered = new Set<string>()
const pendingResolvers = new Map<string, (tx: AnyCdv) => void>()
let approvedListenerBound = false

function bindApprovedListener(store: AnyCdv) {
  if (approvedListenerBound) return
  approvedListenerBound = true
  store.when().approved((tx: AnyCdv) => {
    // 트랜잭션의 상품 ID 추출(v13: products[].id) → 대기 중 resolver 라우팅.
    const pid: string | undefined = tx?.products?.[0]?.id ?? tx?.productId
    const resolver = pid ? pendingResolvers.get(pid) : undefined
    if (resolver && pid) {
      pendingResolvers.delete(pid)
      resolver(tx)
    }
  })
}

async function ensureRegistered(Cdv: AnyCdv, store: AnyCdv, productId: string) {
  bindApprovedListener(store)
  if (registered.has(productId)) return
  store.register([
    {
      id: productId,
      // free_placement_unlock 은 1회 영구 → NON_CONSUMABLE.
      type: Cdv.ProductType.NON_CONSUMABLE,
      platform: Cdv.Platform.GOOGLE_PLAY,
    },
  ])
  await store.initialize([Cdv.Platform.GOOGLE_PLAY])
  registered.add(productId)
}

function extractPurchaseToken(tx: AnyCdv): string {
  // Google Play purchase token 위치는 v13 버전별 상이 — 다중 fallback(실기기 검증).
  return (
    tx?.nativePurchase?.purchaseToken
    ?? tx?.purchaseId
    ?? tx?.transactionId
    ?? ''
  )
}

export function usePayment() {
  const loading = ref<boolean>(false)
  const lastError = ref<string | null>(null)

  /**
   * 단일 상품 IAP 구매. entitlement 부여 성공 시 true.
   * @param productId Play Console 상품 ID. 백엔드 ProductEntitlementMapper 와 정합 필수
   *   (예: `free_placement_unlock`).
   */
  async function startPurchase(productId: string): Promise<boolean> {
    if (!import.meta.client) return false
    const { isNative } = useNative()
    if (!isNative) {
      useToast().info('구매는 앱에서만 가능합니다')
      return false
    }
    const Cdv = (window as unknown as { CdvPurchase?: AnyCdv }).CdvPurchase
    if (!Cdv?.store) {
      useToast().error('결제 모듈을 불러오지 못했습니다')
      return false
    }

    loading.value = true
    lastError.value = null
    try {
      const store = Cdv.store
      await ensureRegistered(Cdv, store, productId)

      // Codex 보안 HIGH: 구매를 로그인 userId 에 바인딩 → 서버 verifier 가 Google 의
      // obfuscatedExternalAccountId(=userId) 와 cross-check(다른 user token replay 차단).
      const userStore = useUserStore()
      if (!userStore.me) await userStore.fetchMe()
      const userId = userStore.me?.userId
      if (!userId) {
        lastError.value = 'no_user_id'
        return false
      }

      const transaction = await orderAndAwaitApproval(Cdv, store, productId, userId)
      const purchaseToken = extractPurchaseToken(transaction)
      if (!purchaseToken) {
        lastError.value = 'no_purchase_token'
        return false
      }

      // 서버 검증 + entitlement 부여 (off-spec @Hidden endpoint → useInternalApi).
      const res = await useInternalApi().request<IapVerifyResponse>(
        '/api/v1/billing/iap/verify',
        { method: 'POST', body: { productId, purchaseToken, platform: 'ANDROID' } },
      )

      if (res?.granted) {
        await safeFinish(transaction)
        await useUserStore().fetchMe()
        return true
      }
      // 검증 실패 — 트랜잭션 미완료 유지(재시도 가능). 보상/권리 미지급.
      return false
    }
    catch (e) {
      lastError.value = e instanceof Error ? e.message : String(e)
      return false
    }
    finally {
      loading.value = false
    }
  }

  return {
    loading: readonly(loading),
    lastError: readonly(lastError),
    startPurchase,
  }
}

/** 주문 트리거 후 해당 productId 의 approved 트랜잭션 1건을 대기(45s timeout). */
function orderAndAwaitApproval(Cdv: AnyCdv, store: AnyCdv, productId: string, userId: string): Promise<AnyCdv> {
  return new Promise<AnyCdv>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        pendingResolvers.delete(productId)
        reject(new Error('purchase_timeout'))
      }
    }, 45_000)

    pendingResolvers.set(productId, (tx: AnyCdv) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(tx)
    })

    const product = store.get(productId, Cdv.Platform.GOOGLE_PLAY)
    const offer = product?.getOffer?.()
    if (!offer) {
      settled = true
      clearTimeout(timer)
      pendingResolvers.delete(productId)
      reject(new Error('offer_not_found'))
      return
    }
    // applicationUsername → Google Play obfuscatedAccountId (서버 user-binding 검증용).
    Promise.resolve(offer.order({ applicationUsername: userId })).catch((e: unknown) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        pendingResolvers.delete(productId)
        reject(e instanceof Error ? e : new Error('order_failed'))
      }
    })
  })
}

async function safeFinish(transaction: AnyCdv) {
  try {
    await transaction.finish()
  }
  catch {
    // finish 실패는 다음 store 동기화에서 재처리 — 무시.
  }
}
