import type {
  HabitCheckInResponse,
  HabitListResponse,
  HabitTrackerResponse,
} from '@terraworld-it/openapi-frontend'

/**
 * 습관(Habit) 트래커 composable — 낙서장 리팩토링 req 1/3/9.
 *
 * 백엔드 `GET/POST /habits`, `POST /habits/{id}/checkin` 실 배선.
 * 7일 cycle 을 연속 체크인하면 반짝이(SPARKLE)를 지급받는다(육성 재화).
 * 페이지는 이 composable 의 상태/액션만 소비하고 API 세부는 여기 캡슐화(구조 분해 req7).
 *
 * 사용:
 *   const { trackers, loading, load, create, checkIn } = useHabits()
 *   onMounted(load)
 */
export function useHabits() {
  const { sdk, client } = useOpenApi()

  // FE-10: 교체-대입 전용 리스트(load/create/checkIn 모두 새 배열 재할당) — deep reactivity 불필요.
  const trackers = shallowRef<HabitTrackerResponse[]>([])
  const loading = ref<boolean>(false)
  const loaded = ref<boolean>(false)
  // Codex MED#3: 로드 실패(500/401)를 empty-state 와 구분 — 페이지가 에러 표시.
  const loadError = ref<boolean>(false)

  /** 활성 습관 목록 조회. */
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
   * 반환: 생성된 트래커(실패 시 null).
   */
  async function create(
    title: string,
    friendUserId?: string | null,
  ): Promise<HabitTrackerResponse | null> {
    // friendUserId 지정 시 서버가 수락된 invite 로 검증해 연동(양측 완주 반짝이 2배, req3 #3).
    const { data, error } = await sdk.createHabit({
      client,
      body: { title, friendUserId: friendUserId ?? null },
    })
    if (error || !data) return null
    const created = castData<HabitTrackerResponse>(data) ?? null
    if (created) trackers.value = [...trackers.value, created]
    return created
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
    }
    return result
  }

  /**
   * 습관 중단 (BROKEN 전환, 멱등). 성공 시 목록에서 제거 — 같은 친구와 새 공동 습관
   * 생성이 가능해진다 (2026-07-21 M1: 종료 수단 신설).
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
    return true
  }

  return { trackers, loading, loaded, loadError, load, create, checkIn, stop }
}
