import type { ItemListResponse, ItemResponse } from '@terraworld-it/openapi-frontend'

export const useItemsStore = defineStore('items', () => {
  const { sdk, client } = useOpenApi()

  // FE-10: 교체-대입 전용 리스트(모든 뮤테이션이 `.value =` 재할당) — deep reactivity 불필요.
  const items = shallowRef<ItemResponse[]>([])
  const loading = ref<boolean>(false)

  // 아이템 카탈로그는 어드민이 바꿀 때만 변한다. 한 세션 안에서는 사실상 정적이므로
  // 넉넉한 TTL 을 준다. guard 는 store setup 안에 둔다(SSR 요청 간 격리).
  const guard = createFetchGuard(5 * 60_000)

  async function fetchAll(force: boolean = false) {
    await guard.run(async (isCurrent) => {
      loading.value = true
      try {
        const { data, error } = await sdk.listItems({ client })
        if (error) throw new Error('listItems failed')
        // 어드민 뮤테이션으로 무효화된 뒤 도착한 응답은 버린다 (옛 카탈로그가 다시 신선해짐 방지).
        if (!isCurrent()) return
        items.value = (data as ItemListResponse | undefined)?.items ?? []
      }
      finally {
        loading.value = false
      }
    }, force)
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
    // 어드민이 아이템을 만들거나 비활성화하면 이 5분 캐시가 옛 카탈로그를 계속 내놓는다.
    // `admin/items.vue` 의 뮤테이션 직후 반드시 호출할 것.
    invalidate: guard.invalidate,
  }
})
