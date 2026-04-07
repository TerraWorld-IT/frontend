import type { Terrarium, PlaceItemPayload, TerrariumItem } from '~/types'

export function useTerrarium() {
  const { get, post, put, del } = useApi()

  const terrarium = ref<Terrarium | null>(null)
  const loading = ref(false)

  async function fetchTerrarium() {
    loading.value = true
    try {
      terrarium.value = await get<Terrarium>('/terrarium')
    } finally {
      loading.value = false
    }
  }

  async function placeItem(payload: PlaceItemPayload) {
    const placed = await post<TerrariumItem>('/terrarium/items', payload)
    terrarium.value?.items.push(placed)
    return placed
  }

  async function moveItem(id: number, posX: number, posY: number) {
    return put<TerrariumItem>(`/terrarium/items/${id}`, { posX, posY })
  }

  async function removeItem(id: number) {
    await del(`/terrarium/items/${id}`)
    if (terrarium.value) {
      terrarium.value.items = terrarium.value.items.filter(i => i.id !== id)
    }
  }

  async function changeBackground(backgroundId: number) {
    await put('/terrarium/background', { backgroundId })
    if (terrarium.value) {
      terrarium.value.backgroundId = backgroundId
    }
  }

  async function fetchUserTerrarium(userId: number) {
    return get<Terrarium>(`/terrarium/user/${userId}`)
  }

  return {
    terrarium: readonly(terrarium),
    loading: readonly(loading),
    fetchTerrarium, placeItem, moveItem, removeItem, changeBackground, fetchUserTerrarium,
  }
}
