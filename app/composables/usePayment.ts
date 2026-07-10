import { Capacitor } from '@capacitor/core'
import { useUserStore } from '~/stores/user'

/**
 * usePayment — IAP(인앱결제) 연동 (Android Play Billing + iOS App Store). (WP-1 2026-06-04 · iOS 2026-06-23)
 *
 * 흐름:
 *   1. client 가 cordova-plugin-purchase(v13) 로 스토어 구매 → `approved` 트랜잭션 획득
 *   2. 트랜잭션 토큰을 backend `POST /api/v1/billing/iap/verify`(@Hidden) 로 전달
 *      - Android: purchaseToken = Play purchaseToken
 *      - iOS: purchaseToken = StoreKit transactionId, receipt = base64 app receipt
 *   3. 서버가 (test-mode) 즉시 또는 (live) platform 별 verifier 로 검증 후 entitlement 부여
 *   4. 검증/지급 성공 시에만 `transaction.finish()` (실패 시 미완료 유지 → 재처리)
 *
 * - 플러그인은 mobile/ 네이티브 셸에 cap sync 되어 WebView 전역 `window.CdvPurchase` 로 노출.
 *   frontend 웹 빌드는 별도 npm 의존성 불요(런타임 global 접근) — remote WebView 구조와 정합.
 * - 웹/미지원 플랫폼: "앱에서만 구매" 안내 후 false.
 *
 * ⚠️ 실 결제 흐름은 실기기 + 스토어 상품 등록 후 검증 필요(.env-ready). cordova-plugin-purchase 의
 *   정확한 트랜잭션/영수증 필드(특히 iOS appStoreReceipt 위치)는 실기기 검증 항목 — 다중 fallback 추출.
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

/** 현재 기기의 스토어 플랫폼 — iOS=App Store / 그 외=Google Play. */
function resolvePlatform(Cdv: AnyCdv): { cdvPlatform: AnyCdv, apiPlatform: 'ANDROID' | 'IOS' } {
  const isIos = Capacitor.getPlatform() === 'ios'
  return isIos
    ? { cdvPlatform: Cdv.Platform.APP_STORE, apiPlatform: 'IOS' }
    : { cdvPlatform: Cdv.Platform.GOOGLE_PLAY, apiPlatform: 'ANDROID' }
}

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

async function ensureRegistered(Cdv: AnyCdv, store: AnyCdv, productId: string, cdvPlatform: AnyCdv) {
  bindApprovedListener(store)
  if (registered.has(productId)) return
  store.register([
    {
      id: productId,
      // free_placement_unlock 은 1회 영구 → NON_CONSUMABLE.
      type: Cdv.ProductType.NON_CONSUMABLE,
      platform: cdvPlatform,
    },
  ])
  await store.initialize([cdvPlatform])
  registered.add(productId)
}

/** Google Play purchase token 추출 — v13 버전별 위치 상이(다중 fallback, 실기기 검증). */
function extractPlayPurchaseToken(tx: AnyCdv): string {
  return (
    tx?.nativePurchase?.purchaseToken
    ?? tx?.purchaseId
    ?? tx?.transactionId
    ?? ''
  )
}

/** iOS StoreKit transactionId 추출(txRef·멱등 키로 사용 — 짧고 안정). */
function extractAppleTransactionId(tx: AnyCdv): string {
  return (
    tx?.transactionId
    ?? tx?.nativePurchase?.transactionId
    ?? tx?.purchaseId
    ?? ''
  )
}

/** iOS base64 app receipt 추출 — 서버 verifyReceipt 검증용(다중 fallback, 실기기 검증). */
function extractAppStoreReceipt(tx: AnyCdv): string {
  // transactionReceipt(legacy/deprecated)는 base64 app receipt 보장이 없어 제외 — 잘못된 데이터 제출 시
  // 서버 status≠0 으로 "과금 후 미지급" 유발(리뷰 IAP-010). 빈값이면 호출부가 명시 실패 처리.
  return (
    tx?.nativePurchase?.appStoreReceipt
    ?? tx?.parentReceipt?.nativeData?.appStoreReceipt
    ?? ''
  )
}

export function usePayment() {
  const loading = ref<boolean>(false)
  const lastError = ref<string | null>(null)
  // setup 컨텍스트 밖(직접 단위테스트 등)에서도 동작하도록 useI18n() 대신 nuxtApp.$i18n 사용.
  const { $i18n } = useNuxtApp()
  const t = (key: string): string => $i18n.t(key)

  /**
   * 단일 상품 IAP 구매. entitlement 부여 성공 시 true.
   * @param productId 스토어 상품 ID. 백엔드 ProductEntitlementMapper 와 정합 필수
   *   (예: `free_placement_unlock`). Android/iOS 동일 ID 사용.
   */
  async function startPurchase(productId: string): Promise<boolean> {
    if (!import.meta.client) return false
    const { isNative } = useNative()
    if (!isNative) {
      useToast().info(t('payment.appOnly'))
      return false
    }
    const Cdv = (window as unknown as { CdvPurchase?: AnyCdv }).CdvPurchase
    if (!Cdv?.store) {
      useToast().error(t('payment.moduleLoadFail'))
      return false
    }

    loading.value = true
    lastError.value = null
    try {
      const store = Cdv.store
      const { cdvPlatform, apiPlatform } = resolvePlatform(Cdv)
      await ensureRegistered(Cdv, store, productId, cdvPlatform)

      // Codex 보안 HIGH: 구매를 로그인 userId 에 바인딩 → (Android) 서버 verifier 가 Google 의
      // obfuscatedExternalAccountId(=userId) 와 cross-check. (iOS) verifyReceipt 는 appAccountToken 을
      // 안정적으로 노출 못해 user 바인딩이 제한적 — 서버는 transactionId 멱등으로 중복 grant 차단.
      const userStore = useUserStore()
      if (!userStore.me) await userStore.fetchMe()
      const userId = userStore.me?.userId
      if (!userId) {
        lastError.value = 'no_user_id'
        return false
      }

      const transaction = await orderAndAwaitApproval(Cdv, store, productId, userId, cdvPlatform)

      // 스토어 결제 승인(approved) 이후의 실패는 "과금됐는데 미지급" 이므로 사용자에게 명시 안내(리뷰 silent-M2).
      const paidButFailed = t('payment.paidButFailed')

      // platform 별 토큰/영수증 추출.
      let purchaseToken: string
      let receipt: string | undefined
      if (apiPlatform === 'IOS') {
        purchaseToken = extractAppleTransactionId(transaction)
        receipt = extractAppStoreReceipt(transaction)
        if (!purchaseToken || !receipt) {
          lastError.value = !purchaseToken ? 'no_transaction_id' : 'no_app_store_receipt'
          useToast().error(paidButFailed)
          return false
        }
      } else {
        purchaseToken = extractPlayPurchaseToken(transaction)
        if (!purchaseToken) {
          lastError.value = 'no_purchase_token'
          useToast().error(paidButFailed)
          return false
        }
      }

      // 서버 검증 + entitlement 부여 (off-spec @Hidden endpoint → useInternalApi).
      const res = await useInternalApi().request<IapVerifyResponse>(
        '/api/v1/billing/iap/verify',
        { method: 'POST', body: { productId, purchaseToken, platform: apiPlatform, receipt } },
      )

      if (res?.granted) {
        await safeFinish(transaction)
        // 결제 권리/재화 지급 반영 — TTL 캐시를 무시한다.
        await useUserStore().fetchMe(true)
        return true
      }
      // 검증 실패 — 트랜잭션 미완료 유지(재시도 가능). 보상/권리 미지급.
      lastError.value = 'verify_not_granted'
      useToast().error(paidButFailed)
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
function orderAndAwaitApproval(Cdv: AnyCdv, store: AnyCdv, productId: string, userId: string, cdvPlatform: AnyCdv): Promise<AnyCdv> {
  return new Promise<AnyCdv>((resolve, reject) => {
    // 같은 productId 중복 주문 가드 — 더블탭/retry 시 선행 resolver 가 덮여 orphan 되는 것 방지(리뷰 IAP-007).
    if (pendingResolvers.has(productId)) {
      reject(new Error('purchase_already_in_progress'))
      return
    }
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

    const product = store.get(productId, cdvPlatform)
    const offer = product?.getOffer?.()
    if (!offer) {
      settled = true
      clearTimeout(timer)
      pendingResolvers.delete(productId)
      reject(new Error('offer_not_found'))
      return
    }
    // applicationUsername → (Android) Google Play obfuscatedAccountId, (iOS) StoreKit appAccountToken(best-effort).
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
