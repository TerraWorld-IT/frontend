import { Capacitor } from '@capacitor/core'

// H3 (code-review): iOS ATT 결과를 모듈 스코프에 보존한다. ATT 요청은 앱 시작 시
// (capacitor.client.ts) 의 useAdMob() 인스턴스에서, 광고 표시는 별도 useAdMob() 인스턴스에서
// 일어나므로 인스턴스 변수로는 공유 불가. 미인증/오류 시 fail-closed(개인화 광고 미요청).
let iosTrackingAuthorized = false

/**
 * AdMob 보상형 광고 composable.
 *
 * - 네이티브(Android) 에서만 실제 광고. 웹/iOS-dev 에서는 30초 카운트다운 모달로 대체.
 * - `@capacitor-community/admob` 플러그인은 Android 에서 native 코드(MobileAds SDK)를 등록.
 * - dev 빌드는 `capacitor.config.ts` 의 `initializeForTesting=true` 로 Google 테스트 광고 ID 자동 사용 → 어뷰징 정책 위반 없음.
 *
 * 사용
 *   const { showRewardedAd, generateNonce } = useAdMob()
 *   const nonce = generateNonce()           // N9: 광고 시청 직전 발급 (UUID v4)
 *   const rewarded = await showRewardedAd()
 *   if (rewarded) { sdk.claimAdReward({ client, body: { nonce } }) }  // backend dedup
 *
 * N9 (구현 계획서 v4, 2026-05-26): client-issued nonce 도입. 광고 1회당 하나의 nonce 만
 * 발급 — backend `ad_reward_nonce_inbox` 가 같은 nonce 두 번 사용을 거부. 외부 AdMob SSV
 * public key 활성화 전이라도 단순 replay attack 차단.
 */
export function useAdMob() {
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

  /**
   * N9: 광고 보상 nonce 발급 (UUID v4). 광고 시청 직전 호출 → 시청 완료 후 backend
   * `/rewards/ad` 에 body.nonce 로 전달. 같은 nonce 로 두 번 호출 시 backend 가 409.
   *
   * 암호학적으로 안전한 nonce 만 발급 — replay 방어가 client nonce 예측 불가능성에 의존.
   * 우선순위: crypto.randomUUID() → crypto.getRandomValues() (둘 다 CSPRNG).
   * Math.random 기반 예측가능 fallback 은 secure context 아닌 환경의 최후 수단
   * (운영 빌드는 HTTPS 강제로 도달 불가). 출력 길이는 spec nonce 16~64 범위 내.
   */
  function generateNonce(): string {
    if (typeof crypto !== 'undefined') {
      if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID() // 36자 (CSPRNG)
      }
      if (typeof crypto.getRandomValues === 'function') {
        // 16바이트 → 32자 hex (CSPRNG). randomUUID 미지원 secure context 대비.
        const bytes = crypto.getRandomValues(new Uint8Array(16))
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      }
    }
    // 최후 fallback — secure context 아님(예측가능). 운영 빌드는 HTTPS 강제로 도달 불가.
    return `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
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
      await initialize()
      const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob')

      const config = useRuntimeConfig()
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
      await AdMob.prepareRewardVideoAd({
        adId: adId || 'ca-app-pub-3940256099942544/5224354917', // Google 공식 테스트 보상형 광고 ID
        // H3: iOS 에서 ATT 미인증이면 비개인화 광고(npa) 요청. 현재 iOS 는 위 isAndroid 게이트로
        //     이 경로 미도달이라 사실상 false(Android 개인화)지만, iOS 광고 도입 시 ATT 정합 보장.
        npa: isIos && !iosTrackingAuthorized,
        ...(ssv ? { ssv } : {}),
      })

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
        const REWARD_AD_TIMEOUT_MS = 60_000
        const timeoutId = setTimeout(() => settle(false), REWARD_AD_TIMEOUT_MS)
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
    generateNonce,
  }
}
