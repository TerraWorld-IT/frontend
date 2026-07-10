import type { PlacedItemDetail, TerrariumResponse } from '@terraworld-it/openapi-frontend'

export const useTerrariumStore = defineStore('terrarium', () => {
  const { sdk, client } = useOpenApi()

  const data = ref<TerrariumResponse | null>(null)
  const loading = ref<boolean>(false)

  // 배치/티어 변경은 사용자 행동으로만 일어나고, 그 직후에는 `fetch(true)` 로 강제 갱신한다.
  // 짧은 TTL 은 탭 왕복 시의 중복 요청만 없앤다. guard 는 store setup 안에 둔다(SSR 격리).
  const guard = createFetchGuard(15_000)

  const placedItems = computed<PlacedItemDetail[]>(() => data.value?.placedItems ?? [])
  const maxSlots = computed<number>(() => data.value?.maxSlots ?? 5)

  async function fetch(force: boolean = false) {
    await guard.run(async (isCurrent) => {
      loading.value = true
      try {
        const { data: res, error } = await sdk.getTerrarium({ client })
        if (error) throw new Error('getTerrarium failed')
        // 로그아웃/무효화 이후 도착한 응답은 버린다 (이전 사용자의 테라리움 되살아남 방지).
        if (!isCurrent()) return
        data.value = (res as TerrariumResponse | undefined) ?? null
      }
      finally {
        loading.value = false
      }
    }, force)
  }

  /** 로그아웃 / 세션 무효 시 호출 — 다음 사용자에게 이전 사용자의 테라리움이 보이지 않게 한다. */
  function reset() {
    data.value = null
    guard.invalidate()
  }

  return {
    data: readonly(data),
    placedItems,
    maxSlots,
    loading: readonly(loading),
    fetch,
    invalidate: guard.invalidate,
    reset,
  }
})
