import { Capacitor } from '@capacitor/core'
import type { AdRewardNonceResponse } from '@terraworld-it/openapi-frontend'
import { STORAGE_KEYS } from '~/utils/constants'
import { kstTodayKey } from '~/utils/habitState'
import { withTimeout } from '~/utils/withTimeout'

export const REWARD_AD_TIMEOUT_MS = 60_000
// 준비는 전체 60초 안에서 20초로 제한한다. 운영 실측 전 가정값이다.
export const REWARD_AD_PREPARE_TIMEOUT_MS = 20_000

/** 보류는 서버 만료시각 그대로 보존한다. 만료 안내와 제거는 진입점이 담당한다. */
export function readPendingAdClaim(purpose: AdRewardNonceResponse['purpose'], userId: string | undefined): (Pick<AdRewardNonceResponse, 'nonce' | 'purpose' | 'expiresAt'> & { speciesCode?: string }) | null {
  if (!import.meta.client || !userId) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AD_PENDING + purpose + '.' + userId)
    if (!raw) return null
    const value = JSON.parse(raw)
    if (!value || typeof value.nonce !== 'string' || !value.nonce
      || value.purpose !== purpose
      || typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.expiresAt))
      || (value.speciesCode !== undefined && typeof value.speciesCode !== 'string')
      || (value.purpose === 'GROWTH_REVIVE' && !value.speciesCode)) return null
    return { nonce: value.nonce, purpose: value.purpose, expiresAt: value.expiresAt, ...(value.speciesCode ? { speciesCode: value.speciesCode } : {}) }
  }
  catch {
    return null
  }
}

export function writePendingAdClaim(purpose: AdRewardNonceResponse['purpose'], userId: string | undefined, claim: NonNullable<ReturnType<typeof readPendingAdClaim>>): void {
  if (!import.meta.client || !userId || claim.purpose !== purpose) return
  try {
    localStorage.setItem(STORAGE_KEYS.AD_PENDING + purpose + '.' + userId, JSON.stringify({ nonce: claim.nonce, purpose: claim.purpose, expiresAt: claim.expiresAt, ...(claim.speciesCode ? { speciesCode: claim.speciesCode } : {}) }))
  }
  catch {
    // 저장소 사용 불가 시 현재 청구는 계속 진행한다.
  }
}

export function clearPendingAdClaim(purpose: AdRewardNonceResponse['purpose'], userId: string | undefined, expectedNonce?: string): void {
  if (!import.meta.client || !userId) return
  try {
    if (expectedNonce && readPendingAdClaim(purpose, userId)?.nonce !== expectedNonce) return
    localStorage.removeItem(STORAGE_KEYS.AD_PENDING + purpose + '.' + userId)
  }
  catch {
    // 저장소가 막혀 있어도 성공한 청구를 실패로 바꾸지 않는다.
  }
}

export function isAdLimitReachedToday(userId: string | undefined): boolean {
  if (!import.meta.client || !userId) return false
  try {
    return localStorage.getItem(STORAGE_KEYS.AD_LIMIT_DATE + userId) === kstTodayKey()
  }
  catch {
    return false
  }
}

export function markAdLimitReachedToday(userId: string | undefined): void {
  if (!import.meta.client || !userId) return
  try {
    localStorage.setItem(STORAGE_KEYS.AD_LIMIT_DATE + userId, kstTodayKey())
  }
  catch {
    // 저장할 수 없으면 다음 청구의 서버 한도 판정에 맡긴다.
  }
}

// H3 (code-review): iOS ATT 결과를 모듈 스코프에 보존한다. ATT 요청은 앱 시작 시
// (capacitor.client.ts) 의 useAdMob() 인스턴스에서, 광고 표시는 별도 useAdMob() 인스턴스에서
// 일어나므로 인스턴스 변수로는 공유 불가. 미인증/오류 시 fail-closed(개인화 광고 미요청).
let iosTrackingAuthorized = false

/** 서버 nonce를 광고 SSV에 전달하고 시청 완료 증거를 반환한다. */
export function useAdMob() {
  const { sdk, client } = useOpenApi()
  const config = useRuntimeConfig()
  const isNative = import.meta.client ? Capacitor.isNativePlatform() : false
  const isAndroid = import.meta.client ? Capacitor.getPlatform() === 'android' : false
  const isIos = import.meta.client ? Capacitor.getPlatform() === 'ios' : false

  let initialized = false
  let attRequested = false

  /**
   * P3-3 (iOS App Tracking Transparency): IDFA(광고 식별자) 접근 전 ATT 동의 prompt 를 요청한다.
   * Apple 정책상 추적 전 필수 — Info.plist NSUserTrackingUsageDescription 동반.
   * iOS 에서만 동작(1회), Android/web 은 no-op. 반환: ATT status 또는 null.
   */
  async function requestTrackingAuthorization(): Promise<string | null> {
    if (!import.meta.client || !isIos || attRequested) return null
    attRequested = true
    try {
      const { AdMob } = await import('@capacitor-community/admob')
      // requestTrackingAuthorization() 가 ATT prompt 를 띄움(핵심). 반환 타입은 플러그인 버전에 따라
      // void 또는 { status } — 런타임에서 status 가 있으면 반환, 없으면 null (as unknown 으로 양쪽 호환).
      const res = await AdMob.requestTrackingAuthorization()
      const status = (res as unknown as { status?: string } | undefined)?.status ?? null
      // H3: status 를 버리지 않고 보존 — authorized 일 때만 IDFA 기반 개인화. denied/restricted/
      // notDetermined/null(미상)은 fail-closed 로 비개인화 유지.
      iosTrackingAuthorized = status === 'authorized'
      return status
    }
    catch {
      // 오류 = prompt 미표시 가능성 포함 → fail-closed (개인화 안 함).
      iosTrackingAuthorized = false
      return null
    }
  }

  async function issueServerNonce(purpose: AdRewardNonceResponse['purpose']): Promise<AdRewardNonceResponse> {
    const { data, error } = await sdk.issueAdRewardNonce({ client, query: { purpose } })
    if (error) throw new Error(errMsg(error, '광고 보상 요청을 준비하지 못했어요'))
    const nonce = castData<AdRewardNonceResponse>(data)
    if (!nonce?.nonce || nonce.purpose !== purpose || !Number.isFinite(Date.parse(nonce.expiresAt))) {
      throw new Error('광고 보상 요청을 준비하지 못했어요')
    }
    return nonce
  }

  async function awaitNonceVerified(
    purpose: AdRewardNonceResponse['purpose'],
    expectedNonce: string,
    opts: { tries?: number, intervalMs?: number, signal?: AbortSignal } = {},
  ): Promise<AdRewardNonceResponse | null> {
    const tries = opts.tries ?? 3
    let last: AdRewardNonceResponse | null = null
    for (let attempt = 0; attempt < tries; attempt++) {
      if (opts.signal?.aborted) return null
      if (attempt > 0) {
        let timer: ReturnType<typeof setTimeout> | undefined
        await untilAborted(new Promise<void>((resolve) => { timer = setTimeout(resolve, opts.intervalMs ?? 1000) }))
        clearTimeout(timer)
      }
      if (opts.signal?.aborted) return null
      last = await untilAborted(issueServerNonce(purpose))
      if (opts.signal?.aborted || !last || last.nonce !== expectedNonce) return null
      if (last.status === 'VERIFIED') return last
    }
    return last

    // 대기와 진행 중 조회 모두 즉시 반환하며 늦은 응답·오류는 이전 청구에 반영하지 않는다.
    async function untilAborted<T>(operation: Promise<T>): Promise<T | null> {
      const signal = opts.signal
      if (!signal) return operation
      let resolveAbort!: (value: null) => void
      function onAbort(): void { resolveAbort(null) }
      try {
        return await Promise.race([
          operation,
          new Promise<null>((resolve) => {
            resolveAbort = resolve
            signal.addEventListener('abort', onAbort, { once: true })
            if (signal.aborted) onAbort()
          }),
        ])
      }
      finally {
        signal.removeEventListener('abort', onAbort)
      }
    }
  }

  async function initialize(): Promise<void> {
    if (!import.meta.client || !isNative || initialized) return
    try {
      const { AdMob } = await import('@capacitor-community/admob')
      // P3-3: iOS 는 IDFA 접근 전 ATT 동의 요청(Apple 정책). Android/web no-op.
      if (isIos) await requestTrackingAuthorization()
      await AdMob.initialize({
        // 운영(PROD) 빌드는 실 광고, dev/test 빌드만 Google 테스트 광고(어뷰징 정책 준수).
        // 2026-06-04 fix: 기존 하드코딩 true → PROD 기준 분기 (운영 빌드 실광고 노출).
        initializeForTesting: !import.meta.env.PROD,
      })
      initialized = true
    }
    catch {
      // 초기화 실패는 silent — showRewardedAd 가 결과적으로 false 반환.
    }
  }

  /**
   * 보상형 광고 시청. 시청 완료 시 true 반환.
   *
   * 플랫폼 게이트 (2026-07-20 audit B2-3 정정): 실 광고는 Android 네이티브에서만 가능.
   * 이전에는 웹/iOS 에서 무조건 true 를 반환해("30초 카운트다운 모달이 게이트" — 실존하지 않는
   * 컴포넌트) **프로덕션에서 광고 시청 없이 보상 청구가 가능**했다. 이제 광고를 띄울 수 없는
   * 플랫폼은 dev 빌드에서만 통과(true, 로컬 보상 플로우 테스트용), 프로덕션은 false —
   * 진입점(홈 무료코인 버튼)도 Android 네이티브에서만 노출된다.
   *
   * @param opts.ssvUserId / opts.ssvCustomData — AdMob SSV 콜백에 실릴 사용자/nonce 식별값.
   *   backend SSV-authoritative 전환(Phase 4)의 전제 배선 (audit B2-2 부수).
   */
  async function showRewardedAd(opts?: { ssvUserId?: string, ssvCustomData?: string }): Promise<boolean> {
    if (!import.meta.client) return false
    if (!isNative || !isAndroid) {
      return import.meta.dev
    }
    try {
      const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob')

      const adId = (config.public.admobRewardedAdId as string | undefined) ?? ''
      // 빈 adId 일 때는 아래 fallback 의 Google 공식 테스트 ID 가 사용됨.

      // SSV 콜백에 user/nonce 를 실어 서버가 "누가 어떤 nonce 로 시청했나"를 알 수 있게 한다.
      // 플러그인 타입이 AtLeastOne(userId | customData) 이라 명시 분기로 구성.
      const ssv = opts?.ssvUserId
        ? { userId: opts.ssvUserId, ...(opts.ssvCustomData ? { customData: opts.ssvCustomData } : {}) }
        : opts?.ssvCustomData
          ? { customData: opts.ssvCustomData }
          : undefined

      // 광고 준비 (prepare) → 표시 (show). @capacitor-community/admob v8 API.
      const preparation = new AbortController()
      await withTimeout((async () => {
        await initialize()
        if (preparation.signal.aborted) return
        await AdMob.prepareRewardVideoAd({
          adId: adId || 'ca-app-pub-3940256099942544/5224354917', // Google 공식 테스트 보상형 광고 ID
          // H3: iOS 에서 ATT 미인증이면 비개인화 광고(npa) 요청. 현재 iOS 는 위 isAndroid 게이트로
          //     이 경로 미도달이라 사실상 false(Android 개인화)지만, iOS 광고 도입 시 ATT 정합 보장.
          npa: isIos && !iosTrackingAuthorized,
          ...(ssv ? { ssv } : {}),
        })
      })(), REWARD_AD_PREPARE_TIMEOUT_MS, preparation)

      return await new Promise<boolean>((resolve) => {
        let rewarded = false
        let settled = false
        const handle = AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          rewarded = true
        })
        const dismissHandle = AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          settle(rewarded)
        })
        // Codex 감사 지적: 설치된 @capacitor-community/admob Android 구현은 광고 표시 자체가
        // 실패하면(예: mRewardedAd == null) onRewardedVideoAdFailedToShow 만 emit하고
        // Dismissed 는 오지 않는다 — 이 리스너 없이는 매번 60초 타임아웃까지 대기하게 됨.
        const failedHandle = AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
          settle(false)
        })
        // AdMob 네이티브 SDK 문제나 백그라운드 전환 중 Dismissed 이벤트가 아예 안 오면 이 프라미스가
        // 무기한 대기 — 호출부(pages/index.vue)가 영원히 로딩 상태로 멈춘다(auth.ts 세션체크와
        // 같은 클래스의 hang 위험). 보상형 광고는 보통 15~30초라 60초 여유를 두고 fail-closed.
        const timeoutId = setTimeout(() => settle(rewarded), REWARD_AD_TIMEOUT_MS)
        // 세 종료 경로(dismiss/failedToShow/timeout/reject) 모두 동일하게 정리 — 이전엔
        // showRewardVideoAd() 의 .catch() 경로만 리스너 remove 를 빠뜨려(Architecture/Codex
        // 감사 둘 다 지적) reject 가 반복되면 전역 리스너가 계속 누적됐다.
        function settle(result: boolean) {
          if (settled) return
          settled = true
          clearTimeout(timeoutId)
          void Promise.all([
            handle.then((h) => h.remove()),
            dismissHandle.then((h) => h.remove()),
            failedHandle.then((h) => h.remove()),
          ])
          resolve(result)
        }
        void AdMob.showRewardVideoAd().catch(() => settle(false))
      })
    }
    catch {
      return false
    }
  }

  return {
    isNative,
    isAndroid,
    isIos,
    initialize,
    requestTrackingAuthorization,
    showRewardedAd,
    issueServerNonce,
    awaitNonceVerified,
  }
}
