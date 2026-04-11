import type { PlacedItemDetail, TerrariumResponse } from '@terraworld-it/openapi-frontend'

export const useTerrariumStore = defineStore('terrarium', () => {
  const { sdk, client } = useOpenApi()

  const data = ref<TerrariumResponse | null>(null)
  const loading = ref(false)

  const placedItems = computed<PlacedItemDetail[]>(() => data.value?.placedItems ?? [])
  const maxSlots = computed(() => data.value?.maxSlots ?? 5)

  async function fetch() {
    loading.value = true
    try {
      const { data: res, error } = await sdk.getTerrarium({ client })
      if (error) throw new Error('getTerrarium failed')
      data.value = (res as TerrariumResponse | undefined) ?? null
    }
    finally {
      loading.value = false
    }
  }

  return {
    data: readonly(data),
    placedItems,
    maxSlots,
    loading: readonly(loading),
    fetch,
  }
})
