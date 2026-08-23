import type {
  HabitCheckInResponse,
  HabitListResponse,
  HabitTrackerResponse,
} from '@terraworld-it/openapi-frontend'

/**
 * 습관(Habit) 트래커 composable — 낙서장 리팩토링 req 1/3/9 + 아프젝 v2 R2/R7.
 *
 * 백엔드 `GET/POST /habits`, `POST /habits/{id}/checkin`, `DELETE /habits/{id}` 실 배선.
 * 7일 cycle 을 연속 체크인하면 반짝이(SPARKLE)를 지급받는다(육성 재화).
 * 페이지는 이 composable 의 상태/액션만 소비하고 API 세부는 여기 캡슐화(구조 분해 req7).
 *
 * N-B5(요청/수락/완료/연장) 오퍼레이션은 스펙·백엔드 미구현 — 아래 complete/extend 는
 * 현행 SDK 로 동작하는 폴백이며 `TODO(N-B5 스펙 머지 후)` 지점에서 실 API 로 교체한다.
 *
 * 사용:
 *   const { trackers, loading, load, create, checkIn } = useHabits()
 *   onMounted(load)
 */

/** 완주 마커 저장 키 — `${trackerId}:${completedCycles}` 문자열 배열 */
const CYCLE_DONE_STORAGE_KEY = 'apjek.habit.cycleDone.v1'

function readCycleDoneMarkers(): string[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(CYCLE_DONE_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  }
  catch {
    return []
  }
}

function writeCycleDoneMarkers(markers: string[]): void {
  if (!import.meta.client) return
  try {
    localStorage.setItem(CYCLE_DONE_STORAGE_KEY, JSON.stringify(markers))
  }
  catch {
    // 저장 실패(프라이빗 모드 등)는 무시 — 마커는 표시 편의일 뿐 보상/상태의 SoT 가 아니다.
  }
}

export function useHabits() {
  const { sdk, client } = useOpenApi()

  // FE-10: 교체-대입 전용 리스트(load/create/checkIn 모두 새 배열 재할당) — deep reactivity 불필요.
  const trackers = shallowRef<HabitTrackerResponse[]>([])
  const loading = ref<boolean>(false)
  const loaded = ref<boolean>(false)
  // Codex MED#3: 로드 실패(500/401)를 empty-state 와 구분 — 페이지가 에러 표시.
  const loadError = ref<boolean>(false)

  // 이번 사이클 완주 마커 — 현행 백엔드는 7일째 체크인에서 보상을 지급하고 streak 를 0 으로
  // 되돌린 채 ACTIVE 를 유지한다. "7/7 완료 → [기록 완료하기]/[연장]" 화면(R7)을 보이려면
  // 클라이언트가 완주 직후임을 기억해야 하므로 localStorage 에 보관한다.
  // TODO(N-B5 스펙 머지 후): 서버 status=COMPLETED / cycleCompletedAt 으로 대체하고 마커를 제거한다.
  const cycleDoneMarkers = ref<string[]>([])

  function markerOf(tr: Pick<HabitTrackerResponse, 'id' | 'completedCycles'>): string {
    return `${tr.id}:${tr.completedCycles}`
  }

  /** 이 트래커가 "방금 완주해 완료/연장 선택 대기" 상태인지 */
  function isCycleDone(tr: HabitTrackerResponse): boolean {
    return tr.status === 'COMPLETED'
      || (tr.currentStreakDays === 0 && cycleDoneMarkers.value.includes(markerOf(tr)))
  }

  function clearCycleDone(trackerId: number): void {
    const next = cycleDoneMarkers.value.filter(m => !m.startsWith(`${trackerId}:`))
    if (next.length !== cycleDoneMarkers.value.length) {
      cycleDoneMarkers.value = next
      writeCycleDoneMarkers(next)
    }
  }

  /** 활성 습관 목록 조회. */
  async function load(): Promise<void> {
    loading.value = true
    loadError.value = false
    if (cycleDoneMarkers.value.length === 0) cycleDoneMarkers.value = readCycleDoneMarkers()
    const { data, error } = await sdk.listHabits({ client })
    if (!error && data) {
      trackers.value = castData<HabitListResponse>(data)?.trackers ?? []
      // 목록에 없는(중단/삭제된) 트래커의 마커는 정리한다.
      const alive = new Set(trackers.value.map(t => t.id))
      const pruned = cycleDoneMarkers.value.filter(m => alive.has(Number(m.split(':')[0])))
      if (pruned.length !== cycleDoneMarkers.value.length) {
        cycleDoneMarkers.value = pruned
        writeCycleDoneMarkers(pruned)
      }
    }
    else {
      loadError.value = true
    }
    loaded.value = true
    loading.value = false
  }

  /**
   * 습관 트래커 생성. 생성된 트래커를 목록에 append(응답이 authoritative — 전체 reload 대신).
   * 반환: 생성된 트래커(실패 시 null). 409(HABIT_LIMIT_EXCEEDED 등)는 호출부가 status 로 구분할 수
   * 있도록 `status` 를 함께 돌려준다.
   */
  async function create(
    title: string,
    friendUserId?: string | null,
  ): Promise<{ tracker: HabitTrackerResponse | null; status: number | null }> {
    // friendUserId 지정 시 서버가 수락된 invite 로 검증해 연동(양측 완주 반짝이 2배, req3 #3).
    // TODO(N-B5 스펙 머지 후): 친구 습관은 상대 수락 전 status=PENDING / partnerStatus=PENDING_SENT 로 온다.
    try {
      const { data, error, response } = await sdk.createHabit({
        client,
        body: { title, friendUserId: friendUserId ?? null },
      })
      if (error || !data) return { tracker: null, status: response?.status ?? null }
      const created = castData<HabitTrackerResponse>(data) ?? null
      if (created) trackers.value = [...trackers.value, created]
      return { tracker: created, status: response?.status ?? null }
    }
    catch {
      return { tracker: null, status: null }
    }
  }

  /**
   * 체크인. 응답의 갱신된 tracker 로 **해당 항목만 in-place 교체**(Codex MED#1: 전체 reload
   * 는 여러 습관 동시 체크인 시 stale 응답이 최신 상태를 덮어쓰는 race 유발 → 제거).
   * cycle 완료 시 반짝이 지급 정보 포함 응답 반환(실패 시 null). 지갑 반영은 호출부가 sparkleGranted 로 처리.
   */
  async function checkIn(trackerId: number): Promise<HabitCheckInResponse | null> {
    const { data, error } = await sdk.checkInHabit({
      client,
      path: { trackerId },
    })
    if (error || !data) return null
    const result = castData<HabitCheckInResponse>(data) ?? null
    if (result?.tracker) {
      trackers.value = trackers.value.map(t => (t.id === result.tracker.id ? result.tracker : t))
      if (result.cycleCompleted) {
        // 완주 마커 기록 — 응답 트래커는 이미 streak 0 / completedCycles+1 상태.
        const marker = markerOf(result.tracker)
        if (!cycleDoneMarkers.value.includes(marker)) {
          cycleDoneMarkers.value = [...cycleDoneMarkers.value, marker]
          writeCycleDoneMarkers(cycleDoneMarkers.value)
        }
      }
    }
    return result
  }

  /**
   * 습관 중단 (BROKEN 전환, 멱등). 성공 시 목록에서 제거 — 같은 친구와 새 공동 습관
   * 생성이 가능해진다 (2026-07-21 M1: 종료 수단 신설). 요청 대기 상태의 "요청 취소" 도 같은 호출.
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
    trackers.value = trackers.value.filter(t => t.id !== trackerId)
    clearCycleDone(trackerId)
    return true
  }

  /**
   * 7/7 완료 후 [기록 완료하기] — 보상을 수령하고 카드를 종료한다.
   * TODO(N-B5 스펙 머지 후): `POST /habits/{trackerId}/complete` 로 교체(보상은 그때 지급).
   * 폴백: 현행 백엔드는 7일째 체크인에서 이미 반짝이를 지급했으므로 남은 일은 카드 종료뿐 —
   * 중단(stop)으로 트래커를 닫는다(마커도 함께 정리).
   */
  async function complete(trackerId: number): Promise<boolean> {
    return stop(trackerId)
  }

  /**
   * 7/7 완료 후 [기록 1주일 연장 하기] — 같은 제목·친구 설정으로 새 7일 사이클을 시작한다.
   * TODO(N-B5 스펙 머지 후): `POST /habits/{trackerId}/extend` 로 교체(friend 면 상대 수락 필요 extendStatus).
   * 폴백: 현행 백엔드는 7일째 체크인에서 같은 트래커의 streak 를 0 으로 되돌려 다음 사이클을
   * 바로 이어가므로(ACTIVE 유지) 새 트래커를 만들 필요가 없고, 만들면 "활성 1개" 규칙과 친구쌍
   * 활성 1개 제한(409)에 걸린다. 따라서 완주 마커만 지워 같은 트래커를 기본 상태로 되돌린다.
   */
  async function extend(trackerId: number): Promise<boolean> {
    const exists = trackers.value.some(t => t.id === trackerId)
    if (!exists) return false
    clearCycleDone(trackerId)
    return true
  }

  return {
    trackers,
    loading,
    loaded,
    loadError,
    cycleDoneMarkers: readonly(cycleDoneMarkers),
    isCycleDone,
    load,
    create,
    checkIn,
    stop,
    complete,
    extend,
  }
}
