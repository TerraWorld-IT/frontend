import type { ItemListResponse, ItemResponse } from '@terraworld-it/openapi-frontend'

export const useItemsStore = defineStore('items', () => {
  const { sdk, client } = useOpenApi()

  const items = ref<ItemResponse[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const { data, error } = await sdk.listItems({ client })
      if (error) throw new Error('listItems failed')
      items.value = (data as ItemListResponse | undefined)?.items ?? []
    }
    finally {
      loading.value = false
    }
  }

  function getById(id: number): ItemResponse | undefined {
    return items.value.find((i) => i.id === id)
  }

  function getBySlug(slug: string): ItemResponse | undefined {
    return items.value.find((i) => i.slug === slug)
  }

  return {
    items: readonly(items),
    loading: readonly(loading),
    fetchAll,
    getById,
    getBySlug,
  }
})
