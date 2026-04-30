import { Capacitor } from '@capacitor/core'

/**
 * AdMob 보상형 광고 composable.
 *
 * - 네이티브(Android) 에서만 실제 광고. 웹/iOS-dev 에서는 30초 카운트다운 모달로 대체.
 * - `@capacitor-community/admob` 플러그인은 Android 에서 native 코드(MobileAds SDK)를 등록.
 * - dev 빌드는 `capacitor.config.ts` 의 `initializeForTesting=true` 로 Google 테스트 광고 ID 자동 사용 → 어뷰징 정책 위반 없음.
 *
 * 사용
 *   const { showRewardedAd } = useAdMob()
 *   const rewarded = await showRewardedAd()
 *   if (rewarded) { ... 보상 API 호출 ... }
 */
export function useAdMob() {
  const isNative = import.meta.client ? Capacitor.isNativePlatform() : false
  const isAndroid = import.meta.client ? Capacitor.getPlatform() === 'android' : false

  let initialized = false

  async function initialize(): Promise<void> {
    if (!import.meta.client || !isNative || initialized) return
    try {
      const { AdMob } = await import('@capacitor-community/admob')
      await AdMob.initialize({
        initializeForTesting: true,
      })
      initialized = true
    }
    catch {
      // 초기화 실패는 silent — showRewardedAd 가 결과적으로 false 반환.
    }
  }

  /**
   * 보상형 광고 시청. 시청 완료 시 true 반환.
   * 네이티브 미지원 환경에서는 즉시 true (UI 측의 30초 모달이 게이트 역할).
   */
  async function showRewardedAd(): Promise<boolean> {
    if (!import.meta.client) return false
    if (!isNative || !isAndroid) {
      // 웹/iOS dev — UI 측에서 30초 카운트다운 모달이 게이트 역할.
      // 여기서는 단순히 통과시키고 보상 API 를 호출하게 둠.
      return true
    }
    try {
      await initialize()
      const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob')

      const config = useRuntimeConfig()
      const adId = (config.public.admobRewardedAdId as string | undefined) ?? ''
      // 빈 adId 일 때는 아래 fallback 의 Google 공식 테스트 ID 가 사용됨.

      // 광고 준비 (prepare) → 표시 (show). @capacitor-community/admob v7.2.0 API.
      await AdMob.prepareRewardVideoAd({
        adId: adId || 'ca-app-pub-3940256099942544/5224354917', // Google 공식 테스트 보상형 광고 ID
      })

      return await new Promise<boolean>((resolve) => {
        let rewarded = false
        const handle = AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          rewarded = true
        })
        const dismissHandle = AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          // 정리 후 결과 반환 — Rewarded 이벤트가 먼저 발생했으면 true
          void Promise.all([handle.then((h) => h.remove()), dismissHandle.then((h) => h.remove())])
          resolve(rewarded)
        })
        void AdMob.showRewardVideoAd().catch(() => resolve(false))
      })
    }
    catch {
      return false
    }
  }

  return {
    isNative,
    isAndroid,
    initialize,
    showRewardedAd,
  }
}
