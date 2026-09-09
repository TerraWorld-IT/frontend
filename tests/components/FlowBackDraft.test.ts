import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref, type Component } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia } from 'pinia'
import RecordPage from '~/pages/record/index.vue'
import CalendarPage from '~/pages/calendar/index.vue'
import LoginPage from '~/pages/auth/login.vue'
import HomePage from '~/pages/index.vue'
import AppUpdateGate from '~/components/common/AppUpdateGate.vue'
import { useBackButtonStack } from '~/composables/useBackButtonStack'
import { STORAGE_KEYS } from '~/utils/constants'
import { readDraft, writeDraft } from '~/utils/draftStorage'
import type { UserMeResponse } from '@terraworld-it/openapi-frontend'

const profile = ref<UserMeResponse | null>(null)
const session = ref<{ data: { user: { id: string } } | null }>({ data: null })

const mocks = vi.hoisted(() => ({
  sdk: Object.fromEntries(['getMe', 'listCategories', 'listFriends', 'createRecord', 'getRecordStatistics', 'listRecords', 'getNote', 'saveNote', 'deleteNote', 'getUnreadNotificationCount'].map(key => [key, vi.fn()])),
  user: { me: { userId: 'u1', nickname: '테스트', currency: {}, ownedItems: [], entitlements: { freePlacement: true } }, fetchMe: vi.fn(), updateCurrency: vi.fn() },
  home: { snapshot: { terrarium: { placedItems: [], maxSlots: 6 }, freePlacements: { items: [] } }, fetch: vi.fn(), invalidate: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  routeLeave: vi.fn(), signIn: vi.fn(), signUp: vi.fn(), getSession: vi.fn(), navigate: vi.fn(),
  createHabit: vi.fn(),
  nativeStart: vi.fn(), nativeStop: vi.fn(), nativeAvailable: false,
}))
vi.mock('vue-router', async () => ({ ...(await vi.importActual('vue-router')), onBeforeRouteLeave: mocks.routeLeave }))
vi.mock('~/stores/user', () => ({ useUserStore: () => ({ ...mocks.user, get me() { return profile.value } }) }))
vi.mock('~/stores/items', () => ({ useItemsStore: () => ({ items: [], fetchAll: vi.fn() }) }))
vi.mock('~/stores/homeSnapshot', () => ({ useHomeSnapshotStore: () => mocks.home }))
vi.mock('~/lib/auth-client', () => ({ authClient: { useSession: () => session, getSession: mocks.getSession, signIn: { email: mocks.signIn }, signUp: { email: mocks.signUp } } }))
vi.mock('~/lib/nativeDistanceTracker', () => ({
  isNativeDistanceTrackerAvailable: async () => mocks.nativeAvailable,
  DistanceTracker: { start: mocks.nativeStart, stop: mocks.nativeStop, drain: vi.fn(async () => ({ fixes: [] })) },
}))
mockNuxtImport('useOpenApi', () => () => ({ sdk: mocks.sdk, client: {} }))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('dismissKeyboard', () => vi.fn())
mockNuxtImport('navigateTo', () => mocks.navigate)
mockNuxtImport('useGtagEvents', () => () => new Proxy({}, { get: () => vi.fn() }))
mockNuxtImport('useNative', () => () => ({ isNative: false, hapticImpact: vi.fn(), registerPushIfGranted: vi.fn(async () => undefined) }))
mockNuxtImport('useAuth', () => () => ({ isLoggedIn: ref<boolean>(true), loadJwt: vi.fn(async () => 'test-token') }))
mockNuxtImport('useHabits', () => () => ({ trackers: ref<never[]>([]), loaded: ref<boolean>(true), loadError: ref<boolean>(false), load: vi.fn(), create: mocks.createHabit }))
mockNuxtImport('useAttendance', () => () => ({ state: ref<null>(null), loading: ref<boolean>(false), error: ref<string | null>(null), refresh: vi.fn() }))
mockNuxtImport('useTier', () => () => ({ state: ref<null>(null), catalog: ref<null>(null), loading: ref<boolean>(false), loadError: ref<boolean>(false), load: vi.fn() }))
mockNuxtImport('useBgm', () => () => ({ enabled: ref<boolean>(false), playing: ref<boolean>(false), hasSource: false, play: vi.fn(), stop: vi.fn() }))
mockNuxtImport('useAdMob', () => () => ({ isNative: false, isAndroid: false, isIos: false }))
mockNuxtImport('useAppUpdate', () => () => ({ updateRequired: ref<boolean>(true), isNative: false, check: vi.fn(), openStore: vi.fn() }))

const wrappers: VueWrapper[] = []
async function mountPage(component: Component, actualDialogs = false) {
  const wrapper = await mountSuspended(component, {
    shallow: true, attachTo: document.body,
    global: { renderStubDefaultSlot: true, stubs: actualDialogs ? { CommonBottomSheet: false, RecordConfirmDialog: false, RecordHabitCreateSheet: false } : {} },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

// 기존 T2yInteractions와 같은 실제 SFC 상태 접근으로 외부 I/O만 대체한다.
function state(wrapper: VueWrapper): Record<string, any> {
  return wrapper.vm.$.setupState
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.user.me.userId = 'u1'
  profile.value = mocks.user.me as UserMeResponse
  session.value = { data: null }
  mocks.nativeAvailable = false
  mocks.nativeStart.mockResolvedValue(undefined)
  mocks.nativeStop.mockResolvedValue({ fixes: [] })
  for (const fn of Object.values(mocks.sdk)) fn.mockReset().mockResolvedValue({ data: [], error: undefined })
  mocks.sdk.listCategories!.mockResolvedValue({ data: { categories: [{ id: 1, name: '독서', isCustom: false }] } })
  mocks.sdk.listRecords!.mockResolvedValue({ data: { content: [], totalPages: 1 } })
  mocks.sdk.getRecordStatistics!.mockResolvedValue({ data: { totalRecords: 0, byCategory: [] } })
  mocks.sdk.getNote!.mockResolvedValue({ data: { note: '서버 메모' } })
  mocks.user.fetchMe.mockReset().mockResolvedValue(undefined)
  mocks.getSession.mockResolvedValue({ data: null })
  mocks.signIn.mockResolvedValue({ error: null })
  mocks.signUp.mockResolvedValue({ error: null })
  mocks.createHabit.mockResolvedValue({ data: { title: '습관 초안' } })
  vi.stubGlobal('GeolocationPositionError', { PERMISSION_DENIED: 1 })
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    watchPosition: vi.fn(() => 17), clearWatch: vi.fn(), getCurrentPosition: vi.fn((success) => success({ coords: { latitude: 0, longitude: 0 } })),
  } })
  localStorage.clear()
})
afterEach(() => {
  wrappers.splice(0).reverse().forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('PR-A 뒤로가기', () => {
  it.each(['X', 'back', '백드롭', 'ESC'])('거리 시트 %s는 실제 공통 시트에서 확인창을 열고 취소 시 시트를 유지한다', async (exit) => {
    const s = state(await mountPage(RecordPage, true))
    s.openModal = 'distance'
    await nextTick()
    s.distPhase = 'done'
    await nextTick()
    if (exit === 'back') expect(useBackButtonStack().popTopBackHandler()).toBe(true)
    else if (exit === 'ESC') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    else if (exit === '백드롭') document.querySelector<HTMLElement>('.sheet-backdrop')!.click()
    else document.querySelector<HTMLButtonElement>('[aria-label="거리 기록"] [aria-label="닫기"]')!.click()
    await nextTick()
    expect(s.distDiscardOpen).toBe(true)
    expect(s.openModal).toBe('distance')
    expect(document.querySelector('[aria-label="거리 기록을 종료할까요?"]')).not.toBeNull()
    expect(useBackButtonStack().popTopBackHandler()).toBe(true)
    await nextTick()
    expect(s.distDiscardOpen).toBe(false)
    expect(s.openModal).toBe('distance')
  })

  it.each(['healing', 'manage'])('%s 인트로 back은 홈으로 취소하고 등록을 해제한다', async (mode) => {
    const s = state(await mountPage(HomePage))
    s.introMode = mode
    await nextTick()
    expect(useBackButtonStack().popTopBackHandler()).toBe(true)
    await nextTick()
    expect(s.introMode).toBeNull()
    expect(s.healingMode).toBe(false)
    expect(s.editMode).toBe(false)
    expect(localStorage.getItem(STORAGE_KEYS.HEALING_INTRO_SEEN)).toBeNull()
    expect(useBackButtonStack().popTopBackHandler()).toBe(false)
  })

  it('힐링 완료 후 두 번째 진입만 인트로를 건너뛴다', async () => {
    const s = state(await mountPage(HomePage))
    s.enterHealingMode()
    expect(s.introMode).toBe('healing')
    await s.onHealingIntroDone()
    expect(s.healingMode).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.HEALING_INTRO_SEEN)).toBe('1')
    s.healingMode = false
    await nextTick()
    s.enterHealingMode()
    expect(s.introMode).toBeNull()
    expect(s.healingMode).toBe(true)
  })

  it('강제 업데이트가 back을 반복 소비하고 해제·언마운트 후 등록을 제거한다', async () => {
    const w = await mountPage(AppUpdateGate)
    const s = state(w)
    expect(useBackButtonStack().popTopBackHandler()).toBe(true)
    expect(useBackButtonStack().popTopBackHandler()).toBe(true)
    expect(s.updateRequired).toBe(true)
    s.updateRequired = false
    await nextTick()
    expect(useBackButtonStack().popTopBackHandler()).toBe(false)
    s.updateRequired = true
    await nextTick()
    w.unmount()
    wrappers.splice(wrappers.indexOf(w), 1)
    expect(useBackButtonStack().popTopBackHandler()).toBe(false)
  })

  it('캘린더 메뉴 back과 시트 공통 close는 메뉴만 닫고 다음 close가 시트를 닫는다', async () => {
    const w = await mountPage(CalendarPage)
    const s = state(w)
    await s.selectDay(10)
    s.openMenuId = 1
    await nextTick()
    expect(useBackButtonStack().popTopBackHandler()).toBe(true)
    await nextTick()
    expect(s.openMenuId).toBeNull()
    expect(s.selectedDate).not.toBeNull()
    s.openMenuId = 2
    await nextTick()
    w.getComponent({ name: 'CommonBottomSheet' }).vm.$emit('close')
    await nextTick()
    expect(s.openMenuId).toBeNull()
    expect(s.selectedDate).not.toBeNull()
    w.getComponent({ name: 'CommonBottomSheet' }).vm.$emit('close')
    await nextTick()
    expect(s.selectedDate).toBeNull()
    expect(useBackButtonStack().popTopBackHandler()).toBe(false)
  })

  it('거리 tracking 종료 확인은 네이티브 중단 후 done 시트에 남고 다음 폐기 확인으로 이탈한다', async () => {
    mocks.nativeAvailable = true
    const w = await mountPage(RecordPage)
    const s = state(w)
    s.openModal = 'distance'
    await nextTick()
    await s.startDistance()
    const guard = mocks.routeLeave.mock.calls[0]![0]
    const firstLeave = guard()
    await nextTick()
    expect(s.distDiscardOpen).toBe(true)
    const confirm = w.findAllComponents({ name: 'RecordConfirmDialog' })[1]!
    expect(confirm.props('title')).toBe('거리 측정을 종료할까요?')
    let stop!: (value: { fixes: never[] }) => void
    mocks.nativeStop.mockReturnValueOnce(new Promise(resolve => { stop = resolve }))
    const stopping = s.confirmDistanceDiscard()
    await flushPromises()
    expect(s.submitting).toBe(true)
    s.cancelDiscard()
    expect(s.distDiscardOpen).toBe(true)
    expect(guard()).toBe(false)
    stop({ fixes: [] })
    await stopping
    expect(await firstLeave).toBe(false)
    expect(mocks.nativeStop).toHaveBeenCalledOnce()
    expect(s.distPhase).toBe('done')
    expect(s.openModal).toBe('distance')
    const secondLeave = guard()
    await nextTick()
    expect(confirm.props('confirmText')).toBe('저장하지 않고 종료')
    await s.confirmDistanceDiscard()
    expect(await secondLeave).toBe(true)
    expect(s.openModal).toBeNull()
    expect(s.distPhase).toBe('idle')
  })

  it('거리 취소와 집중 이탈 취소는 시트를 보존하고 집중 폐기 확인만 이동을 허용한다', async () => {
    const s = state(await mountPage(RecordPage))
    s.openModal = 'distance'
    s.distPhase = 'done'
    await nextTick()
    s.onSheetClose()
    s.cancelDiscard()
    expect(s.openModal).toBe('distance')
    s.openModal = 'focus'
    await nextTick()
    s.focusPhase = 'running'
    const guard = mocks.routeLeave.mock.calls[0]![0]
    const cancel = guard()
    s.cancelDiscard()
    expect(await cancel).toBe(false)
    expect(s.focusPhase).toBe('running')
    const confirm = guard()
    s.confirmFocusDiscard()
    expect(await confirm).toBe(true)
    expect(s.openModal).toBeNull()
  })
})

describe('PR-A 이탈 초안', () => {
  it.each(['reject', 'error', 'pending'])('프로필 보조 조회가 %s여도 기록 목록을 반영하고 로딩을 해제한다', async (result) => {
    profile.value = null
    const { useUserStore } = await vi.importActual<typeof import('~/stores/user')>('~/stores/user')
    const user = useUserStore(createPinia())
    mocks.user.fetchMe.mockImplementation(() => user.fetchMe())
    let resolve!: (value: unknown) => void
    if (result === 'reject') mocks.sdk.getMe!.mockRejectedValueOnce(new Error('getMe failed'))
    else if (result === 'error') mocks.sdk.getMe!.mockResolvedValueOnce({ error: { message: 'getMe failed' } })
    else mocks.sdk.getMe!.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const friends = [{ userId: 'friend-1', nickname: '친구' }]
    mocks.sdk.listFriends!.mockResolvedValueOnce({ data: friends })
    const s = state(await mountPage(RecordPage))
    expect(mocks.sdk.getMe).toHaveBeenCalledOnce()
    expect(s.categories).toEqual([{ id: 1, name: '독서', isCustom: false }])
    expect(s.friends).toEqual(friends)
    expect(s.loadError).toBe(false)
    expect(s.initialLoading).toBe(false)
    s.openHabitCreate()
    expect(s.habitCreateOpen).toBe(true)
    expect(mocks.toast.error).not.toHaveBeenCalled()
    if (result === 'pending') {
      expect(user.loading).toBe(true)
      resolve({ data: mocks.user.me })
      await flushPromises()
      expect(user.loading).toBe(false)
    }
  })

  it.each(['reject', 'error', 'pending'])('프로필 보조 조회가 %s여도 캘린더 통계를 반영하고 로딩을 해제한다', async (result) => {
    profile.value = null
    const { useUserStore } = await vi.importActual<typeof import('~/stores/user')>('~/stores/user')
    const user = useUserStore(createPinia())
    mocks.user.fetchMe.mockImplementation(() => user.fetchMe())
    let resolve!: (value: unknown) => void
    if (result === 'reject') mocks.sdk.getMe!.mockRejectedValueOnce(new Error('getMe failed'))
    else if (result === 'error') mocks.sdk.getMe!.mockResolvedValueOnce({ error: { message: 'getMe failed' } })
    else mocks.sdk.getMe!.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const statistics = { totalRecords: 7, byCategory: [] }
    mocks.sdk.getRecordStatistics!.mockResolvedValueOnce({ data: statistics })
    const s = state(await mountPage(CalendarPage))
    expect(mocks.sdk.getMe).toHaveBeenCalledOnce()
    expect(s.stats).toEqual(statistics)
    expect(s.fetchError).toBeNull()
    expect(s.pending).toBe(false)
    expect(mocks.toast.error).not.toHaveBeenCalled()
    if (result === 'pending') {
      expect(user.loading).toBe(true)
      resolve({ data: mocks.user.me })
      await flushPromises()
      expect(user.loading).toBe(false)
    }
  })

  it.each(['new submitted', '  new submitted  ', ''])('복원한 메모를 수정해 저장(%s)하면 소유한 옛 초안을 삭제하고 재진입 시 편집하지 않는다', async (submitted) => {
    const first = await mountPage(CalendarPage)
    const original = state(first)
    await original.selectDay(10)
    original.startEdit()
    original.editingNoteText = 'old draft'
    original.closeSheet()
    const key = `${STORAGE_KEYS.DRAFT_NOTE_PREFIX}u1.${original.dateKey(10)}`
    expect(readDraft(key)).toBe('old draft')
    first.unmount()
    wrappers.splice(wrappers.indexOf(first), 1)
    const restored = await mountPage(CalendarPage)
    const s = state(restored)
    await s.selectDay(10)
    expect(s.editingNoteText).toBe('old draft')
    expect(s.isEditingNote).toBe(true)
    s.editingNoteText = submitted
    await s.saveNote()
    expect(readDraft(key)).toBeNull()
    expect(localStorage.getItem(key)).toBeNull()
    s.closeSheet()
    restored.unmount()
    wrappers.splice(wrappers.indexOf(restored), 1)
    mocks.sdk.getNote!.mockResolvedValueOnce({ data: { note: submitted.trim() } })
    const next = state(await mountPage(CalendarPage))
    await next.selectDay(10)
    expect(next.editingNoteText).toBe(submitted.trim())
    expect(next.isEditingNote).toBe(false)
    expect(readDraft(key)).toBeNull()
  })

  it('프로필 없이 세션만 있는 직접 진입에서 일기와 습관 이름을 닫기 저장하고 재마운트 복원한다', async () => {
    profile.value = null
    session.value = { data: { user: { id: 'session-user' } } }
    const w = await mountPage(RecordPage, true)
    const s = state(w)
    s.openModal = 'diary'
    await nextTick()
    s.diaryTitle = '직접 진입'
    s.diaryText = '일기 입력'
    s.onSheetClose()
    await nextTick()
    expect(readDraft(`${STORAGE_KEYS.DRAFT_DIARY}session-user`)).toEqual({ title: '직접 진입', text: '일기 입력' })
    s.openHabitCreate()
    await nextTick()
    const habit = state(w.getComponent({ name: 'RecordHabitCreateSheet' }))
    habit.title = '습관 입력'
    habit.onClose()
    await nextTick()
    expect(readDraft(`${STORAGE_KEYS.DRAFT_HABIT_TITLE}session-user`)).toBe('습관 입력')
    expect(mocks.user.fetchMe).not.toHaveBeenCalled()
    w.unmount()
    wrappers.splice(wrappers.indexOf(w), 1)
    const next = await mountPage(RecordPage, true)
    expect(state(next).diaryText).toBe('일기 입력')
    state(next).openHabitCreate()
    await nextTick()
    expect(state(next.getComponent({ name: 'RecordHabitCreateSheet' })).title).toBe('습관 입력')
    expect(profile.value).toBeNull()
  })

  it('프로필 없이 세션만 있는 캘린더 직접 진입에서 메모를 닫기 저장하고 재마운트 복원한다', async () => {
    profile.value = null
    session.value = { data: { user: { id: 'session-user' } } }
    const w = await mountPage(CalendarPage)
    const s = state(w)
    await s.selectDay(10)
    s.startEdit()
    s.editingNoteText = '직접 진입 메모'
    s.closeSheet()
    const key = `${STORAGE_KEYS.DRAFT_NOTE_PREFIX}session-user.${s.dateKey(10)}`
    expect(readDraft(key)).toBe('직접 진입 메모')
    expect(mocks.user.fetchMe).not.toHaveBeenCalled()
    w.unmount()
    wrappers.splice(wrappers.indexOf(w), 1)
    const next = state(await mountPage(CalendarPage))
    await next.selectDay(10)
    expect(next.editingNoteText).toBe('직접 진입 메모')
    expect(profile.value).toBeNull()
  })

  it.each(['session', 'profile'])('늦은 %s ID는 빈 일기·습관만 복원하고 작성한 입력은 유지한다', async (source) => {
    for (const typed of [false, true]) {
      profile.value = null
      session.value = { data: null }
      writeDraft(`${STORAGE_KEYS.DRAFT_DIARY}late-user`, { title: '저장 제목', text: '저장 일기' })
      writeDraft(`${STORAGE_KEYS.DRAFT_HABIT_TITLE}late-user`, '저장 습관')
      let resolve!: () => void
      mocks.user.fetchMe.mockImplementationOnce(() => new Promise<void>(done => { resolve = done }))
      const w = await mountPage(RecordPage, true)
      const s = state(w)
      expect(mocks.user.fetchMe).toHaveBeenCalled()
      s.openModal = 'diary'
      // 초기 조회 버튼 가드와 별개로 열린 자식 시트의 늦은 ID 연결도 검증한다.
      s.habitCreateOpen = true
      await nextTick()
      const habit = state(w.getComponent({ name: 'RecordHabitCreateSheet' }))
      if (typed) {
        s.diaryText = '새 일기'
        habit.title = '새 습관'
      }
      if (source === 'session') session.value = { data: { user: { id: 'late-user' } } }
      else profile.value = { ...mocks.user.me, userId: 'late-user' } as UserMeResponse
      resolve()
      await flushPromises()
      expect(s.diaryText).toBe(typed ? '새 일기' : '저장 일기')
      expect(s.diaryTitle).toBe(typed ? '' : '저장 제목')
      expect(habit.title).toBe(typed ? '새 습관' : '저장 습관')
      s.onSheetClose()
      habit.onClose()
      await nextTick()
      expect(readDraft(`${STORAGE_KEYS.DRAFT_DIARY}late-user`)).toEqual({ title: typed ? '' : '저장 제목', text: typed ? '새 일기' : '저장 일기' })
      expect(readDraft(`${STORAGE_KEYS.DRAFT_HABIT_TITLE}late-user`)).toBe(typed ? '새 습관' : '저장 습관')
      w.unmount()
      wrappers.splice(wrappers.indexOf(w), 1)
    }
  })

  it.each(['session', 'profile'])('늦은 %s ID는 빈 메모만 복원하고 작성한 입력은 유지한다', async (source) => {
    for (const typed of [false, true]) {
      profile.value = null
      session.value = { data: null }
      mocks.sdk.getNote!.mockResolvedValue({ data: { note: '' } })
      let resolve!: () => void
      mocks.user.fetchMe.mockImplementationOnce(() => new Promise<void>(done => { resolve = done }))
      const w = await mountPage(CalendarPage)
      const s = state(w)
      expect(mocks.user.fetchMe).toHaveBeenCalled()
      const key = `${STORAGE_KEYS.DRAFT_NOTE_PREFIX}late-user.${s.dateKey(10)}`
      writeDraft(key, '저장 메모')
      await s.selectDay(10)
      s.startEdit()
      if (typed) s.editingNoteText = '새 메모'
      if (source === 'session') session.value = { data: { user: { id: 'late-user' } } }
      else profile.value = { ...mocks.user.me, userId: 'late-user' } as UserMeResponse
      resolve()
      await flushPromises()
      expect(s.editingNoteText).toBe(typed ? '새 메모' : '저장 메모')
      s.closeSheet()
      expect(readDraft(key)).toBe(typed ? '새 메모' : '저장 메모')
      w.unmount()
      wrappers.splice(wrappers.indexOf(w), 1)
    }
  })

  it('세션 ID를 프로필 ID보다 우선하고 사용자 ID가 없으면 공용 초안을 쓰지 않는다', async () => {
    session.value = { data: { user: { id: 'session-user' } } }
    writeDraft(`${STORAGE_KEYS.DRAFT_DIARY}u1`, { text: '다른 프로필 초안' })
    const w = await mountPage(RecordPage)
    expect(state(w).diaryText).toBe('')
    w.unmount()
    wrappers.splice(wrappers.indexOf(w), 1)
    localStorage.clear()
    profile.value = null
    session.value = { data: null }
    const s = state(await mountPage(RecordPage, true))
    s.openModal = 'diary'
    await nextTick()
    s.diaryText = 'ID 미확인 입력'
    s.onSheetClose()
    await nextTick()
    expect(localStorage.length).toBe(0)
  })

  it.each(['v1', '  v1  ', ''])('이전 캘린더의 지연 저장 성공(%s)은 새 인스턴스의 v2 초안을 유지한다', async (text) => {
    const w = await mountPage(CalendarPage)
    const s = state(w)
    await s.selectDay(10)
    s.startEdit()
    s.editingNoteText = text
    let resolve!: (value: unknown) => void
    const request = text.trim() ? mocks.sdk.saveNote! : mocks.sdk.deleteNote!
    request.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const saving = s.saveNote()
    expect(mocks.routeLeave.mock.calls[0]![0]()).toBe(true)
    w.unmount()
    wrappers.splice(wrappers.indexOf(w), 1)
    const next = state(await mountPage(CalendarPage))
    await next.selectDay(10)
    expect(next.editingNoteText).toBe(text)
    next.editingNoteText = 'v2 newer unsent'
    next.closeSheet()
    const key = `${STORAGE_KEYS.DRAFT_NOTE_PREFIX}u1.${next.dateKey(10)}`
    expect(readDraft(key)).toBe('v2 newer unsent')
    resolve({ data: { note: text.trim() } })
    await saving
    expect(readDraft(key)).toBe('v2 newer unsent')
  })

  it.each(['old draft', 'v1'])('복원한 메모의 지연 저장 성공은 새 초안(%s)을 제출 원문과만 비교한다', async (draft) => {
    const w = await mountPage(CalendarPage)
    const s = state(w)
    const key = `${STORAGE_KEYS.DRAFT_NOTE_PREFIX}u1.${s.dateKey(10)}`
    writeDraft(key, 'old draft')
    await s.selectDay(10)
    expect(s.editingNoteText).toBe('old draft')
    expect(s.isEditingNote).toBe(true)
    s.editingNoteText = 'v1'
    let resolve!: (value: unknown) => void
    mocks.sdk.saveNote!.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const saving = s.saveNote()
    expect(mocks.sdk.saveNote).toHaveBeenCalledWith(expect.objectContaining({ body: { note: 'v1' } }))
    expect(mocks.routeLeave.mock.calls[0]![0]()).toBe(true)
    w.unmount()
    wrappers.splice(wrappers.indexOf(w), 1)
    const next = state(await mountPage(CalendarPage))
    await next.selectDay(10)
    expect(next.editingNoteText).toBe('v1')
    next.editingNoteText = draft
    next.closeSheet()
    expect(readDraft(key)).toBe(draft)
    resolve({ data: { note: 'v1' } })
    await saving
    // 제출 원문과 같은 새 초안은 문자열 비교로 구분할 수 없는 기존 한계를 유지한다.
    expect(readDraft(key)).toBe(draft === 'v1' ? null : draft)
  })

  it('습관 이름은 부모 라우트 이탈에서도 저장되고 생성 성공 후 닫힘·언마운트가 재생성하지 않는다', async () => {
    const key = `${STORAGE_KEYS.DRAFT_HABIT_TITLE}u1`
    const w = await mountPage(RecordPage, true)
    const s = state(w)
    s.openHabitCreate()
    await nextTick()
    const habit = w.getComponent({ name: 'RecordHabitCreateSheet' })
    const form = state(habit)
    form.mode = 'solo'
    form.goStep2()
    await nextTick()
    document.querySelector<HTMLInputElement>('#habit-create-title')!.value = '습관 초안'
    document.querySelector<HTMLInputElement>('#habit-create-title')!.dispatchEvent(new Event('input', { bubbles: true }))
    expect(localStorage.getItem(key)).toBeNull()
    expect(mocks.routeLeave.mock.calls[0]![0]()).toBe(true)
    expect(readDraft(key)).toBe('습관 초안')
    mocks.createHabit.mockResolvedValueOnce({ data: null, status: 500 })
    await s.onHabitCreate({ title: '습관 초안', friendUserId: null })
    expect(readDraft(key)).toBe('습관 초안')
    await s.onHabitCreate({ title: '습관 초안', friendUserId: null })
    await nextTick()
    expect(s.habitCreateOpen).toBe(false)
    expect(localStorage.getItem(key)).toBeNull()
    w.unmount()
    wrappers.splice(wrappers.indexOf(w), 1)
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('일기 입력 중 저장하지 않고 시트 닫기·언마운트 후 복원하며 API 성공 후 삭제한다', async () => {
    const key = `${STORAGE_KEYS.DRAFT_DIARY}u1`
    const w = await mountPage(RecordPage)
    const s = state(w)
    s.openModal = 'diary'
    await nextTick()
    s.diaryTitle = '제목'
    s.diaryText = '작성 중'
    await nextTick()
    expect(localStorage.getItem(key)).toBeNull()
    s.onSheetClose()
    await nextTick()
    expect(readDraft(key)).toEqual({ title: '제목', text: '작성 중' })
    s.openModal = 'diary'
    await nextTick()
    expect(s.diaryText).toBe('작성 중')
    s.diaryText = '이탈 수정'
    expect(mocks.routeLeave.mock.calls[0]![0]()).toBe(true)
    const set = vi.spyOn(localStorage, 'setItem')
    w.unmount()
    wrappers.splice(wrappers.indexOf(w), 1)
    expect(set).not.toHaveBeenCalled()
    const next = state(await mountPage(RecordPage))
    expect(next.diaryText).toBe('이탈 수정')
    next.openModal = 'diary'
    await nextTick()
    mocks.sdk.createRecord!.mockResolvedValueOnce({ error: { message: '저장 실패' } })
    await next.saveDiary()
    expect(localStorage.getItem(key)).not.toBeNull()
    await next.saveDiary()
    await nextTick()
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('다른 사용자 일기 초안을 복원하지 않는다', async () => {
    writeDraft(`${STORAGE_KEYS.DRAFT_DIARY}u1`, { title: '사용자1', text: '비공개 초안' })
    mocks.user.me.userId = 'u2'
    profile.value = { ...profile.value!, userId: 'u2' }
    const s = state(await mountPage(RecordPage))
    s.openModal = 'diary'
    await nextTick()
    expect(s.diaryText).toBe('')
    s.diaryText = '사용자2'
    s.onSheetClose()
    expect(readDraft(`${STORAGE_KEYS.DRAFT_DIARY}u1`)).toEqual({ title: '사용자1', text: '비공개 초안' })
    expect(readDraft(`${STORAGE_KEYS.DRAFT_DIARY}u2`)).toEqual({ title: '', text: '사용자2' })
  })

  it('캘린더 취소·날짜 전환·이탈은 날짜별 메모를 보존하고 성공 저장 때만 삭제한다', async () => {
    const s = state(await mountPage(CalendarPage))
    await s.selectDay(10)
    const key = `${STORAGE_KEYS.DRAFT_NOTE_PREFIX}u1.${s.dateKey(10)}`
    s.startEdit()
    s.editingNoteText = '10일 초안'
    await nextTick()
    expect(localStorage.getItem(key)).toBeNull()
    s.cancelEdit()
    expect(readDraft(key)).toBe('10일 초안')
    s.startEdit()
    expect(s.editingNoteText).toBe('10일 초안')
    await s.selectDay(11)
    expect(s.editingNoteText).toBe('서버 메모')
    s.startEdit()
    s.editingNoteText = '11일 초안'
    expect(mocks.routeLeave.mock.calls[0]![0]()).toBe(true)
    await s.selectDay(10)
    expect(s.editingNoteText).toBe('10일 초안')
    expect(s.isEditingNote).toBe(true)
    mocks.sdk.saveNote!.mockResolvedValueOnce({ error: { message: '실패' } })
    await s.saveNote()
    expect(readDraft(key)).toBe('10일 초안')
    await s.saveNote()
    expect(readDraft(key)).toBeNull()
    s.closeSheet()
    expect(readDraft(key)).toBeNull()
  })

  it('늦은 서버 메모 응답이 복원한 초안이나 복원 후 입력을 덮지 않는다', async () => {
    const s = state(await mountPage(CalendarPage))
    writeDraft(`${STORAGE_KEYS.DRAFT_NOTE_PREFIX}u1.${s.dateKey(10)}`, '복원 초안')
    let resolve!: (value: unknown) => void
    mocks.sdk.getNote!.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const reading = s.selectDay(10)
    expect(s.editingNoteText).toBe('복원 초안')
    s.editingNoteText = '복원 후 입력'
    resolve({ data: { note: '늦은 서버 메모' } })
    await reading
    expect(s.editingNoteText).toBe('복원 후 입력')
    expect(s.selectedNote).toBe('늦은 서버 메모')
  })

  it.each(['login', 'signup'])('가입 약관 직전 지정 필드만 저장·복원하고 %s 성공 시 삭제한다', async (mode) => {
    const w = await mountPage(LoginPage)
    const s = state(w)
    s.mode = 'signup'
    s.nickname = '초안 이름'
    s.birthDate = '2000-01-02'
    s.email = 'draft@example.com'
    s.password = 'never-store-password'
    s.agreeTerms = true
    s.agreePrivacy = true
    s.optionalConsents.forEach((item: { value: boolean }) => { item.value = true })
    await nextTick()
    expect(localStorage.getItem(STORAGE_KEYS.DRAFT_SIGNUP)).toBeNull()
    w.findAllComponents({ name: 'NuxtLink' }).find(link => link.props('to') === '/legal/terms')!.vm.$emit('click')
    const draft = readDraft<Record<string, unknown>>(STORAGE_KEYS.DRAFT_SIGNUP)!
    expect(Object.keys(draft).sort()).toEqual(['agreePrivacy', 'agreeTerms', 'birthDate', 'email', 'mode', 'nickname'])
    expect(JSON.stringify(draft)).not.toContain('never-store-password')
    w.unmount()
    wrappers.splice(wrappers.indexOf(w), 1)
    const restored = state(await mountPage(LoginPage))
    expect(restored.mode).toBe('signup')
    expect(restored.nickname).toBe('초안 이름')
    expect(restored.birthDate).toBe('2000-01-02')
    expect(restored.email).toBe('draft@example.com')
    expect(restored.agreeTerms && restored.agreePrivacy).toBe(true)
    expect(restored.password).toBe('')
    expect(restored.optionalConsents.every((item: { value: boolean }) => !item.value)).toBe(true)
    restored.mode = mode
    restored.password = 'new-password'
    await restored.onSubmit()
    expect(localStorage.getItem(STORAGE_KEYS.DRAFT_SIGNUP)).toBeNull()
  })
})
