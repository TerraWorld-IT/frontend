import type { CurrencyResponse, ProgressResponse, UserMeResponse } from '@terraworld-it/openapi-frontend'

export const useUserStore = defineStore('user', () => {
  const { sdk, client } = useOpenApi()

  const me = ref<UserMeResponse | null>(null)
  const loading = ref(false)

  const currency = computed<CurrencyResponse | null>(() => me.value?.currency ?? null)
  const progress = computed<ProgressResponse | null>(() => me.value?.progress ?? null)
  const nickname = computed(() => me.value?.nickname ?? '')
  const ownedItems = computed(() => me.value?.ownedItems ?? [])

  async function fetchMe() {
    loading.value = true
    try {
      const { data, error } = await sdk.getMe({ client })
      if (error) throw new Error('getMe failed')
      me.value = (data as UserMeResponse | undefined) ?? null
    }
    finally {
      loading.value = false
    }
  }

  function updateCurrency(c: CurrencyResponse) {
    if (me.value) me.value.currency = c
  }

  function updateOwnedItems(items: string[]) {
    if (me.value) me.value.ownedItems = items
  }

  return {
    me: readonly(me),
    currency,
    progress,
    nickname,
    ownedItems,
    loading: readonly(loading),
    fetchMe,
    updateCurrency,
    updateOwnedItems,
  }
})
