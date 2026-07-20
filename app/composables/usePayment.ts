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
 *   4. 검증/지급 성공(granted) 또는 멱등 재검증(alreadyOwned) 시에만 `transaction.finish()`
 *      (실패 시 미완료 유지 → 스토어가 재노출 → 콜드스타트 복구 경로가 재처리)
 *
 * 콜드스타트 복구 (audit B1-2): `approved` 후 검증 전에 앱이 종료되면 이전에는 트랜잭션이
 * 영구 드롭됐다. 이제 로그인 시 [recoverPendingPurchases] 가 카탈로그를 등록/초기화하면
 * 플러그인이 미완료 approved 를 재방출하고, 대기 resolver 가 없는 approved 는 백그라운드
 * 검증+finish 경로로 회수된다.
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
  // 멱등 재검증(이미 소유) — granted 와 동일하게 성공 처리 + finish() 대상 (audit B1-1).
  alreadyOwned?: boolean
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// 네이티브 런타임 global(타입 패키지 미설치) — any 접근. 실기기 검증 대상.
type AnyCdv = any

/**
 * 구매 가능 상품 카탈로그 — 백엔드 `ProductEntitlementMapper` 와 동기 필수.
 * 콜드스타트 복구 시 이 목록을 등록해야 플러그인이 미완료 트랜잭션을 재방출한다.
 */
const PRODUCT_CATALOG = ['free_placement_unlock'] as const

// 단일 approved 리스너 라우팅 + 스토어 초기화 1회 가드.
const pendingResolvers = new Map<string, (tx: AnyCdv) => void>()
let approvedListenerBound = false
// 복구 경로 중복 처리 가드 (같은 트랜잭션 동시 재방출 대비).
const recoveringTx = new Set<string>()
// 카탈로그 등록 + initialize 를 단일 promise 로 캐시 — 콜드스타트 복구와 수동 구매가 동시에
// 진입해도 같은 초기화 완료를 기다린다. 이전의 productId 별 Set 가드는 두 경로가 각자
// "미등록"으로 판단해 plugin 의 2번째 initialize() 가 즉시 반환(내부 1회 플래그)되고, 상품이
// 로드되기 전의 구매가 offer_not_found 로 실패하는 race 가 있었다 (Codex R1).
let storeReadyPromise: Promise<void> | null = null
// plugin initialize() 는 one-shot(내부 플래그 선설정) — 재시도 경로는 update() 로 우회 (Codex R2).
let storeInitializeCalled = false

/** 현재 기기의 스토어 플랫폼 — iOS=App Store / 그 외=Google Play. */
function resolvePlatform(Cdv: AnyCdv): { cdvPlatform: AnyCdv, apiPlatform: 'ANDROID' | 'IOS' } {
  const isIos = Capacitor.getPlatform() === 'ios'
  return isIos
    ? { cdvPlatform: Cdv.Platform.APP_STORE, apiPlatform: 'IOS' }
    : { cdvPlatform: Cdv.Platform.GOOGLE_PLAY, apiPlatform: 'ANDROID' }
}

function bindApprovedListener(store: AnyCdv, nuxtApp: ReturnType<typeof useNuxtApp>) {
  if (approvedListenerBound) return
  approvedListenerBound = true
  store.when().approved((tx: AnyCdv) => {
    // 트랜잭션의 상품 ID 추출(v13: products[].id) → 대기 중 resolver 라우팅.
    const pid: string | undefined = tx?.products?.[0]?.id ?? tx?.productId
    if (!pid) return
    const resolver = pendingResolvers.get(pid)
    if (resolver) {
      pendingResolvers.delete(pid)
      resolver(tx)
      return
    }
    // 대기 resolver 없는 approved = 이전 세션에서 검증 전에 끊긴 미완료 구매 (audit B1-2).
    // 플러그인 콜백은 Nuxt 컨텍스트 밖 — runWithContext 로 composable 사용 가능하게 감싼다.
    void nuxtApp.runWithContext(() => recoverApprovedTransaction(pid, tx))
  })
}

/** 콜드스타트/재방출 approved 트랜잭션 백그라운드 회수 — 검증 + finish + 잔액 반영 + 안내. */
async function recoverApprovedTransaction(productId: string, tx: AnyCdv) {
  const txKey = String(tx?.transactionId ?? tx?.purchaseId ?? productId)
  if (recoveringTx.has(txKey)) return
  recoveringTx.add(txKey)
  try {
    const Cdv = (window as unknown as { CdvPurchase?: AnyCdv }).CdvPurchase
    if (!Cdv) return
    const { apiPlatform } = resolvePlatform(Cdv)
    const outcome = await verifyAndSettle(productId, tx, apiPlatform)
    const { $i18n } = useNuxtApp()
    const toast = useToast()
    if (outcome === 'granted') {
      toast.success($i18n.t('payment.recovered'))
    }
    else if (outcome === 'failed') {
      // 과금은 됐는데 지급이 안 된 상태 — 침묵 금지 (audit B1-3 동축).
      toast.error($i18n.t('payment.paidButFailed'))
    }
    // already_owned: 이미 반영된 권리의 뒤늦은 finish — 사용자 안내 불요(무소음 정리).
    // no_token: 토큰 추출 실패 — 다음 재방출에서 재시도 (스토어가 미완료를 계속 노출).
  }
  catch {
    // 복구는 best-effort — 실패 시 다음 initialize 재방출에서 재시도된다.
  }
  finally {
    recoveringTx.delete(txKey)
  }
}

/**
 * 검증 + 정산 공통 경로 (구매 직후 + 콜드스타트 복구 공용).
 * granted/already_owned 에서만 finish() — 실패는 미완료 유지(재처리 가능).
 */
async function verifyAndSettle(
  productId: string,
  transaction: AnyCdv,
  apiPlatform: 'ANDROID' | 'IOS',
): Promise<'granted' | 'already_owned' | 'failed' | 'no_token'> {
  let purchaseToken: string
  let receipt: string | undefined
  if (apiPlatform === 'IOS') {
    purchaseToken = extractAppleTransactionId(transaction)
    receipt = extractAppStoreReceipt(transaction)
    if (!purchaseToken || !receipt) return 'no_token'
  }
  else {
    purchaseToken = extractPlayPurchaseToken(transaction)
    if (!purchaseToken) return 'no_token'
  }

  // 서버 검증 + entitlement 부여 (off-spec @Hidden endpoint → useInternalApi).
  const res = await useInternalApi().request<IapVerifyResponse>(
    '/api/v1/billing/iap/verify',
    { method: 'POST', body: { productId, purchaseToken, platform: apiPlatform, receipt } },
  )

  if (res?.granted || res?.alreadyOwned) {
    // finish 실패는 삼켜도 안전해졌다: 스토어가 트랜잭션을 재노출하면 복구 경로가 재검증
    // → 서버 alreadyOwned → 다시 finish 시도 (자기치유 루프, audit B1-8).
    await safeFinish(transaction)
    // 결제 권리/재화 지급 반영 — TTL 캐시를 무시한다.
    await useUserStore().fetchMe(true)
    return res.granted ? 'granted' : 'already_owned'
  }
  return 'failed'
}

/**
 * 스토어 준비(카탈로그 전체 등록 + initialize) — 어떤 경로(구매/복구)든 같은 완료를 기다린다.
 * 신규 상품은 PRODUCT_CATALOG 에 추가해야 여기서 등록된다 (미등록 상품 구매는 offer_not_found).
 */
function ensureStoreReady(Cdv: AnyCdv, nuxtApp: ReturnType<typeof useNuxtApp>): Promise<void> {
  bindApprovedListener(Cdv.store, nuxtApp)
  if (!storeReadyPromise) {
    storeReadyPromise = (async () => {
      const { cdvPlatform } = resolvePlatform(Cdv)
      Cdv.store.register(
        PRODUCT_CATALOG.map(id => ({
          id,
          // 현 카탈로그는 전부 1회 영구 → NON_CONSUMABLE.
          type: Cdv.ProductType.NON_CONSUMABLE,
          platform: cdvPlatform,
        })),
      )
      if (!storeInitializeCalled) {
        storeInitializeCalled = true
        // v13 initialize() 는 실패를 reject 가 아니라 resolve(IError[]) 로 반환한다 — 미검사 시
        // 실패가 "준비 완료"로 캐시되어 이후 구매가 전부 offer_not_found 로 위장된다 (Codex R2).
        const initErrors = await Cdv.store.initialize([cdvPlatform])
        if (Array.isArray(initErrors) && initErrors.length > 0) {
          const detail = initErrors.map((e: AnyCdv) => e?.message ?? e?.code ?? 'unknown').join('; ')
          throw new Error(`store_initialize_failed: ${detail}`)
        }
      }
      else {
        // initialize 는 plugin 내부 one-shot 이라 재호출이 no-op — 실패 후 재시도는
        // update() 로 상품/영수증 상태를 갱신해 복구를 시도한다.
        await Cdv.store.update()
        // update() 는 초기화 직후 10분 throttle no-op 이라(플러그인 www/store.js) 성공 반환을
        // 신뢰하면 "가짜 ready" 가 다시 영구 캐시된다 (Codex R3) — 준비 판정은 반환값이 아니라
        // **실제 offer 로드 여부**로 한다. 미로드면 throw → catch 가 캐시를 해제해 다음
        // 진입(throttle 창 이후)이 다시 복구를 시도한다.
        const notLoaded = PRODUCT_CATALOG.filter((id) => !Cdv.store.get(id, cdvPlatform)?.getOffer?.())
        if (notLoaded.length > 0) {
          throw new Error(`store_not_recovered: ${notLoaded.join(',')}`)
        }
      }
    })().catch((e: unknown) => {
      // 실패는 캐시하지 않는다 — 다음 진입(구매/로그인 전이)에서 위 update() 경로로 재시도.
      storeReadyPromise = null
      throw e
    })
  }
  return storeReadyPromise
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

/**
 * 콜드스타트 미완료 구매 복구 (audit B1-2). 로그인 이후(bearer 필요) 1회 호출 —
 * 카탈로그 등록 + store.initialize 로 플러그인이 미완료 approved 를 재방출하게 한다.
 * 재방출된 approved 는 bindApprovedListener 의 무-resolver 분기가 회수한다.
 */
export async function recoverPendingPurchases(): Promise<void> {
  if (!import.meta.client || !Capacitor.isNativePlatform()) return
  const Cdv = (window as unknown as { CdvPurchase?: AnyCdv }).CdvPurchase
  if (!Cdv?.store) return
  const nuxtApp = useNuxtApp()
  try {
    await ensureStoreReady(Cdv, nuxtApp)
  }
  catch {
    // 스토어 초기화 실패 — 다음 로그인/구매 시도에서 재시도. 부팅 경로를 막지 않는다.
  }
}

export function usePayment() {
  const loading = ref<boolean>(false)
  const lastError = ref<string | null>(null)
  // setup 컨텍스트 밖(직접 단위테스트 등)에서도 동작하도록 useI18n() 대신 nuxtApp.$i18n 사용.
  const nuxtApp = useNuxtApp()
  const { $i18n } = nuxtApp
  const t = (key: string): string => $i18n.t(key)

  /**
   * 단일 상품 IAP 구매. entitlement 부여 성공(신규 grant 또는 이미 소유) 시 true.
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
    // 스토어 승인(과금) 도달 여부 — 이후의 throw 는 "과금됐는데 미지급" 이므로 침묵 금지 (audit B1-3).
    let approvedReached = false
    try {
      const store = Cdv.store
      const { cdvPlatform, apiPlatform } = resolvePlatform(Cdv)
      await ensureStoreReady(Cdv, nuxtApp)

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
      approvedReached = true

      // 스토어 결제 승인(approved) 이후의 실패는 "과금됐는데 미지급" 이므로 사용자에게 명시 안내(리뷰 silent-M2).
      const outcome = await verifyAndSettle(productId, transaction, apiPlatform)
      if (outcome === 'granted' || outcome === 'already_owned') return true

      lastError.value = outcome === 'no_token'
        ? (apiPlatform === 'IOS' ? 'no_transaction_id_or_receipt' : 'no_purchase_token')
        : 'verify_not_granted'
      useToast().error(t('payment.paidButFailed'))
      return false
    }
    catch (e) {
      lastError.value = e instanceof Error ? e.message : String(e)
      // verify HTTP throw(네트워크/5xx) 가 과금 이후에 나면 반드시 안내 — 이전에는 무토스트로
      // "결제됐는데 아무 일도 없음" 상태였다 (audit B1-3). 과금 전 실패(취소/타임아웃)는 호출부 안내.
      if (approvedReached) useToast().error(t('payment.paidButFailed'))
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
    // finish 실패 = 스토어가 트랜잭션 재노출 → 복구 경로가 재검증(alreadyOwned) 후 재-finish.
    // 자기치유 루프가 있으므로 삼켜도 유실되지 않는다 (audit B1-8).
  }
}
