import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import RecordPage from '~/pages/record/index.vue'

const mocks = vi.hoisted(() => ({
  sdk: { listCategories: vi.fn(), listFriends: vi.fn(), getGrowth: vi.fn(), createRecord: vi.fn() },
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
  review: vi.fn(), track: vi.fn(), fetchMe: vi.fn(), routeLeave: vi.fn(),
}))
vi.mock('vue-router', async () => ({ ...(await vi.importActual('vue-router')), onBeforeRouteLeave: mocks.routeLeave }))
vi.mock('~/stores/user', () => ({ useUserStore: () => ({ me: { userId: 'record-user' }, fetchMe: mocks.fetchMe }) }))
vi.mock('~/lib/auth-client', () => ({ authClient: { useSession: () => ref({ data: { user: { id: 'record-user' } } }) } }))
mockNuxtImport('useOpenApi', () => () => ({ sdk: mocks.sdk, client: {} }))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('useGtagEvents', () => () => ({ trackRecordCreated: mocks.track }))
mockNuxtImport('useAppReview', () => () => ({ maybeRequestReview: mocks.review }))
mockNuxtImport('useHabits', () => () => ({ trackers: ref([]), loaded: ref(true), loadError: ref(false), load: vi.fn() }))
mockNuxtImport('dismissKeyboard', () => vi.fn())

let wrapper: VueWrapper | undefined
async function mountPage() {
  wrapper = await mountSuspended(RecordPage, { shallow: true })
  await flushPromises()
  return (wrapper.vm.$ as unknown as { setupState: Record<string, any> }).setupState
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.sdk.listCategories.mockResolvedValue({ data: { categories: [{ id: 1, name: '독서', isCustom: false }] } })
  mocks.sdk.listFriends.mockResolvedValue({ data: [] })
  mocks.sdk.getGrowth.mockResolvedValue({ data: { items: [] } })
  mocks.sdk.createRecord.mockReset().mockResolvedValue({ data: null })
  mocks.fetchMe.mockResolvedValue(undefined)
  mocks.review.mockReset().mockResolvedValue(undefined)
})
afterEach(() => { wrapper?.unmount(); localStorage.clear() })

describe('기록 저장 성공 후 평점 요청', () => {
  it('평점 응답을 기다리지 않고 기존 보상·분석·성공 반환을 유지한다', async () => {
    const reward = { basicCoins: 3, categoryTokens: 2 }
    mocks.sdk.createRecord.mockResolvedValue({ data: { record: { categoryName: '독서' }, reward } })
    mocks.review.mockReturnValue(new Promise(() => {}))
    const state = await mountPage()
    await expect(state.saveDailyRecord('DIARY', { note: '기록' })).resolves.toEqual({ ok: true, reward, growthAdvanced: false })
    expect(mocks.review).toHaveBeenCalledTimes(1)
    expect(mocks.track).toHaveBeenCalledWith({ categoryId: 1, categoryName: '독서', basicCoins: 3, categoryTokens: 2 })
    expect(mocks.fetchMe).toHaveBeenCalledWith(true)
    expect(mocks.toast.error).not.toHaveBeenCalled()
  })

  it('보상 없는 성공에서도 요청한다', async () => {
    const state = await mountPage()
    expect(await state.saveDailyRecord('DIARY', {})).toEqual({ ok: true, reward: null, growthAdvanced: false })
    expect(mocks.review).toHaveBeenCalledTimes(1)
    expect(mocks.track).not.toHaveBeenCalled()
  })

  it.each(['api', 'throw', 'category', 'duplicate'])('%s 실패·중복 경로에서는 요청하지 않는다', async (failure) => {
    const state = await mountPage()
    if (failure === 'api') mocks.sdk.createRecord.mockResolvedValue({ error: { message: '실패' } })
    if (failure === 'throw') mocks.sdk.createRecord.mockRejectedValue(new Error('실패'))
    if (failure === 'category') state.categories = []
    if (failure === 'duplicate') state.submitting = true
    expect(await state.saveDailyRecord('DIARY', {})).toEqual({ ok: false, reward: null, growthAdvanced: false })
    expect(mocks.review).not.toHaveBeenCalled()
    expect(mocks.track).not.toHaveBeenCalled()
  })
})
