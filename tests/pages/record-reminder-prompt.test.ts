import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import RecordPage from '~/pages/record/index.vue'

const mocks = vi.hoisted(() => ({
  sdk: { listCategories: vi.fn(), listFriends: vi.fn(), getGrowth: vi.fn(), createRecord: vi.fn() },
  checkIn: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
  review: vi.fn(), refresh: vi.fn(), claimPrompt: vi.fn(), fetchMe: vi.fn(),
}))
vi.mock('vue-router', async () => ({ ...(await vi.importActual('vue-router')), onBeforeRouteLeave: vi.fn() }))
vi.mock('~/stores/user', () => ({ useUserStore: () => ({ me: { userId: 'record-user' }, fetchMe: mocks.fetchMe }) }))
vi.mock('~/lib/auth-client', () => ({ authClient: { useSession: () => ref({ data: { user: { id: 'record-user' } } }) } }))
mockNuxtImport('useOpenApi', () => () => ({ sdk: mocks.sdk, client: {} }))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('useGtagEvents', () => () => ({ trackRecordCreated: vi.fn() }))
mockNuxtImport('useAppReview', () => () => ({ maybeRequestReview: mocks.review }))
mockNuxtImport('useDailyReminder', () => () => ({ refresh: mocks.refresh, claimPrompt: mocks.claimPrompt }))
mockNuxtImport('useHabits', () => () => ({ trackers: ref([]), loaded: ref(true), loadError: ref(false), load: vi.fn(), checkIn: mocks.checkIn }))
mockNuxtImport('dismissKeyboard', () => vi.fn())

let wrapper: VueWrapper | undefined
async function mountPage() {
  wrapper = await mountSuspended(RecordPage, { shallow: true })
  await flushPromises()
  return (wrapper.vm.$ as unknown as { setupState: Record<string, any> }).setupState
}
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mocks.sdk.listCategories.mockResolvedValue({ data: { categories: [{ id: 1, name: '독서', isCustom: false }] } })
  mocks.sdk.listFriends.mockResolvedValue({ data: [] })
  mocks.sdk.getGrowth.mockResolvedValue({ data: { items: [] } })
  mocks.sdk.createRecord.mockReset().mockResolvedValue({ data: null })
  mocks.fetchMe.mockResolvedValue(undefined)
  mocks.review.mockReset().mockResolvedValue(undefined)
  mocks.refresh.mockReset().mockResolvedValue(undefined)
  mocks.claimPrompt.mockReset().mockReturnValue(true)
  mocks.checkIn.mockReset().mockResolvedValue({ data: { cycleCompleted: false } })
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers(); localStorage.clear() })

describe('저장 완료 후 알림 제안 순서', () => {
  it('체크인 성공은 오늘 알림을 갱신하고 실패는 갱신하지 않는다', async () => {
    const state = await mountPage()
    const tracker = { id: 7, status: 'ACTIVE' }

    await state.onCheckIn(tracker)
    expect(mocks.refresh).toHaveBeenCalledOnce()
    expect(mocks.refresh).toHaveBeenCalledWith(true)
    expect(mocks.toast.success).toHaveBeenCalledWith('오늘 체크인 완료')

    mocks.refresh.mockClear()
    mocks.checkIn.mockResolvedValueOnce({ data: null, status: 409, code: 'HABIT_NOT_ACTIVE' })
    await state.onCheckIn(tracker)
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(mocks.toast.info).toHaveBeenCalledWith('친구가 수락하면 기록이 시작돼요')
  })

  it('완료 피드백과 시트가 닫힌 뒤 제안하고 한 번만 확보한다', async () => {
    const state = await mountPage()
    vi.useFakeTimers()
    await state.saveDailyRecord('DIARY', {})
    state.completeToast = { kind: 'sun', count: null, growthAdvanced: true }
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.refresh).toHaveBeenCalledWith(true)
    expect(mocks.claimPrompt).not.toHaveBeenCalled()
    state.completeToast = null
    state.openModal = 'diary'
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.claimPrompt).not.toHaveBeenCalled()
    state.openModal = null
    await flushPromises()
    await vi.advanceTimersByTimeAsync(350)
    expect(state.reminderPromptOpen).toBe(true)
    expect(mocks.claimPrompt).toHaveBeenCalledOnce()
  })

  it('같은 저장에서 평점 요청이 진행되면 제안하지 않는다', async () => {
    mocks.review.mockImplementation(async () => {
      localStorage.setItem('tw:app-review:record-user', JSON.stringify({ days: [], requestedVersions: ['1.0.4'] }))
    })
    const state = await mountPage()
    vi.useFakeTimers()
    expect(await state.saveDailyRecord('DIARY', {})).toMatchObject({ ok: true })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.claimPrompt).not.toHaveBeenCalled()
    expect(state.reminderPromptOpen).toBe(false)
  })

  it('이미 제안했거나 미지원이면 열지 않는다', async () => {
    mocks.claimPrompt.mockReturnValue(false)
    const state = await mountPage()
    vi.useFakeTimers()
    await state.saveDailyRecord('DIARY', {})
    await flushPromises()
    await vi.advanceTimersByTimeAsync(350)
    expect(state.reminderPromptOpen).toBe(false)
  })

  it('저장 실패에는 재예약·제안을 하지 않고 보조 실패는 성공을 바꾸지 않는다', async () => {
    const state = await mountPage()
    mocks.sdk.createRecord.mockResolvedValueOnce({ error: { message: '실패' } })
    expect(await state.saveDailyRecord('DIARY', {})).toMatchObject({ ok: false })
    expect(mocks.refresh).not.toHaveBeenCalled()
    mocks.refresh.mockRejectedValueOnce(new Error('native failure'))
    expect(await state.saveDailyRecord('DIARY', {})).toMatchObject({ ok: true })
    await flushPromises()
  })

  it('페이지를 떠나면 대기 중인 제안을 취소한다', async () => {
    const state = await mountPage()
    vi.useFakeTimers()
    await state.saveDailyRecord('DIARY', {})
    await flushPromises()
    wrapper!.unmount()
    wrapper = undefined
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.claimPrompt).not.toHaveBeenCalled()
  })
})
