import type { ActivityRecord, CreateRecordPayload, RecordStats } from '~/types'

export function useRecord() {
  const { sdk, client } = useOpenApi()

  const records = ref<ActivityRecord[]>([])
  const loading = ref(false)

  async function fetchRecords(params?: { from?: string; to?: string; categoryId?: number }) {
    loading.value = true
    try {
      const { data, error } = await sdk.listRecords({ client, query: params })
      if (error) throw error
      records.value = (data as ActivityRecord[]) ?? []
    } finally {
      loading.value = false
    }
  }

  async function fetchToday() {
    const { data, error } = await sdk.listRecords({ client, query: { today: true } })
    if (error) throw error
    records.value = (data as ActivityRecord[]) ?? []
  }

  async function createRecord(payload: CreateRecordPayload) {
    const { data, error } = await sdk.createRecord({ client, body: payload })
    if (error) throw error
    const record = data as ActivityRecord
    records.value.unshift(record)
    return record
  }

  async function deleteRecord(id: number) {
    const { error } = await sdk.deleteRecord({ client, path: { recordId: id } })
    if (error) throw error
    records.value = records.value.filter(r => r.id !== id)
  }

  async function fetchStats() {
    const { data, error } = await sdk.getRecordStatistics({ client })
    if (error) throw error
    return data as RecordStats
  }

  return {
    records: readonly(records),
    loading: readonly(loading),
    fetchRecords, fetchToday, createRecord, deleteRecord, fetchStats,
  }
}
