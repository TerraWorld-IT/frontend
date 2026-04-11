import type { Terrarium } from '~/types'

export function useTerrarium() {
  const { sdk, client } = useOpenApi()

  const terrarium = ref<Terrarium | null>(null)
  const loading = ref(false)

  async function fetchTerrarium() {
    loading.value = true
    try {
      const { data, error } = await sdk.getTerrarium({ client })
      if (error) throw error
      terrarium.value = data as Terrarium
    } finally {
      loading.value = false
    }
  }

  async function savePlacements(placements: Array<{ itemId: number; posX: number; posY: number; rotation?: number; scale?: number }>) {
    const { data, error } = await sdk.updateTerrariumPlacements({ client, body: { placements } })
    if (error) throw error
    terrarium.value = data as Terrarium
    return terrarium.value
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
