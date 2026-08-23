import type {
  TerrariumResponse,
  TierCatalogResponse,
  TierInfo,
  TierUnlockResponse,
  _Error,
} from '@terraworld-it/openapi-frontend'

/** 티어 해금 결과 — 성공 시 응답, 실패 시 에러(code/message) 반환. */
export type TierUnlockOutcome =
  | { ok: true, data: TierUnlockResponse }
  | { ok: false, error: _Error | null }

/** 표시 병 전환 결과 — 성공 시 전환된 티어 기준 테라리움 응답, 실패 시 에러(code/message) 반환. */
export type TierSwitchOutcome =
  | { ok: true, data: TerrariumResponse }
  | { ok: false, error: _Error | null }

/**
 * 테라리움 티어 composable — 아프젝 v2 (N-B4 / rev2 R1).
 *
 * 백엔드 `GET /terrarium/tiers`(카탈로그), `POST /terrarium/tier`(해금),
 * `PUT /terrarium/active-tier`(표시 병 전환) 실 배선.
 * 3레벨 루비 전용 순차 해금(targetTier == 해금 최고 티어의 다음). 해금해도 표시 병(activeTier)은
 * 바뀌지 않으며, 해금된 티어 중 하나를 골라 전환한다 — 배치는 티어별로 저장된다.
 */
export function useTier() {
  const { sdk, client } = useOpenApi()

  const catalog = ref<TierCatalogResponse | null>(null)
  const loading = ref<boolean>(false)
  const loaded = ref<boolean>(false)
  const loadError = ref<boolean>(false)

  /** 티어 카탈로그 + 표시 병/해금 최고 티어 조회. */
  async function load(): Promise<void> {
    loading.value = true
    loadError.value = false
    const { data, error } = await sdk.getTierCatalog({ client })
    if (!error && data) {
      catalog.value = castData<TierCatalogResponse>(data) ?? null
    }
    else {
      loadError.value = true
    }
    loaded.value = true
    loading.value = false
  }

  /**
   * 다음 티어 해금(순차). 성공 시 카탈로그 갱신 + 결과 반환.
   * 실패 시 `{ ok: false, error }` 로 error.code(INSUFFICIENT_FUNDS / INVALID_INPUT)를
   * 호출부에 전달해 원인별 안내가 가능하게 한다(FP-04).
   */
  async function unlock(targetTier: string): Promise<TierUnlockOutcome> {
    const { data, error } = await sdk.unlockTier({ client, body: { targetTier } })
    if (error || !data) {
      return { ok: false, error: (error as _Error | undefined) ?? null }
    }
    const result = castData<TierUnlockResponse>(data)
    if (!result) return { ok: false, error: null }
    await load()
    return { ok: true, data: result }
  }

  /**
   * 표시 병 전환 — 해금된 티어만 허용(미해금 409 `TIER_LOCKED`). 성공 시 카탈로그의
   * active 플래그를 갱신하고 전환된 티어 기준 `TerrariumResponse` 를 돌려준다.
   * 배치·슬롯 수가 티어별이므로 호출부는 홈 스냅샷을 강제 재조회해야 한다.
   */
  async function setActive(targetTier: string): Promise<TierSwitchOutcome> {
    const { data, error } = await sdk.setActiveTier({ client, body: { tier: targetTier } })
    if (error || !data) {
      return { ok: false, error: (error as _Error | undefined) ?? null }
    }
    const result = castData<TerrariumResponse>(data)
    if (!result) return { ok: false, error: null }
    await load()
    return { ok: true, data: result }
  }

  /** 현재 표시 중인 병 티어 코드 — 카탈로그 미로드 시 null. */
  const activeTier = computed<string | null>(() => catalog.value?.activeTier ?? null)

  /** 다음 해금 대상 티어(해금 최고 티어+1) — 없으면 null(최고 티어). */
  const nextTier = computed<TierInfo | null>(() => {
    const c = catalog.value
    if (!c) return null
    return c.tiers.filter(t => !t.unlocked).sort((a, b) => a.level - b.level)[0] ?? null
  })

  return { catalog, loading, loaded, loadError, activeTier, nextTier, load, unlock, setActive }
}
