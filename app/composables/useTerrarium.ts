import type {
  PlacementItem,
  TerrariumResponse,
} from '@terraworld-it/openapi-frontend'

export function useTerrarium() {
  const { sdk, client } = useOpenApi()

  const terrarium = ref<TerrariumResponse | null>(null)
  const loading = ref(false)

  async function fetchTerrarium() {
    loading.value = true
    try {
      const { data, error } = await sdk.getTerrarium({ client })
      if (error) throw error
      terrarium.value = (data as TerrariumResponse) ?? null
    } finally {
      loading.value = false
    }
  }

  /**
   * Save full placement snapshot (slot-based, not position-based).
   * API expects: { placedItems: [{ itemId, slotId }] }
   */
  async function savePlacements(items: PlacementItem[]) {
    const { data, error } = await sdk.updateTerrariumPlacements({
      client,
      body: { placedItems: items },
    })
    if (error) throw error
    // Refresh local state after save
    await fetchTerrarium()
    return data
  }

  async function clickHeart() {
    const { data, error } = await sdk.clickTerrariumHeart({ client })
    if (error) throw error
    return data
  }

  return {
    terrarium: readonly(terrarium),
    loading: readonly(loading),
    fetchTerrarium, savePlacements, clickHeart,
  }
}
