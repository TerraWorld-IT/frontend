import type {
  HabitCheckInResponse,
  HabitCycleRewardResponse,
  HabitListResponse,
  HabitTrackerResponse,
} from '@terraworld-it/openapi-frontend'

/**
 * 습관(Habit) 트래커 composable — 낙서장 리팩토링 req 1/3/9 + 아프젝 v2 R2/R7.
 *
 * 백엔드 `GET/POST /habits`, `POST /habits/{id}/checkin|accept|decline|complete|extend`,
 * `DELETE /habits/{id}` 실 배선. 7일 cycle 을 연속 체크인하면 `COMPLETED_UNCLAIMED` 가 되고
 * complete/extend 호출 시 반짝이(SPARKLE)를 지급받는다(육성 재화). 상태는 서버가 SoT 다.
 * 페이지는 이 composable 의 상태/액션만 소비하고 API 세부는 여기 캡슐화(구조 분해 req7).
 *
 * 사용:
 *   const { trackers, loading, load, create, checkIn } = useHabits()
 *   onMounted(load)
 */

/** 액션 결과 — 실패 시 data=null, 호출부가 HTTP status / 서버 에러 코드로 분기한다. */
export interface HabitActionResult<T> {
  data: T | null
  status: number | null
  code: string | null
}

export function useHabits() {
  const { sdk, client } = useOpenApi()

  // FE-10: 교체-대입 전용 리스트(load/create/checkIn 모두 새 배열 재할당) — deep reactivity 불필요.
  const trackers = shallowRef<HabitTrackerResponse[]>([])
  const loading = ref<boolean>(false)
  const loaded = ref<boolean>(false)
  // Codex MED#3: 로드 실패(500/401)를 empty-state 와 구분 — 페이지가 에러 표시.
  const loadError = ref<boolean>(false)

  /** 응답 트래커로 해당 항목만 교체(없으면 append) — 전체 reload 의 stale race 회피(Codex MED#1). */
  function upsertTracker(prevId: number, next: HabitTrackerResponse): void {
    const idx = trackers.value.findIndex(t => t.id === prevId)
    if (idx === -1) {
      trackers.value = [...trackers.value, next]
      return
    }
    const copy = [...trackers.value]
    copy[idx] = next
    trackers.value = copy
  }

  function removeTracker(trackerId: number): void {
    trackers.value = trackers.value.filter(t => t.id !== trackerId)
  }

  /** 활성 습관 목록 조회(PENDING/ACTIVE/COMPLETED_UNCLAIMED — COMPLETED/BROKEN 은 서버가 제외). */
  async function load(): Promise<void> {
    loading.value = true
    loadError.value = false
    const { data, error } = await sdk.listHabits({ client })
    if (!error && data) {
      trackers.value = castData<HabitListResponse>(data)?.trackers ?? []
    }
    else {
      loadError.value = true
    }
    loaded.value = true
    loading.value = false
  }

  /**
   * 습관 트래커 생성. 생성된 트래커를 목록에 append(응답이 authoritative — 전체 reload 대신).
   * friendUserId 지정 시 상대에게 요청이 가고 내 트래커는 수락 전까지 status=PENDING /
   * partnerStatus=PENDING_SENT. 활성 습관이 이미 있으면 409 HABIT_LIMIT_EXCEEDED.
   */
  async function create(
    title: string,
    friendUserId?: string | null,
  ): Promise<HabitActionResult<HabitTrackerResponse>> {
    try {
      const { data, error, response } = await sdk.createHabit({
        client,
        body: { title, friendUserId: friendUserId ?? null },
      })
      if (error || !data) return { data: null, status: response?.status ?? null, code: errCode(error) }
      const created = castData<HabitTrackerResponse>(data) ?? null
      if (created) trackers.value = [...trackers.value, created]
      return { data: created, status: response?.status ?? null, code: null }
    }
    catch {
      return { data: null, status: null, code: null }
    }
  }

  /**
   * 체크인. 응답의 갱신된 tracker 로 **해당 항목만 in-place 교체**(Codex MED#1: 전체 reload
   * 는 여러 습관 동시 체크인 시 stale 응답이 최신 상태를 덮어쓰는 race 유발 → 제거).
   * 7일째면 cycleCompleted=true + status=COMPLETED_UNCLAIMED — 보상은 complete/extend 에서 지급.
   * 수락 전(PENDING) 체크인은 409 HABIT_NOT_ACTIVE.
   */
  async function checkIn(trackerId: number): Promise<HabitActionResult<HabitCheckInResponse>> {
    try {
      const { data, error, response } = await sdk.checkInHabit({
        client,
        path: { trackerId },
      })
      if (error || !data) return { data: null, status: response?.status ?? null, code: errCode(error) }
      const result = castData<HabitCheckInResponse>(data) ?? null
      if (result?.tracker) upsertTracker(trackerId, result.tracker)
      return { data: result, status: response?.status ?? null, code: null }
    }
    catch {
      return { data: null, status: null, code: null }
    }
  }

  /**
   * 습관 중단(ACTIVE → BROKEN, 상대에겐 PARTNER_STOPPED) 또는 요청 대기 중 취소(PENDING → 양측 BROKEN).
   * 성공 시 목록에서 제거 — 같은 친구와 새 공동 습관 생성이 가능해진다 (2026-07-21 M1).
   */
  async function stop(trackerId: number): Promise<boolean> {
    // HTTP 오류는 {error} 로 오지만 네트워크 자체 실패는 throw — 호출부 피드백을 위해
    // boolean 으로 정규화 (Codex R1 #10).
    try {
      const { error } = await sdk.stopHabit({
        client,
        path: { trackerId },
      })
      if (error) return false
    }
    catch {
      return false
    }
    removeTracker(trackerId)
    return true
  }

  /** 친구가 보낸 요청(시작/연장) 수락 — 내 미러 트래커 id 로 호출, 양측 ACTIVE. */
  async function accept(trackerId: number): Promise<HabitActionResult<HabitTrackerResponse>> {
    try {
      const { data, error, response } = await sdk.acceptHabit({ client, path: { trackerId } })
      if (error || !data) return { data: null, status: response?.status ?? null, code: errCode(error) }
      const updated = castData<HabitTrackerResponse>(data) ?? null
      if (updated) upsertTracker(trackerId, updated)
      return { data: updated, status: response?.status ?? null, code: null }
    }
    catch {
      return { data: null, status: null, code: null }
    }
  }

  /** 친구가 보낸 요청(시작/연장) 거절 — 양측 BROKEN(목록 제외). 성공 시 내 트래커 제거. */
  async function decline(trackerId: number): Promise<HabitActionResult<true>> {
    try {
      const { error, response } = await sdk.declineHabit({ client, path: { trackerId } })
      if (error) return { data: null, status: response?.status ?? null, code: errCode(error) }
      removeTracker(trackerId)
      return { data: true, status: response?.status ?? null, code: null }
    }
    catch {
      return { data: null, status: null, code: null }
    }
  }

  /**
   * 7/7 완료 후 [기록 완료하기] — 보상 수령 + 카드 종료(COMPLETED, 목록 제외).
   * 이미 지급된 사이클이면 200 멱등 재생(alreadyClaimed=true, sparkleGranted=0).
   */
  async function complete(trackerId: number): Promise<HabitActionResult<HabitCycleRewardResponse>> {
    try {
      const { data, error, response } = await sdk.completeHabit({ client, path: { trackerId } })
      if (error || !data) return { data: null, status: response?.status ?? null, code: errCode(error) }
      const result = castData<HabitCycleRewardResponse>(data) ?? null
      // 종료된 트래커(COMPLETED)는 목록에서 빠진다.
      removeTracker(trackerId)
      return { data: result, status: response?.status ?? null, code: null }
    }
    catch {
      return { data: null, status: null, code: null }
    }
  }

  /**
   * 7/7 완료 후 [기록 1주일 연장 하기] — 보상 지급(complete 와 동일) + 같은 제목·친구 설정으로
   * 새 7일 사이클. solo 는 즉시 ACTIVE, friend 는 상대 수락 전 status=PENDING / extendStatus=PENDING_SENT.
   */
  async function extend(trackerId: number): Promise<HabitActionResult<HabitCycleRewardResponse>> {
    try {
      const { data, error, response } = await sdk.extendHabit({ client, path: { trackerId } })
      if (error || !data) return { data: null, status: response?.status ?? null, code: errCode(error) }
      const result = castData<HabitCycleRewardResponse>(data) ?? null
      if (result?.tracker) upsertTracker(trackerId, result.tracker)
      return { data: result, status: response?.status ?? null, code: null }
    }
    catch {
      return { data: null, status: null, code: null }
    }
  }

  return {
    trackers,
    loading,
    loaded,
    loadError,
    load,
    create,
    checkIn,
    stop,
    accept,
    decline,
    complete,
    extend,
  }
}
