/**
 * GA4 event tracking composable.
 * Wraps nuxt-gtag's useGtag() with TerraWorld-specific event helpers.
 *
 * Events follow the recommended GA4 naming convention:
 * - snake_case event names
 * - 25 char max per parameter key
 */
export function useGtagEvents() {
  const { gtag } = useGtag()

  function trackRecordCreated(params: { categoryId: number; categoryName: string; basicCoins: number; categoryTokens: number; experienceGained: number }) {
    gtag('event', 'record_created', {
      category_id: params.categoryId,
      category_name: params.categoryName,
      coin_reward: params.basicCoins,
      token_reward: params.categoryTokens,
      exp_reward: params.experienceGained,
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
  }
}
