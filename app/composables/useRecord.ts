import type { ActivityRecord, CreateRecordPayload, RecordStats } from '~/types'

export function useRecord() {
  const { get, post, put, del } = useApi()

  const records = ref<ActivityRecord[]>([])
  const loading = ref(false)

  async function fetchRecords(params?: { from?: string; to?: string; categoryId?: number }) {
    loading.value = true
    try {
      records.value = await get<ActivityRecord[]>('/records', params as Record<string, unknown>)
    } finally {
      loading.value = false
    }
  }

  async function fetchToday() {
    records.value = await get<ActivityRecord[]>('/records/today')
  }

  async function createRecord(payload: CreateRecordPayload) {
    const record = await post<ActivityRecord>('/records', payload)
    records.value.unshift(record)
    return record
  }

  async function updateRecord(id: number, payload: Partial<CreateRecordPayload>) {
    return put<ActivityRecord>(`/records/${id}`, payload)
  }

  async function deleteRecord(id: number) {
    await del(`/records/${id}`)
    records.value = records.value.filter(r => r.id !== id)
  }

  async function fetchStats() {
    return get<RecordStats>('/records/stats')
  }

  async function fetchCalendar(yearMonth: string) {
    return get<ActivityRecord[]>(`/records/calendar/${yearMonth}`)
  }

  return {
    records: readonly(records),
    loading: readonly(loading),
    fetchRecords, fetchToday, createRecord, updateRecord, deleteRecord, fetchStats, fetchCalendar,
  }
}
