import type {
  TierCatalogResponse,
  TierInfo,
  TierUnlockResponse,
  _Error,
} from '@terraworld-it/openapi-frontend'

/** 티어 해금 결과 — 성공 시 응답, 실패 시 에러(code/message) 반환. */
export type TierUnlockOutcome =
  | { ok: true, data: TierUnlockResponse }
  | { ok: false, error: _Error | null }

/**
 * 테라리움 티어(공간 잠금해제) composable — 낙서장 리팩토링 P2 / req1·req9.
 *
 * 백엔드 `GET /terrarium/tiers`(카탈로그), `POST /terrarium/tier`(해금) 실 배선.
 * 구 '레벨/진화' 대체 — 화폐(반짝이 SPARKLE + 루비 RUBY)로 순차 해금(targetTier == 현재+1),
 * 해금 시 배치 슬롯 확장 + 정령 지급(spiritCode). API 세부는 여기 캡슐화(구조 분해 req7).
 */
export function useTier() {
  const { sdk, client } = useOpenApi()

  const catalog = ref<TierCatalogResponse | null>(null)
  const loading = ref<boolean>(false)
  const loaded = ref<boolean>(false)
  const loadError = ref<boolean>(false)

  /** 티어 카탈로그 + 현재 티어 조회. */
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

  /** 다음 해금 대상 티어(현재+1) — 없으면 null(최고 티어). */
  const nextTier = computed<TierInfo | null>(() => {
    const c = catalog.value
    if (!c) return null
    return c.tiers.filter(t => !t.unlocked).sort((a, b) => a.tierOrder - b.tierOrder)[0] ?? null
  })

  return { catalog, loading, loaded, loadError, nextTier, load, unlock }
}
