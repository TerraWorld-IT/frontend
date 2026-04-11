import type {
  CreateRecordResponse,
  PagedRecordResponse,
  RecordResponse,
  StatisticsResponse,
} from '@terraworld-it/openapi-frontend'

export function useRecord() {
  const { sdk, client } = useOpenApi()

  const records = ref<RecordResponse[]>([])
  const loading = ref(false)

  async function fetchRecords(params?: { categoryId?: number; year?: number; month?: number; page?: number; size?: number }) {
    loading.value = true
    try {
      const { data, error } = await sdk.listRecords({ client, query: params })
      if (error) throw error
      const paged = data as PagedRecordResponse | undefined
      records.value = paged?.content ?? []
    } finally {
      loading.value = false
    }
  }

  async function fetchToday() {
    // SDK spec does not have a 'today' filter — use current date year/month + page
    const now = new Date()
    const { data, error } = await sdk.listRecords({
      client,
      query: { year: now.getFullYear(), month: now.getMonth() + 1, page: 0, size: 50 },
    })
    if (error) throw error
    const paged = data as PagedRecordResponse | undefined
    // Client-side filter for today only
    const todayStr = now.toISOString().slice(0, 10)
    records.value = (paged?.content ?? []).filter(r => r.recordedDate?.startsWith(todayStr))
  }

  async function createRecord(payload: { categoryId: number; duration?: number | null; note?: string | null }) {
    const { data, error } = await sdk.createRecord({ client, body: payload })
    if (error) throw error
    const result = data as CreateRecordResponse | undefined
    if (result?.record) {
      records.value.unshift(result.record)
    }
    return result
  }

  async function deleteRecord(id: number) {
    const { error } = await sdk.deleteRecord({ client, path: { recordId: id } })
    if (error) throw error
    records.value = records.value.filter(r => r.id !== id)
  }

  async function fetchStats() {
    const { data, error } = await sdk.getRecordStatistics({ client })
    if (error) throw error
    return data as StatisticsResponse | undefined
  }

  return {
    records: readonly(records),
    loading: readonly(loading),
    fetchRecords, fetchToday, createRecord, deleteRecord, fetchStats,
  }
}
