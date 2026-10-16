import { authClient } from '~/lib/auth-client'
import { ANALYTICS_CONSENT_VERSION } from '~/components/legal/AnalyticsConsentNotice.vue'

/**
 * GA4 전송 허용 판정 — 개정본에 동의하고 가입한 회원이 분석 수집에도 별도로 동의한 상태.
 * 초기화 플러그인(analytics-consent.client.ts)과 이벤트 전송이 같은 판정을 쓴다.
 */
export function isAnalyticsAllowed(user: { analyticsConsent?: boolean, consentVersion?: string } | null | undefined): boolean {
  return user?.analyticsConsent === true
    && typeof user.consentVersion === 'string'
    && user.consentVersion >= ANALYTICS_CONSENT_VERSION
}

/**
 * GA4 event tracking composable.
 * Wraps nuxt-gtag's useGtag() with TerraWorld-specific event helpers.
 *
 * Events follow the recommended GA4 naming convention:
 * - snake_case event names
 * - 25 char max per parameter key
 */
export function useGtagEvents() {
  const { gtag: sendGtag } = useGtag()
  const session = authClient.useSession()

  // nuxt-gtag 는 manual 모드에서도 부팅 때 dataLayer 를 만들고 gtag 호출을 쌓아 두며, 동의 후
  // initialize() 가 그 큐를 그대로 GA 로 보낸다. 동의 전·철회 중 이벤트는 큐에 넣지 않는다.
  const gtag: typeof sendGtag = (command, ...args) => {
    if (isAnalyticsAllowed(session.value?.data?.user as Parameters<typeof isAnalyticsAllowed>[0])) sendGtag(command, ...args)
  }

  function trackRecordCreated(params: { categoryId: number; categoryName: string; basicCoins: number; categoryTokens: number }) {
    gtag('event', 'record_created', {
      category_id: params.categoryId,
      category_name: params.categoryName,
      coin_reward: params.basicCoins,
      token_reward: params.categoryTokens,
    })
  }

  function trackItemPurchased(params: { itemId: number; itemName: string; priceType: string; priceAmount: number; rarity: string }) {
    gtag('event', 'item_purchased', {
      item_id: params.itemId,
      item_name: params.itemName,
      price_type: params.priceType,
      price_amount: params.priceAmount,
      rarity: params.rarity,
    })
  }

  function trackTerrariumPlaced(params: { itemId: number; slotId: number }) {
    gtag('event', 'terrarium_placed', {
      item_id: params.itemId,
      slot_id: params.slotId,
    })
  }

  function trackHeartClick() {
    gtag('event', 'heart_click')
  }

  function trackShareCreated(params: { method?: string }) {
    gtag('event', 'share_created', {
      method: params.method ?? 'link',
    })
  }

  function trackTokenExchanged(params: { fromType: string; toType: string; amount: number }) {
    gtag('event', 'token_exchanged', {
      from_type: params.fromType,
      to_type: params.toType,
      amount: params.amount,
    })
  }

  function trackSignup(method: string = 'email') {
    gtag('event', 'sign_up', { method })
  }

  function trackLogin(method: string = 'email') {
    gtag('event', 'login', { method })
  }

  function trackScreenshotSaved(params: { context?: string }) {
    gtag('event', 'screenshot_saved', {
      context: params.context ?? 'home',
    })
  }

  function trackAdRewardClaimed(params: { specialCoins: number; reason?: string }) {
    gtag('event', 'ad_reward_claimed', {
      special_coins: params.specialCoins,
      reason: params.reason ?? 'daily',
    })
  }

  function trackWiltingRecovered(params: { previousStage: number }) {
    gtag('event', 'wilting_recovered', {
      previous_stage: params.previousStage,
    })
  }

  function trackInviteCreated() {
    gtag('event', 'invite_created')
  }

  function trackInviteAccepted(params: { specialCoinsRewarded: number }) {
    gtag('event', 'invite_accepted', {
      special_coins_rewarded: params.specialCoinsRewarded,
    })
  }

  function trackRankingViewed(params: { type: string; yearMonth: string }) {
    gtag('event', 'ranking_viewed', {
      ranking_type: params.type,
      year_month: params.yearMonth,
    })
  }

  function trackFreePlacementSaved(params: { itemCount: number }) {
    gtag('event', 'free_placement_saved', {
      item_count: params.itemCount,
    })
  }

  /**
   * SEC-008: push 토큰 서버 등록 실패 시 운영 가시성 확보용. 사용자 UX 는
   * 차단하지 않고 (silent fallback 유지), GA4 에 신호만 발행한다. `reason`
   * 은 짧은 식별자만 — 토큰/이메일 등 PII 금지.
   */
  function trackPushRegistrationFailed(params: { reason: string; status?: number }) {
    gtag('event', 'push_register_failed', {
      reason: params.reason.slice(0, 64),
      status: params.status ?? 0,
    })
  }

  return {
    trackRecordCreated,
    trackItemPurchased,
    trackTerrariumPlaced,
    trackHeartClick,
    trackShareCreated,
    trackTokenExchanged,
    trackSignup,
    trackLogin,
    trackScreenshotSaved,
    trackAdRewardClaimed,
    trackWiltingRecovered,
    trackInviteCreated,
    trackInviteAccepted,
    trackRankingViewed,
    trackFreePlacementSaved,
    trackPushRegistrationFailed,
  }
}
