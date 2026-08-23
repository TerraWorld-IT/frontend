import { skipHydrate } from 'pinia'
import type { CurrencyResponse, UserMeResponse } from '@terraworld-it/openapi-frontend'
import type { CurrencyCode } from '~/utils/currency'
import { setBalance } from '~/utils/currency'

export const useUserStore = defineStore('user', () => {
  const { sdk, client } = useOpenApi()

  const me = ref<UserMeResponse | null>(null)
  const loading = ref<boolean>(false)

  // 프로필/재화는 사용자 행동으로 바뀌지만, 그 변화는 mutation 응답이 곧바로
  // `updateCurrency`/`updateOwnedItems` 로 반영한다. 따라서 짧은 TTL 로 탭 왕복 시의
  // 중복 `getMe()` 만 제거하면 충분하다. guard 는 store setup 안에 둔다(SSR 요청 간 격리).
  const guard = createFetchGuard(15_000)

  const currency = computed<CurrencyResponse | null>(() => me.value?.currency ?? null)
  const nickname = computed<string>(() => me.value?.nickname ?? '')
  const ownedItems = computed<string[]>(() => me.value?.ownedItems ?? [])

  async function fetchMe(force: boolean = false) {
    await guard.run(async (isCurrent) => {
      loading.value = true
      try {
        const { data, error } = await sdk.getMe({ client })
        if (error) throw new Error('getMe failed')
        // 이 요청이 출발한 뒤 로그아웃/무효화가 있었다면 응답을 버린다. 그러지 않으면
        // 로그아웃 직전에 출발한 요청이 나중에 도착해 **이전 사용자의 프로필을 되살린다**.
        if (!isCurrent()) return
        me.value = (data as UserMeResponse | undefined) ?? null
      }
      finally {
        loading.value = false
      }
    }, force)
  }

  function updateCurrency(c: CurrencyResponse) {
    if (me.value) me.value.currency = c
  }

  function updateOwnedItems(items: string[]) {
    if (me.value) me.value.ownedItems = items
  }

  /**
   * 화폐 하나의 잔액만 갱신 — 서버가 전체 `currency` 대신 한 값만 돌려줄 때(예: 하트 클릭).
   *
   * `me` 는 밖으로 `readonly()` 로 나가므로, 호출부에서 `setBalance(userStore.me.currency, …)`
   * 를 하면 readonly 프록시가 쓰기를 삼켜 **에러 없이 조용히 무시**된다. 반드시 이 액션을 거칠 것.
   */
  function setCurrencyBalance(code: CurrencyCode, amount: number) {
    setBalance(me.value?.currency, code, amount)
  }

  /**
   * 로그아웃 / 세션 무효 시 호출. 캐시된 프로필을 버리고 TTL 도 만료시킨다.
   *
   * 이게 없으면 같은 SPA 세션에서 A 가 로그아웃하고 B 가 곧바로 로그인했을 때,
   * 홈의 `fetchMe()` 가 15초 TTL 에 걸려 skip 되고 **A 의 닉네임·잔액·소유품**이 B 에게 보인다.
   * A 가 ADMIN 이었다면 캐시된 role 이 `middleware/admin.ts` 까지 통과시킨다.
   */
  function reset() {
    me.value = null
    guard.invalidate()
  }

  // readonly 로 내보내는 상태는 `skipHydrate` 로 감싼다. Pinia 는 setup 스토어가 돌려준 ref 를
  // SSR 페이로드로 하이드레이션할 때 `ref.value = initialState[key]` 를 그대로 대입하는데, readonly
  // 프록시에는 쓰기가 막혀 `[Vue warn] Set operation on key "value" failed: target is readonly`
  // 가 readonly ref 마다 한 번씩 찍힌다(홈 6회·상점 4회 등 — 2026-08-23 런타임 스모크). 데이터는
  // 페이지 마운트 후 액션으로 다시 받으므로 하이드레이션 생략이 동작을 바꾸지 않는다.
  return {
    me: skipHydrate(readonly(me)),
    currency,
    nickname,
    ownedItems,
    loading: skipHydrate(readonly(loading)),
    fetchMe,
    invalidate: guard.invalidate,
    updateCurrency,
    updateOwnedItems,
    setCurrencyBalance,
    reset,
  }
})
