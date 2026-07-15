import type { FreePlacementListResponse, TerrariumResponse } from '@terraworld-it/openapi-frontend'

/**
 * 홈 화면 composite snapshot (FE-05, 2026-07-15).
 *
 * terrarium(tier/maxSlots/배경/시들기)과 free-placement(좌표)는 서로 파생 관계라,
 * 독립 스토어 2개로 나눠 각자 TTL 캐시하면 서로 다른 시점의 응답이 섞일 수 있다
 * (예: 티어 업 직후 free 만 갱신되어 슬롯 수와 배치가 불일치). 두 요청을 병렬로
 * 받아 "둘 다 성공했을 때만" 하나의 스냅샷으로 원자 커밋한다.
 *
 * TTL 15s: 하단 탭 왕복 시의 중복 요청과 전면 스켈레톤 리셋만 제거. 배치/티어
 * 변경은 사용자 행동 직후 `fetch(true)` 로 강제 갱신한다 (index.vue 의
 * reloadAfterPlacement / onAddItem / saveFreePlacement).
 */
export interface HomeSnapshot {
  terrarium: TerrariumResponse | null
  freePlacements: FreePlacementListResponse | null
}

export const useHomeSnapshotStore = defineStore('homeSnapshot', () => {
  const { sdk, client } = useOpenApi()

  const snapshot = ref<HomeSnapshot | null>(null)
  const loading = ref<boolean>(false)

  // guard 는 store setup 안에 둔다(SSR 요청 간 격리) — user/terrarium 스토어와 동일 패턴.
  const guard = createFetchGuard(15_000)

  async function fetch(force: boolean = false) {
    await guard.run(async (isCurrent) => {
      loading.value = true
      try {
        const [terraRes, freeRes] = await Promise.all([
          sdk.getTerrarium({ client }),
          sdk.listFreePlacements({ client }),
        ])
        if (terraRes.error) throw new Error(errMsg(terraRes.error, 'getTerrarium failed'))
        if (freeRes.error) throw new Error(errMsg(freeRes.error, 'listFreePlacements failed'))
        // 로그아웃/무효화 이후 도착한 응답은 버린다 (이전 사용자의 화면 되살아남 방지).
        if (!isCurrent()) return
        snapshot.value = {
          terrarium: (terraRes.data as TerrariumResponse | undefined) ?? null,
          freePlacements: (freeRes.data as FreePlacementListResponse | undefined) ?? null,
        }
      }
      finally {
        loading.value = false
      }
    }, force)
  }

  /**
   * 저장 성공한 자유배치 편집값을 스냅샷에 반영 (Codex 리뷰 fix).
   * `updateFreePosition` 성공 직후 호출 — invalidate 만 하면 다음 탭 복귀 때 캐시가
   * 저장 이전 좌표를 먼저 렌더하고, 그 화면에서의 후속 편집(flip/depth)이 stale 좌표를
   * 재전송해 이미 저장한 위치를 되돌릴 수 있다. ref 교체 없이 in-place 패치라 홈의
   * snapshot watch 를 발화시키지 않는다(편집 중 placedItems 재구성 방지).
   */
  function patchFreePlacement(
    placementId: number,
    patch: { posX: number, posY: number, scale: number, flipped: boolean, zIndex: number },
  ) {
    const target = snapshot.value?.freePlacements?.items.find(it => it.placementId === placementId)
    if (!target) return
    target.posX = patch.posX
    target.posY = patch.posY
    target.scale = patch.scale
    target.flipped = patch.flipped
    target.zIndex = patch.zIndex
    // 저장 성공 = 이 배치는 서버에서 자유배치 좌표를 갖게 됨 — applySnapshot 이 posX/posY 를 쓰게.
    target.isFreePlacement = true
  }

  /** 로그아웃 / 세션 무효 시 호출 — 다음 사용자에게 이전 사용자의 홈이 보이지 않게 한다. */
  function reset() {
    snapshot.value = null
    guard.invalidate()
  }

  return {
    snapshot: readonly(snapshot),
    loading: readonly(loading),
    fetch,
    patchFreePlacement,
    invalidate: guard.invalidate,
    reset,
  }
})
