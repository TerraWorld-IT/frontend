import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { nextTick, ref } from 'vue'
import RecordPage from '~/pages/record/index.vue'
import { STORAGE_KEYS } from '~/utils/constants'
import { readDraft, writeDraft } from '~/utils/draftStorage'

const session = ref<{ data: { user: { id: string } } | null }>({ data: { user: { id: 'record-user' } } })
const mocks = vi.hoisted(() => ({
  sdk: { listCategories: vi.fn(), listFriends: vi.fn(), getGrowth: vi.fn(), createRecord: vi.fn() },
  routeLeave: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
  fetchMe: vi.fn(),
}))

vi.mock('vue-router', async () => ({ ...(await vi.importActual('vue-router')), onBeforeRouteLeave: mocks.routeLeave }))
vi.mock('~/stores/user', () => ({ useUserStore: () => ({ me: { userId: 'record-user' }, fetchMe: mocks.fetchMe }) }))
vi.mock('~/lib/auth-client', () => ({ authClient: { useSession: () => session } }))
vi.mock('~/lib/nativeDistanceTracker', () => ({
  isNativeDistanceTrackerAvailable: async () => false,
  DistanceTracker: { start: vi.fn(), stop: vi.fn(), drain: vi.fn() },
  stopNativeSession: vi.fn(),
  retryPendingNativeStops: vi.fn(async () => undefined),
}))
mockNuxtImport('useOpenApi', () => () => ({ sdk: mocks.sdk, client: {} }))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('useGtagEvents', () => () => ({ trackRecordCreated: vi.fn() }))
mockNuxtImport('useHabits', () => () => ({ trackers: ref([]), loaded: ref(true), loadError: ref(false), load: vi.fn() }))
mockNuxtImport('dismissKeyboard', () => vi.fn())

const wrappers: VueWrapper[] = []
async function mountPage() {
  const wrapper = await mountSuspended(RecordPage, { shallow: true })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

function state(wrapper: VueWrapper): Record<string, any> {
  return wrapper.vm.$.setupState
}

beforeEach(() => {
  vi.clearAllMocks()
  session.value = { data: { user: { id: 'record-user' } } }
  mocks.sdk.listCategories.mockResolvedValue({ data: { categories: [{ id: 1, name: '독서', isCustom: false }] } })
  mocks.sdk.listFriends.mockResolvedValue({ data: [] })
  mocks.sdk.getGrowth.mockResolvedValue({ data: { items: [] } })
  mocks.sdk.createRecord.mockResolvedValue({ data: null })
  mocks.fetchMe.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    watchPosition: vi.fn(() => 17), clearWatch: vi.fn(), getCurrentPosition: vi.fn(),
  } })
  localStorage.clear()
})

afterEach(() => {
  wrappers.splice(0).reverse().forEach(wrapper => wrapper.unmount())
  localStorage.clear()
})

describe('기록 입력 초안', () => {
  it('집중 설정 이름·시간을 라우트 이탈 후 복원하고 시작하면 삭제한다', async () => {
    const key = `${STORAGE_KEYS.DRAFT_FOCUS}record-user`
    const first = await mountPage()
    const current = state(first)
    current.openModal = 'focus'
    current.focusName = '논문 읽기'
    current.focusMinutes = 42
    expect(mocks.routeLeave.mock.calls[0]![0]()).toBe(true)
    expect(readDraft(key)).toEqual({ name: '논문 읽기', minutes: 42 })
    first.unmount()

    const second = await mountPage()
    const restored = state(second)
    restored.openModal = 'focus'
    expect(restored.focusName).toBe('논문 읽기')
    expect(restored.focusMinutes).toBe('42')
    expect(restored.focusPhase).toBe('setup')
    expect(readDraft(`${STORAGE_KEYS.DRAFT_FOCUS}another-user`)).toBeNull()
    restored.startFocus()
    expect(restored.focusPhase).toBe('running')
    expect(readDraft(key)).toBeNull()
  })

  it('문자열 집중 시간 초안도 복원하고 범위 밖 시간은 기본값을 사용한다', async () => {
    const key = `${STORAGE_KEYS.DRAFT_FOCUS}record-user`
    writeDraft(key, { name: '집중', minutes: '42' })
    const first = await mountPage()
    state(first).openModal = 'focus'
    expect(state(first).focusMinutes).toBe('42')
    first.unmount()

    writeDraft(key, { name: '집중', minutes: 181 })
    const second = await mountPage()
    state(second).openModal = 'focus'
    expect(state(second).focusMinutes).toBe('25')
  })

  it('거리 이름을 라우트 이탈 후 복원하고 측정 시작 시 삭제한다', async () => {
    const key = `${STORAGE_KEYS.DRAFT_DISTANCE}record-user`
    const first = await mountPage()
    const current = state(first)
    current.openModal = 'distance'
    current.distName = '저녁 산책'
    expect(mocks.routeLeave.mock.calls[0]![0]()).toBe(true)
    expect(readDraft(key)).toBe('저녁 산책')
    first.unmount()

    const second = await mountPage()
    const restored = state(second)
    restored.openModal = 'distance'
    expect(restored.distName).toBe('저녁 산책')
    expect(restored.distPhase).toBe('idle')
    await restored.startDistance()
    expect(restored.distPhase).toBe('tracking')
    expect(readDraft(key)).toBeNull()
  })

  it('계정이 바뀌면 이전 계정의 집중·거리 입력을 새 계정에 표시하지 않는다', async () => {
    const wrapper = await mountPage()
    const current = state(wrapper)
    current.openModal = 'focus'
    current.focusName = '첫 계정의 집중'
    current.focusMinutes = '12'
    session.value = { data: { user: { id: 'another-user' } } }
    await nextTick()
    expect(current.focusName).toBe('')
    expect(current.focusMinutes).toBe('25')
    expect(readDraft(`${STORAGE_KEYS.DRAFT_FOCUS}record-user`)).toEqual({ name: '첫 계정의 집중', minutes: '12' })

    current.openModal = 'distance'
    current.distName = '두 번째 계정의 산책'
    session.value = { data: { user: { id: 'record-user' } } }
    await nextTick()
    expect(current.distName).toBe('')
    expect(readDraft(`${STORAGE_KEYS.DRAFT_DISTANCE}another-user`)).toBe('두 번째 계정의 산책')
  })
})

describe('초기 자료 조회 잠금 범위', () => {
  it('친구 조회가 HTTP 오류여도 카테고리가 있으면 일상 기록을 저장한다', async () => {
    mocks.sdk.listFriends.mockResolvedValue({ error: { message: '실패' } })
    const wrapper = await mountPage()
    const current = state(wrapper)
    expect(current.friendLoadError).toBe(true)
    expect(current.loadError).toBe(false)
    const diaryButton = wrapper.findAll('button').find(button => button.attributes('aria-label') === '일기 기록 기록하기')!
    expect(diaryButton.attributes('disabled')).toBeUndefined()
    current.openModal = 'diary'
    current.diaryText = '오늘의 기록'
    await current.saveDiary()
    expect(mocks.sdk.createRecord).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ dailyType: 'DIARY', categoryId: 1 }) }))
  })

  it('친구 조회가 예외여도 혼자 습관을 시작할 수 있고 친구 요청만 잠근다', async () => {
    mocks.sdk.listFriends.mockRejectedValue(new Error('네트워크 오류'))
    const wrapper = await mountPage()
    const current = state(wrapper)
    current.openHabitCreate()
    expect(current.habitCreateOpen).toBe(true)
    current.habitCreateOpen = false
    current.mode = 'friend'
    current.openHabitCreate()
    expect(current.habitCreateOpen).toBe(false)
  })

  it('카테고리 조회 실패는 일상 기록만 잠그고 혼자 습관은 허용한다', async () => {
    mocks.sdk.listCategories.mockRejectedValue(new Error('네트워크 오류'))
    const wrapper = await mountPage()
    const current = state(wrapper)
    expect(current.loadError).toBe(true)
    expect(current.friendLoadError).toBe(false)
    const diaryButton = wrapper.findAll('button').find(button => button.attributes('aria-label') === '일기 기록 기록하기')!
    expect(diaryButton.attributes('disabled')).toBeDefined()
    current.openHabitCreate()
    expect(current.habitCreateOpen).toBe(true)
  })
})
