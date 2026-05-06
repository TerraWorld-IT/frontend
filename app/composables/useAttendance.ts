import type { AttendanceCheckInResponse, AttendanceResponse } from '@terraworld-it/openapi-frontend'

/**
 * 출석 체크인 composable.
 * - state(): 오늘 수령 여부 + streak + 다음 보상
 * - checkIn(): 하루 1회 호출. 이미 수령 시 409 (sdk error)
 *
 * 사용 예 (홈 우측 상단 위젯에서):
 *   const { state, checkIn, refresh } = useAttendance()
 *   await refresh()
 *   if (!state.value?.today) await checkIn()
 */
export function useAttendance() {
  const { sdk, client } = useOpenApi()
  const state = ref<AttendanceResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      const res = await sdk.getAttendanceState({ client })
      if (res.error) throw res.error
      state.value = castData<AttendanceResponse>(res.data) ?? null
    } catch (e) {
      error.value = errMsg(e, '출석 정보를 불러오지 못했습니다')
    } finally {
      loading.value = false
    }
  }

  async function checkIn(): Promise<AttendanceCheckInResponse | null> {
    loading.value = true
    error.value = null
    try {
      const res = await sdk.checkInAttendance({ client })
      if (res.error) throw res.error
      const result = castData<AttendanceCheckInResponse>(res.data) ?? null
      if (result) state.value = result.attendance
      return result
    } catch (e) {
      error.value = errMsg(e, '출석 체크인 실패')
      return null
    } finally {
      loading.value = false
    }
  }

  return { state, loading, error, refresh, checkIn }
}
