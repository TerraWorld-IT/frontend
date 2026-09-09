import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref, type Component } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import RecordPage from '~/pages/record/index.vue'
import CalendarPage from '~/pages/calendar/index.vue'
import CategoriesPage from '~/pages/admin/categories.vue'
import ItemsPage from '~/pages/admin/items.vue'
import ProfilePage from '~/pages/profile/index.vue'
import HomePage from '~/pages/index.vue'
import TodoSheet from '~/components/record/TodoSheet.vue'
import HabitCreateSheet from '~/components/record/HabitCreateSheet.vue'
import HabitTrackerCard from '~/components/record/HabitTrackerCard.vue'
import ShareModal from '~/components/terrarium/ShareModal.vue'
import FriendsPage from '~/pages/friends/index.vue'
import { REWARD_AD_TIMEOUT_MS } from '~/composables/useAdMob'

const mocks = vi.hoisted(() => ({
  sdk: Object.fromEntries(['listCategories', 'listFriends', 'createRecord', 'uploadPhoto', 'listTodoRoutines', 'createTodoRoutine', 'deleteTodoRoutine', 'getRecordStatistics', 'listRecords', 'getNote', 'saveNote', 'deleteNote', 'deleteRecord', 'updateCategoryRewards', 'listAllItems', 'setItemActive', 'createItem', 'updateMe', 'getUnreadNotificationCount', 'updateFreePosition', 'updateTerrariumPlacements', 'getTerrarium', 'acceptInvite', 'claimAdReward'].map(k => [k, vi.fn()])),
  user: { me: { nickname: '테스트', currency: {}, ownedItems: [], entitlements: { freePlacement: true } }, fetchMe: vi.fn(), updateCurrency: vi.fn() },
  items: { items: [], fetchAll: vi.fn(), invalidate: vi.fn() },
  home: { snapshot: { terrarium: { placedItems: [], maxSlots: 6 }, freePlacements: { items: [] } }, fetch: vi.fn(), invalidate: vi.fn(), patchFreePlacement: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  dismiss: vi.fn(),
  capture: vi.fn(),
  shareFile: vi.fn(),
  routeLeave: vi.fn(),
  showRewardedAd: vi.fn(),
  backHandlers: [] as Array<() => void>,
}))
vi.mock('html2canvas', () => ({ default: (...args: unknown[]) => mocks.capture(...args) }))
vi.mock('vue-router', async () => ({ ...(await vi.importActual('vue-router')), onBeforeRouteLeave: mocks.routeLeave }))
vi.mock('~/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('~/stores/items', () => ({ useItemsStore: () => mocks.items }))
vi.mock('~/stores/homeSnapshot', () => ({ useHomeSnapshotStore: () => mocks.home }))
mockNuxtImport('useOpenApi', () => () => ({ sdk: mocks.sdk, client: {} }))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('dismissKeyboard', () => mocks.dismiss)
mockNuxtImport('useGtagEvents', () => () => new Proxy({}, { get: () => vi.fn() }))
mockNuxtImport('useDialogFocusTrap', () => () => undefined)
mockNuxtImport('useBackButtonStack', () => () => ({ pushBackHandler: (handler: () => void) => { mocks.backHandlers.push(handler); return () => undefined } }))
mockNuxtImport('useNative', () => () => ({ isNative: false, hapticImpact: vi.fn(), share: vi.fn(), shareToInstagram: mocks.shareFile }))
mockNuxtImport('useAuth', () => () => ({ isLoggedIn: ref(true) }))
mockNuxtImport('useHabits', () => () => ({ trackers: ref([]), loaded: ref(true), loadError: ref(false), load: vi.fn() }))
mockNuxtImport('useAttendance', () => () => ({ state: ref(null), loading: ref(false), error: ref<string | null>(null), refresh: vi.fn(), checkIn: vi.fn() }))
mockNuxtImport('useTier', () => () => ({ state: ref(null), catalog: ref(null), loading: ref<boolean>(false), loadError: ref<boolean>(false), load: vi.fn() }))
mockNuxtImport('useBgm', () => () => ({ enabled: ref(false), play: vi.fn(), stop: vi.fn(), toggle: vi.fn() }))
mockNuxtImport('useAdMob', () => () => ({ isNative: false, isAndroid: false, isIos: false, issueServerNonce: async () => ({ nonce: 'n1', purpose: 'AD_REWARD', status: 'PENDING', expiresAt: new Date(Date.now() + 600000).toISOString() }), awaitNonceVerified: async () => ({ nonce: 'n1', status: 'VERIFIED' }), showRewardedAd: mocks.showRewardedAd }))

const wrappers: VueWrapper[] = []
// 실제 SFC setup을 마운트하고 외부 I/O와 자식 셸만 대체한다. 로직 복제/소스 문자열 실행은 하지 않는다.
async function mountPage(component: Component, props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(component, {
    props, shallow: true, attachTo: document.body,
    global: { renderStubDefaultSlot: true, stubs: {
      CommonBottomSheet: { props: ['open'], template: '<section v-if="open"><slot name="header"/><slot/><slot name="footer"/></section>' },
    } },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
// script setup 비공개 상태는 테스트에서만 내부 인스턴스로 접근한다.
function state(wrapper: VueWrapper): Record<string, any> {
  return wrapper.vm.$.setupState
}
function deferred<T = any>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('WP2a 조회 상태', () => {
  it('B-10 첫 로딩/실패/빈 결과를 구분하고 명시 재시도로 루틴을 다시 읽는다', async () => {
    const pending = deferred()
    mocks.sdk.listTodoRoutines!.mockReturnValueOnce(pending.promise)
    const w = await mountPage(TodoSheet, { open: false })
    const s = state(w)
    expect(s.pending).toBe(false)
    await w.setProps({ open: true })
    s.segment = 'routine'
    await nextTick()
    expect(s.pending).toBe(true)
    expect(w.text()).not.toContain('매일 반복할 항목을 루틴으로 등록해보세요')
    pending.resolve({ error: { message: 'unavailable' } })
    await flushPromises()
    expect(w.text()).toContain('정보를 불러오지 못했어요')
    expect(w.text()).not.toContain('매일 반복할 항목을 루틴으로 등록해보세요')
    const retry = w.findAll('button').find(button => button.text() === '다시 시도')!
    await retry.trigger('click')
    await flushPromises()
    expect(mocks.sdk.listTodoRoutines).toHaveBeenCalledTimes(2)
    expect(w.text()).toContain('매일 반복할 항목을 루틴으로 등록해보세요')
    expect(s.loadFailed).toBe(false)
    const refresh = deferred()
    mocks.sdk.listTodoRoutines!.mockReturnValueOnce(refresh.promise)
    await w.setProps({ open: false })
    await w.setProps({ open: true })
    expect(s.pending).toBe(false)
    refresh.resolve({ data: { routines: [] } })
    await flushPromises()
  })

  it('첫 성공 이후 빠르게 두 번 재열어도 진행 중인 루틴 조회를 중복하지 않는다', async () => {
    const w = await mountPage(TodoSheet, { open: false })
    await w.setProps({ open: true })
    await flushPromises()
    mocks.sdk.listTodoRoutines!.mockClear()
    const refresh = deferred()
    mocks.sdk.listTodoRoutines!.mockReturnValueOnce(refresh.promise)
    await w.setProps({ open: false })
    await w.setProps({ open: true })
    await w.setProps({ open: false })
    await w.setProps({ open: true })
    expect(state(w).pending).toBe(false)
    expect(mocks.sdk.listTodoRoutines).toHaveBeenCalledOnce()
    refresh.resolve({ data: { routines: [] } })
    await flushPromises()
    await w.setProps({ open: false })
    await w.setProps({ open: true })
    await flushPromises()
    expect(mocks.sdk.listTodoRoutines).toHaveBeenCalledTimes(2)
  })

  it.each(['resolve', 'reject'] as const)('첫 조회 %s 후 생성한 루틴과 기존 서버 루틴을 한 번 재조회해 목록과 프리필에 모두 반영한다', async (settlement) => {
    const first = deferred()
    const refresh = deferred()
    const existing = { id: 'existing', label: '기존 루틴', repeatType: 'DAILY', createdAt: '2026-09-08' }
    const created = { id: 'new', label: '새 루틴', repeatType: 'DAILY', createdAt: '2026-09-09' }
    mocks.sdk.listTodoRoutines!.mockReturnValueOnce(first.promise).mockReturnValueOnce(refresh.promise)
    const w = await mountPage(TodoSheet, { open: false })
    const s = state(w)
    await w.setProps({ open: true })
    mocks.sdk.createTodoRoutine!.mockResolvedValueOnce({ data: created })
    s.routineLabel = created.label
    await s.createRoutine()
    expect(mocks.sdk.listTodoRoutines).toHaveBeenCalledOnce()
    if (settlement === 'reject') first.reject(new Error('이전 조회 실패'))
    else first.resolve({ data: { routines: [existing, created] } })
    await flushPromises()
    expect(mocks.sdk.listTodoRoutines).toHaveBeenCalledTimes(2)
    expect(s.routines).toEqual([created])
    expect(s.loadFailed).toBe(false)
    refresh.resolve({ data: { routines: [existing, created] } })
    await flushPromises()
    expect(s.routines).toEqual([created, existing])
    expect(s.todos.map((todo: { routineId: string }) => todo.routineId).sort()).toEqual(['existing', 'new'])
    expect(s.pending).toBe(false)
    expect(s.loadFailed).toBe(false)
    expect(mocks.sdk.listTodoRoutines).toHaveBeenCalledTimes(2)
  })

  it('생성·삭제보다 늦게 도착한 조회 결과가 최신 루틴과 프리필을 덮지 않는다', async () => {
    const w = await mountPage(TodoSheet, { open: false })
    const s = state(w)
    await w.setProps({ open: true })
    await flushPromises()
    const staleCreate = deferred()
    mocks.sdk.listTodoRoutines!.mockReturnValueOnce(staleCreate.promise)
    const readingCreate = s.loadRoutines()
    const created = { id: 'new', label: '새 루틴', repeatType: 'DAILY', createdAt: '2026-09-09' }
    mocks.sdk.createTodoRoutine!.mockResolvedValueOnce({ data: created })
    s.routineLabel = created.label
    await s.createRoutine()
    mocks.sdk.listTodoRoutines!.mockResolvedValueOnce({ data: { routines: [created] } })
    staleCreate.resolve({ data: { routines: [] } })
    await readingCreate
    await flushPromises()
    expect(s.routines).toEqual([created])
    expect(s.todos).toHaveLength(1)

    const staleDelete = deferred()
    mocks.sdk.listTodoRoutines!.mockReturnValueOnce(staleDelete.promise)
    const readingDelete = s.loadRoutines()
    await s.removeRoutine(created)
    s.clear()
    staleDelete.resolve({ data: { routines: [created] } })
    await readingDelete
    await flushPromises()
    expect(s.routines).toEqual([])
    expect(s.todos).toEqual([])
    expect(s.loadFailed).toBe(false)
  })

  it('폐기 후 재조회에도 세대 검사를 적용하고 삭제 이후 목록을 한 번 더 확보한다', async () => {
    const first = deferred()
    const refresh = deferred()
    const created = { id: 'new', label: '새 루틴', repeatType: 'DAILY', createdAt: '2026-09-09' }
    mocks.sdk.listTodoRoutines!.mockReturnValueOnce(first.promise).mockReturnValueOnce(refresh.promise)
    const w = await mountPage(TodoSheet, { open: false })
    const s = state(w)
    await w.setProps({ open: true })
    mocks.sdk.createTodoRoutine!.mockResolvedValueOnce({ data: created })
    s.routineLabel = created.label
    await s.createRoutine()
    first.resolve({ data: { routines: [] } })
    await flushPromises()
    expect(mocks.sdk.listTodoRoutines).toHaveBeenCalledTimes(2)
    await s.removeRoutine(created)
    s.clear()
    refresh.resolve({ data: { routines: [created] } })
    await flushPromises()
    expect(s.routines).toEqual([])
    expect(s.todos).toEqual([])
    expect(mocks.sdk.listTodoRoutines).toHaveBeenCalledTimes(3)
  })

  it.each(['resolve', 'reject'] as const)('닫힌 시트의 폐기 조회 %s는 상태를 유지하고 다음 열림에 한 번 조회한다', async (settlement) => {
    const first = deferred()
    const existing = { id: 'existing', label: '기존 루틴', repeatType: 'DAILY', createdAt: '2026-09-08' }
    const created = { id: 'new', label: '새 루틴', repeatType: 'DAILY', createdAt: '2026-09-09' }
    mocks.sdk.listTodoRoutines!.mockReturnValueOnce(first.promise)
    const w = await mountPage(TodoSheet, { open: false })
    const s = state(w)
    await w.setProps({ open: true })
    mocks.sdk.createTodoRoutine!.mockResolvedValueOnce({ data: created })
    s.routineLabel = created.label
    await s.createRoutine()
    await w.setProps({ open: false })
    const routines = s.routines
    const todos = s.todos
    if (settlement === 'reject') first.reject(new Error('닫힌 시트 조회 실패'))
    else first.resolve({ data: { routines: [existing, created] } })
    await flushPromises()
    expect(mocks.sdk.listTodoRoutines).toHaveBeenCalledOnce()
    expect(s.routines).toBe(routines)
    expect(s.todos).toBe(todos)
    expect(s.loadFailed).toBe(false)
    expect(s.pending).toBe(false)
    mocks.sdk.listTodoRoutines!.mockResolvedValueOnce({ data: { routines: [existing, created] } })
    await w.setProps({ open: true })
    await flushPromises()
    expect(mocks.sdk.listTodoRoutines).toHaveBeenCalledTimes(2)
    expect(s.routines).toEqual([created, existing])
    expect(s.todos.map((todo: { routineId: string }) => todo.routineId).sort()).toEqual(['existing', 'new'])
  })

  it('세대가 같은 조회도 닫힌 시트에는 목록과 프리필을 반영하지 않는다', async () => {
    const first = deferred()
    mocks.sdk.listTodoRoutines!.mockReturnValueOnce(first.promise)
    const w = await mountPage(TodoSheet, { open: false })
    const s = state(w)
    await w.setProps({ open: true })
    await w.setProps({ open: false })
    first.resolve({ data: { routines: [{ id: 'old', label: '기존 루틴', repeatType: 'DAILY', createdAt: '2026-09-08' }] } })
    await flushPromises()
    expect(s.routines).toEqual([])
    expect(s.todos).toEqual([])
    expect(s.loadFailed).toBe(false)
    expect(mocks.sdk.listTodoRoutines).toHaveBeenCalledOnce()
  })

  it('시트 해제로 폐기된 조회는 재조회하거나 프리필하지 않는다', async () => {
    const first = deferred()
    mocks.sdk.listTodoRoutines!.mockReturnValueOnce(first.promise)
    const w = await mountPage(TodoSheet, { open: false })
    const s = state(w)
    await w.setProps({ open: true })
    w.unmount()
    first.resolve({ data: { routines: [{ id: 'old', label: '기존 루틴', repeatType: 'DAILY', createdAt: '2026-09-08' }] } })
    await flushPromises()
    expect(s.routines).toEqual([])
    expect(s.todos).toEqual([])
    expect(mocks.sdk.listTodoRoutines).toHaveBeenCalledOnce()
  })

  it('단독 습관도 조회 중이거나 실패하면 제출하지 않고 복구 후 제출한다', async () => {
    const w = await mountPage(HabitCreateSheet, { open: true, friends: [], loading: true })
    const s = state(w)
    s.mode = 'solo'
    s.step = 2
    s.title = '매일 걷기'
    s.onPrimary()
    expect(w.emitted('submit')).toBeUndefined()
    await w.setProps({ loading: false, loadError: true })
    s.onPrimary()
    expect(w.emitted('submit')).toBeUndefined()
    await w.setProps({ loadError: false })
    s.onPrimary()
    expect(w.emitted('submit')).toEqual([[{ title: '매일 걷기', friendUserId: null }]])
  })

  it('B-12 초기 자료 조회와 실패 중에는 입력 진입을 막고 재시도 성공 후 해제한다', async () => {
    const pending = deferred()
    mocks.sdk.listFriends!.mockReturnValueOnce(pending.promise)
    const w = await mountPage(RecordPage)
    const s = state(w)
    const entry = w.findAll('button').find(button => button.attributes('aria-label')?.includes('기록하기'))!
    expect(entry.attributes('disabled')).toBeDefined()
    s.openHabitCreate()
    expect(s.habitCreateOpen).toBe(false)
    pending.resolve({ error: { message: 'unavailable' } })
    await flushPromises()
    expect(entry.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('기록 정보를 불러오지 못했어요')
    s.retryInitial()
    await flushPromises()
    expect(entry.attributes('disabled')).toBeUndefined()
    s.openHabitCreate()
    expect(s.habitCreateOpen).toBe(true)
  })

  it('B-12 친구 조회 실패를 빈 목록과 구분하고 부모에게 재시도를 요청한다', async () => {
    const w = await mountPage(HabitCreateSheet, { open: true, friends: [], loadError: true })
    const s = state(w)
    s.step = 3
    s.mode = 'friend'
    s.selectedFriendId = 'friend-1'
    await nextTick()
    expect(w.text()).toContain('정보를 불러오지 못했어요')
    expect(w.text()).not.toContain('함께 할 친구가 없어요')
    s.submit()
    expect(w.emitted('submit')).toBeUndefined()
    await w.findAll('button').find(button => button.text() === '다시 시도')!.trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
    await w.setProps({ loadError: false, loading: true })
    expect(w.text()).not.toContain('함께 할 친구가 없어요')
    await w.setProps({ loading: false })
    expect(w.text()).toContain('함께 할 친구가 없어요')
  })
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.backHandlers.length = 0
  mocks.home.snapshot = { terrarium: { placedItems: [], maxSlots: 6 }, freePlacements: { items: [] } }
  mocks.user.me = { nickname: '테스트', currency: {}, ownedItems: [], entitlements: { freePlacement: true } }
  for (const fn of Object.values(mocks.sdk)) fn.mockReset().mockResolvedValue({ data: [], error: undefined })
  mocks.sdk.listCategories!.mockResolvedValue({ data: { categories: [{ id: 1, name: '일기', dailyLimit: 1, baseCoinReward: 1, baseTokenReward: 1 }, { id: 2, name: '집중', dailyLimit: 1, baseCoinReward: 1, baseTokenReward: 1 }] } })
  mocks.sdk.listTodoRoutines!.mockResolvedValue({ data: { routines: [] } })
  mocks.sdk.listRecords!.mockResolvedValue({ data: { content: [], totalPages: 1 } })
  mocks.sdk.getRecordStatistics!.mockResolvedValue({ data: { totalRecords: 0, byCategory: [] } })
  mocks.sdk.listAllItems!.mockResolvedValue({ data: { items: [{ id: 1, isActive: true }, { id: 2, isActive: true }] } })
  mocks.user.fetchMe.mockReset().mockResolvedValue(undefined)
  mocks.shareFile.mockReset().mockResolvedValue(true)
  mocks.capture.mockReset().mockResolvedValue({ toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['png'], { type: 'image/png' })) })
  localStorage.clear()
})
afterEach(() => {
  wrappers.splice(0).forEach(w => w.unmount())
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('WP2a-B 홈 피드백', () => {
  it('B-31 출석 실패는 기존 CTA 로 재조회하며 중복 조회와 체크인을 막는다', async () => {
    const w = await mountPage(HomePage); const s = state(w)
    s.attendance.error.value = '조회 실패'
    s.showAttendance = true
    await nextTick()
    expect(w.get('[data-testid="attendance-subtitle"]').text()).toBe('정보를 불러오지 못했어요')
    expect(w.get('[data-testid="attendance-cta"]').text()).toBe('다시 시도')
    const retry = deferred()
    s.attendance.refresh.mockImplementationOnce(async () => {
      s.attendance.loading.value = true
      await retry.promise
      s.attendance.error.value = null
      s.attendance.loading.value = false
    })
    s.attendance.refresh.mockClear()
    await w.get('[data-testid="attendance-cta"]').trigger('click')
    expect(w.get('[data-testid="attendance-cta"]').attributes('disabled')).toBeDefined()
    await s.onAttendanceCheck()
    expect(s.attendance.refresh).toHaveBeenCalledTimes(1)
    expect(s.attendance.checkIn).not.toHaveBeenCalled()
    retry.resolve(); await flushPromises()
    expect(w.get('[data-testid="attendance-cta"]').text()).toBe('출석하기')
  })

  it('B-31 티어 실패는 재조회 버튼과 캐러셀 잠금에 연결된다', async () => {
    const w = await mountPage(HomePage); const s = state(w)
    s.tier.loadError.value = true
    await nextTick()
    expect(w.findComponent({ name: 'TerrariumJarCarousel' }).attributes('locked')).toBe('true')
    s.onUnlockRequest({ tier: 'L2' })
    expect(s.unlockTarget).toBeNull()
    s.tier.load.mockClear()
    s.tier.load.mockImplementationOnce(async () => { s.tier.loadError.value = false })
    await w.findAll('button').find(button => button.text() === '다시 시도')!.trigger('click')
    expect(s.tier.load).toHaveBeenCalledTimes(1)
    expect(w.text()).not.toContain('정보를 불러오지 못했어요')
  })

  it.each([true, false])('D-01 freePlacement=%s 에서 권한에 따라 저장 토스트를 구분한다', async (entitled) => {
    mocks.user.me.entitlements.freePlacement = entitled
    const s = state(await mountPage(HomePage))
    s.freePlacementNoticeShown = true
    await s.onSaveManage()
    if (entitled) expect(mocks.toast.success).toHaveBeenCalledWith('저장됨', { variant: 'pill' })
    else expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
  })

  it.each(['cancel', 'error'] as const)('B-16 광고 준비 중 재진입을 거부하고 %s 후 잠금을 해제한다', async (outcome) => {
    const s = state(await mountPage(HomePage))
    const ad = deferred<boolean>()
    mocks.showRewardedAd.mockReset().mockReturnValueOnce(ad.promise)
    s.showFreeCoinDialog = true
    const claiming = s.onClaimAdReward()
    await nextTick()
    expect(s.adClaiming).toBe(true)
    expect(s.showFreeCoinDialog).toBe(true)
    await s.onClaimAdReward()
    expect(mocks.showRewardedAd).toHaveBeenCalledTimes(1)
    s.showFreeCoinDialog = false
    s.adAvailable = true
    s.onAdMenuClick()
    expect(s.showFreeCoinDialog).toBe(false)
    s.showFreeCoinDialog = true
    if (outcome === 'cancel') ad.resolve(false)
    else ad.reject(new Error('광고 오류'))
    await claiming
    expect(s.adClaiming).toBe(false)
    expect(s.showFreeCoinDialog).toBe(true)
  })

  it('B-16 준비가 끝나지 않아도 시한 뒤 재진입하고 늦은 광고 완료로 청구하지 않는다', async () => {
    const w = await mountPage(HomePage); const s = state(w)
    vi.useFakeTimers()
    const ad = deferred<boolean>(); const nextAd = deferred<boolean>()
    mocks.showRewardedAd.mockReset().mockReturnValueOnce(ad.promise).mockReturnValueOnce(nextAd.promise)
    s.showFreeCoinDialog = true
    const claiming = s.onClaimAdReward()
    await nextTick()
    const dialog = w.get('[data-testid="home-ad-body"]').element.closest('common-modal-stub')!
    expect(dialog.getAttribute('busy')).toBe('true')
    await vi.advanceTimersByTimeAsync(REWARD_AD_TIMEOUT_MS - 1)
    expect(s.adClaiming).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    await claiming; await nextTick()
    expect(s.adClaiming).toBe(false)
    expect(dialog.getAttribute('busy')).toBe('false')
    expect(mocks.toast.error).toHaveBeenCalledWith('광고 보상 실패')
    const reentry = s.onClaimAdReward()
    // 서버 nonce 발급의 비동기 경계를 기다리되 기존 호출 횟수와 시한 단정은 유지한다.
    await nextTick()
    expect(mocks.showRewardedAd).toHaveBeenCalledTimes(2)
    ad.resolve(true); await flushPromises()
    expect(mocks.sdk.claimAdReward).not.toHaveBeenCalled()
    expect(s.adClaiming).toBe(true)
    expect(mocks.user.updateCurrency).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(s.showFreeCoinDialog).toBe(true)
    nextAd.resolve(false); await reentry
    expect(s.adClaiming).toBe(false)
  })

  it.each(['success', 'network-error', 'retry'] as const)('B-16 보상 요청 %s 도 전체 시한을 따르고 늦은 응답을 반영하지 않는다', async (outcome) => {
    const s = state(await mountPage(HomePage))
    vi.useFakeTimers()
    const claim = deferred()
    mocks.showRewardedAd.mockReset().mockImplementationOnce(async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 1000))
      return true
    })
    if (outcome === 'retry') mocks.sdk.claimAdReward!.mockRejectedValueOnce(new Error('네트워크 오류'))
    mocks.sdk.claimAdReward!.mockReturnValueOnce(claim.promise)
    s.showFreeCoinDialog = true
    const claiming = s.onClaimAdReward()
    await vi.advanceTimersByTimeAsync(REWARD_AD_TIMEOUT_MS - 1)
    expect(s.adClaiming).toBe(true)
    await vi.advanceTimersByTimeAsync(1); await claiming
    expect(s.adClaiming).toBe(false)
    expect(mocks.toast.error).toHaveBeenCalledExactlyOnceWith('광고 보상 실패')
    if (outcome === 'network-error') claim.reject(new Error('늦은 네트워크 오류'))
    else claim.resolve({ data: { updatedCurrency: { ruby: 1 }, reward: { specialCoins: 1 } } })
    await flushPromises()
    expect(mocks.sdk.claimAdReward).toHaveBeenCalledTimes(outcome === 'retry' ? 2 : 1)
    expect(mocks.user.updateCurrency).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(mocks.toast.error).toHaveBeenCalledTimes(1)
    expect(s.showFreeCoinDialog).toBe(true)
  })
})

describe('T2-Y 기록 요청과 입력 보존', () => {
  it('C04 생성 성공 후 잔액 갱신 실패는 저장 성공이고 요청은 한 번이다', async () => {
    const w = await mountPage(RecordPage); const s = state(w)
    mocks.user.fetchMe.mockRejectedValueOnce(new Error('refresh'))
    mocks.sdk.createRecord!.mockResolvedValue({ data: { record: {}, reward: null } })
    s.openModal = 'diary'; s.diaryText = '보존할 일기'
    await s.saveDiary(); await flushPromises()
    expect(mocks.sdk.createRecord).toHaveBeenCalledTimes(1)
    expect(s.openModal).toBeNull(); expect(s.diaryText).toBe('')
    expect(mocks.toast.error).not.toHaveBeenCalled()
  })
  it('C05 업로드 중 저장을 거부하고 닫고 다시 연 작성에 늦은 사진을 넣지 않는다', async () => {
    const w = await mountPage(RecordPage); const s = state(w)
    const upload = deferred(); mocks.sdk.uploadPhoto!.mockReturnValueOnce(upload.promise)
    s.openModal = 'diary'; s.diaryText = '내용'
    const uploading = s.onFileSelected({ target: { files: [new File(['x'], 'x.png')] } })
    await s.saveDiary(); expect(mocks.sdk.createRecord).not.toHaveBeenCalled()
    s.closeModal(); s.openModal = 'diary'
    upload.resolve({ data: { photoUrl: 'https://example.test/old.png' } }); await uploading
    expect(s.photoUrl).toBe(''); expect(s.uploadingPhoto).toBe(false)
  })
  it('C50 일기 저장 중 입력이 잠기고 중복 저장 요청이 없다', async () => {
    const w = await mountPage(RecordPage); const s = state(w); const save = deferred()
    mocks.sdk.createRecord!.mockReturnValueOnce(save.promise)
    s.openModal = 'diary'; s.diaryText = '원본'; await nextTick()
    const saving = s.saveDiary(); await nextTick()
    expect(w.get('textarea').attributes('disabled')).toBeDefined()
    s.closeModal(); expect(s.openModal).toBe('diary')
    await s.saveDiary(); expect(mocks.sdk.createRecord).toHaveBeenCalledTimes(1)
    save.resolve({ error: { message: 'fail' } }); await saving
    expect(s.diaryText).toBe('원본')
  })
  it.each(['0', '181', '1.5', 'Infinity', 'NaN'])('C31 %s 분은 시작하지 않는다', async (minutes) => {
    const s = state(await mountPage(RecordPage)); s.focusName = '집중'; s.focusMinutes = minutes
    s.startFocus(); expect(s.focusPhase).toBe('setup'); expect(mocks.toast.error).toHaveBeenCalled()
  })
  it.each(['1', '180'])('C31 경계값 %s 분은 시작한다', async (minutes) => {
    const s = state(await mountPage(RecordPage)); s.focusName = '집중'; s.focusMinutes = minutes
    s.startFocus(); expect(s.focusPhase).toBe('running')
  })
  it('C03/C11 시간 점프 후 중지 저장 실패는 재시도와 확인된 종료가 가능하다', async () => {
    const w = await mountPage(RecordPage); const s = state(w)
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-01T00:00:00Z'))
    s.openModal = 'focus'; s.focusName = '독서'; s.focusMinutes = '25'; s.startFocus()
    vi.setSystemTime(new Date('2026-09-01T00:05:00Z')); s.resumeDistanceWatchFromBackground()
    expect(s.focusRemaining).toBe(1200); expect(s.focusElapsed).toBe(300)
    mocks.sdk.createRecord!.mockResolvedValueOnce({ error: { message: 'fail' } })
    await s.stopFocus(); expect(s.focusPhase).toBe('stopped')
    expect(mocks.sdk.createRecord!.mock.calls[0]![0].body.duration).toBe(5)
    s.onSheetClose(); expect(s.focusDiscardOpen).toBe(true); expect(s.openModal).toBe('focus')
    await nextTick()
    w.findAllComponents({ name: 'RecordConfirmDialog' })[0]?.vm.$emit('confirm')
    await nextTick(); expect(s.openModal).toBeNull()
  })
})

describe('T2-Y 시트 키보드와 draft', () => {
  it('C06/C25 제출 중 투두 변경을 막고 두 Enter는 조합 확정 중 요청하지 않는다', async () => {
    const w = await mountPage(TodoSheet, { open: true, submitting: false }); const s = state(w)
    s.newText = '원본'; s.onAdd(); s.toggleTodo(s.todos[0].id)
    await w.setProps({ submitting: true }); s.newText = '새 내용'; s.onAdd(); s.removeTodo(s.todos[0].id); s.toggleTodo(s.todos[0].id)
    expect(s.todos).toHaveLength(1); expect(s.todos[0].checked).toBe(true)
    await w.setProps({ submitting: false }); await nextTick()
    await w.get('input').trigger('keydown', { key: 'Enter', isComposing: true }); expect(s.todos).toHaveLength(1)
    await w.get('input').trigger('keydown', { key: 'Enter', isComposing: false }); expect(s.todos).toHaveLength(2)
    s.segment = 'routine'; s.routineFormOpen = true; s.routineLabel = '루틴'; await nextTick()
    await w.get('input').trigger('keydown', { key: 'Enter', isComposing: true }); expect(mocks.sdk.createTodoRoutine).not.toHaveBeenCalled()
    await w.get('input').trigger('keydown', { key: 'Enter', isComposing: false }); expect(mocks.sdk.createTodoRoutine).toHaveBeenCalledTimes(1)
  })
  it('F10 제출 중 도착한 루틴 프리필은 폐기하지 않고 제출 종료 후 반영한다', async () => {
    const w = await mountPage(TodoSheet, { open: true, submitting: true }); const s = state(w)
    s.prefillFromRoutines([{ id: 9, label: '루틴 항목', repeatType: 'DAILY', daysOfWeek: null, createdAt: '2026-09-01' }])
    expect(s.todos).toHaveLength(0)
    await w.setProps({ submitting: false }); await nextTick()
    expect(s.todos.map((t: { text: string }) => t.text)).toContain('루틴 항목')
  })
  it('C07 습관 이름 Enter는 한글 조합 중 제출하지 않는다', async () => {
    const w = await mountPage(HabitCreateSheet, { open: true, friends: [] }); const s = state(w)
    s.mode = 'solo'; s.step = 2; s.title = '독서'; await nextTick()
    await w.get('input').trigger('keydown', { key: 'Enter', isComposing: true }); expect(w.emitted('submit')).toBeUndefined()
    await w.get('input').trigger('keydown', { key: 'Enter', isComposing: false }); expect(w.emitted('submit')).toHaveLength(1)
  })
  it('C26 닉네임 조합 Enter와 pending 중복 요청을 거부한다', async () => {
    const w = await mountPage(ProfilePage); const s = state(w); const save = deferred()
    s.showNicknameSheet = true; s.nicknameDraft = '닉네임'; await nextTick()
    mocks.sdk.updateMe!.mockReturnValueOnce(save.promise)
    await w.get('#nickname-input').trigger('keydown', { key: 'Enter', isComposing: true }); expect(mocks.sdk.updateMe).not.toHaveBeenCalled()
    await w.get('#nickname-input').trigger('keydown', { key: 'Enter', isComposing: false })
    await s.saveNickname(); expect(mocks.sdk.updateMe).toHaveBeenCalledTimes(1)
    save.resolve({}); await flushPromises()
  })
})

describe('T2-Y 날짜와 관리자 요청 직렬화', () => {
  it('C21 A/B 노트 응답 역전과 A 저장 후 B 폼 보존', async () => {
    const s = state(await mountPage(CalendarPage)); const a = deferred(); const b = deferred()
    mocks.sdk.getNote!.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
    const first = s.selectDay(1); s.closeSheet(); const second = s.selectDay(2)
    b.resolve({ data: { note: 'B' } }); await second
    a.resolve({ data: { note: 'A' } }); await first; expect(s.selectedNote).toBe('B')
    s.startEdit(); s.editingNoteText = 'B 저장'; const save = deferred(); mocks.sdk.saveNote!.mockReturnValueOnce(save.promise)
    const saving = s.saveNote(); s.closeSheet()
    mocks.sdk.getNote!.mockResolvedValueOnce({ data: { note: 'C' } }); await s.selectDay(3); s.startEdit(); s.editingNoteText = 'C 작성 중'
    save.resolve({ data: { note: 'B 저장' } }); await saving
    expect(s.selectedNote).toBe('C'); expect(s.editingNoteText).toBe('C 작성 중'); expect(s.isEditingNote).toBe(false)
    s.startEdit(); expect(s.isEditingNote).toBe(true)
    expect(Object.values(s.noteMap)).toContain('B 저장')
  })
  it('C12 다른 카테고리 저장은 앞 요청 완료까지 거부한다', async () => {
    const s = state(await mountPage(CategoriesPage)); const save = deferred(); mocks.sdk.updateCategoryRewards!.mockReturnValueOnce(save.promise)
    const first = s.saveRewards(1); await s.saveRewards(2)
    expect(mocks.sdk.updateCategoryRewards).toHaveBeenCalledTimes(1); expect(s.saving).toBe(1)
    save.resolve({}); await first; expect(s.saving).toBeNull()
  })
  it('C13/C14 토글과 생성 모두 직렬화하고 Modal confirm은 생성 함수를 호출한다', async () => {
    const w = await mountPage(ItemsPage); const s = state(w); const toggle = deferred(); mocks.sdk.setItemActive!.mockReturnValueOnce(toggle.promise)
    const first = s.toggleActive(1); await s.toggleActive(2); expect(mocks.sdk.setItemActive).toHaveBeenCalledTimes(1)
    s.form.name = '이름'; s.form.assetUrl = '🌵'; await s.submitCreate(); expect(mocks.sdk.createItem).not.toHaveBeenCalled()
    toggle.resolve({}); await first
    const create = deferred(); mocks.sdk.createItem!.mockReturnValueOnce(create.promise); s.showCreateDialog = true; await nextTick()
    w.getComponent({ name: 'CommonModal' }).vm.$emit('confirm'); await nextTick()
    w.getComponent({ name: 'CommonModal' }).vm.$emit('update:modelValue', false)
    expect(s.showCreateDialog).toBe(true); await s.submitCreate(); expect(mocks.sdk.createItem).toHaveBeenCalledTimes(1)
    create.resolve({ error: { message: 'fail' } }); await flushPromises(); expect(s.showCreateDialog).toBe(true)
  })
})

describe('T2-Y 홈 배치', () => {
  it('C16/C17 저장 payload는 제출 스냅샷이고 드래그 저장은 관리 UI를 잠그지 않는다', async () => {
    const s = state(await mountPage(HomePage)); const save = deferred(); mocks.sdk.updateFreePosition!.mockReturnValueOnce(save.promise)
    s.editMode = true; s.placedItems = [{ placementId: 1, itemId: 1, x: 100, y: 300, scale: 1, flipped: false, zIndex: 0 }]
    const placed = s.placedItems[0]; const first = s.persistPosition(placed)
    // F2 — 드래그 저장은 전역 잠금을 걸지 않는다(스냅샷 + dirty 세대 비교가 race 를 막는다).
    expect(s.placementBusy).toBe(false)
    placed.scale = 2 // 요청 이후 값 변경을 강제해도 응답은 제출 스냅샷만 확정한다.
    save.resolve({}); await first
    expect(mocks.home.patchFreePlacement).toHaveBeenCalledWith(1, expect.objectContaining({ scale: 1 }))
    expect(s.dirtyPlacementIds.has(1)).toBe(true); expect(s.placementBusy).toBe(false)
  })
  it('C17 [저장하기] 진행 중에는 추가/삭제/편집을 거부한다', async () => {
    const s = state(await mountPage(HomePage))
    s.editMode = true; s.placedItems = [{ placementId: 1, itemId: 1, x: 100, y: 300, scale: 1, flipped: false, zIndex: 0 }]
    const placed = s.placedItems[0]; s.saving = true
    s.flipItem(placed); await s.removeItem(placed); await s.onAddItem({ id: 2 }); await s.onSaveManage()
    expect(placed.flipped).toBe(false)
    expect(mocks.sdk.updateTerrariumPlacements).not.toHaveBeenCalled()
    expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
  })
  it('F1 자유배치 미보유는 저장을 시도하지 않고 dirty도 종료 확인창도 남기지 않는다', async () => {
    mocks.user.me = { nickname: '테스트', currency: {}, ownedItems: [], entitlements: { freePlacement: false } }
    const s = state(await mountPage(HomePage))
    s.editMode = true; s.placedItems = [{ placementId: 1, itemId: 1, x: 100, y: 300, scale: 1, flipped: false, zIndex: 0 }]
    // 종전 동작 복원 — preview 는 성공으로 간주(오류 토스트 없음), 서버 저장은 시도하지 않는다.
    expect(await s.persistPosition(s.placedItems[0])).toBe(true)
    expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
    expect(mocks.toast.error).not.toHaveBeenCalled()
    expect(mocks.toast.info).toHaveBeenCalledTimes(1)
    expect(s.dirtyPlacementIds.size).toBe(0)
    s.exitManageMode()
    expect(s.manageExitTarget).toBeNull(); expect(s.editMode).toBe(false)
  })
  it('C15/C52 dirty 종료 취소/확인 및 탭 방향키 계약', async () => {
    const w = await mountPage(HomePage); const s = state(w); s.editMode = true; s.dirtyPlacementIds.add(1); await nextTick()
    s.exitManageMode(); expect(s.editMode).toBe(true); expect(s.manageExitTarget).toBeTypeOf('function')
    s.manageExitTarget(false); expect(s.editMode).toBe(true)
    const tabs = w.findAll('[role="tab"]'); expect(tabs).toHaveLength(3)
    await tabs[0]!.trigger('keydown', { key: 'ArrowRight' }); expect(s.manageTab).toBe('spirits')
    expect(tabs[1]!.attributes('tabindex')).toBe('0'); expect(tabs[1]!.attributes('aria-controls')).toBe('home-manage-panel')
    await tabs[1]!.trigger('keydown', { key: 'End' }); expect(s.manageTab).toBe('backgrounds')
    await tabs[2]!.trigger('keydown', { key: 'Home' }); expect(s.manageTab).toBe('items')
    s.exitManageMode(); s.manageExitTarget(true); expect(s.editMode).toBe(false)
  })
  it('D2 같은 배치의 응답 역전은 최신 요청 값만 확정하고 dirty 를 해제한다', async () => {
    const s = state(await mountPage(HomePage)); const first = deferred(); const second = deferred()
    mocks.sdk.updateFreePosition!.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    s.editMode = true; s.placedItems = [{ placementId: 1, itemId: 1, x: 100, y: 300, scale: 1, flipped: false, zIndex: 0 }]
    const placed = s.placedItems[0]
    const a = s.persistPosition(placed) // 세대 1 — x=100
    placed.x = 200
    const b = s.persistPosition(placed) // 세대 2 — x=200
    second.resolve({}); await b
    first.resolve({}); await a // 이전 세대 응답이 나중에 도착
    expect(mocks.home.patchFreePlacement).toHaveBeenCalledTimes(1)
    expect(mocks.home.patchFreePlacement).toHaveBeenCalledWith(1, expect.objectContaining({ posX: 0.5 }))
    expect(s.dirtyPlacementIds.has(1)).toBe(false)
    expect(mocks.toast.error).not.toHaveBeenCalled()
  })
  it('D1 스냅샷 없는 확인 종료에서 재동기화가 실패하면 알린다', async () => {
    const s = state(await mountPage(HomePage))
    s.editMode = true; s.placedItems = [{ placementId: 1, itemId: 1, x: 100, y: 300, scale: 1, flipped: false, zIndex: 0 }]
    s.dirtyPlacementIds.add(1)
    mocks.home.snapshot = null as unknown as typeof mocks.home.snapshot
    mocks.home.fetch.mockRejectedValueOnce(new Error('재동기화 실패'))
    s.exitManageMode(true)
    expect(s.editMode).toBe(false); expect(s.dirtyPlacementIds.size).toBe(0)
    await flushPromises()
    expect(mocks.home.fetch).toHaveBeenCalled()
    expect(mocks.toast.error).toHaveBeenCalledWith('재동기화 실패')
  })
})


describe('T2-Y 확인 다이얼로그와 DOM 계약', () => {
  it('C22/C23 확인을 닫으면 삭제하지 않고 확인 연타는 요청 한 번이다', async () => {
    const w = await mountPage(CalendarPage); const s = state(w)
    s.deleteTarget = { id: 1, categoryName: '일기' }; await nextTick()
    const confirm = w.getComponent({ name: 'RecordConfirmDialog' })
    confirm.vm.$emit('close'); expect(mocks.sdk.deleteRecord).not.toHaveBeenCalled()
    s.deleteTarget = { id: 1, categoryName: '일기' }; const deletion = deferred(); mocks.sdk.deleteRecord!.mockReturnValueOnce(deletion.promise)
    confirm.vm.$emit('confirm'); confirm.vm.$emit('confirm'); expect(mocks.sdk.deleteRecord).toHaveBeenCalledTimes(1)
    deletion.resolve({}); await flushPromises(); expect(s.deleteTarget).toBeNull()
    const todo = await mountPage(TodoSheet, { open: true }); const ts = state(todo)
    ts.routineDeleteTarget = { id: 2, label: '독서' }; await nextTick()
    const routineConfirm = todo.getComponent({ name: 'RecordConfirmDialog' }); routineConfirm.vm.$emit('close')
    expect(mocks.sdk.deleteTodoRoutine).not.toHaveBeenCalled()
    ts.routineDeleteTarget = { id: 2, label: '독서' }; const routineDelete = deferred(); mocks.sdk.deleteTodoRoutine!.mockReturnValueOnce(routineDelete.promise)
    routineConfirm.vm.$emit('confirm'); routineConfirm.vm.$emit('confirm'); expect(mocks.sdk.deleteTodoRoutine).toHaveBeenCalledTimes(1)
    routineDelete.resolve({}); await flushPromises(); expect(ts.routineDeleteTarget).toBeNull()
  })
  it('C15 back과 라우트 이탈은 pending 거부 및 dirty 확인 정책을 공유한다', async () => {
    const s = state(await mountPage(HomePage)); s.editMode = true; await nextTick()
    const back = mocks.backHandlers.at(-1)!; s.placementBusy = true; back(); back(); expect(s.editMode).toBe(true)
    expect(mocks.routeLeave).toHaveBeenCalledTimes(1)
    const leave = mocks.routeLeave.mock.calls.at(-1)![0]
    expect(await leave()).toBe(false)
    s.placementBusy = false; s.dirtyPlacementIds.add(1)
    const leaving = leave(); expect(s.editMode).toBe(true); s.manageExitTarget(false); expect(await leaving).toBe(false)
    const confirmed = leave(); s.manageExitTarget(true); expect(await confirmed).toBe(true)
  })
  it('C20 월 요청 최신성 및 로딩/오류 표시를 유지한다', async () => {
    const w = await mountPage(CalendarPage); const s = state(w); const first = deferred(); const second = deferred()
    mocks.sdk.listRecords!.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const a = s.loadMonth(); const b = s.loadMonth(); await nextTick()
    expect(w.get('[data-layout-anchor="calendar-grid"]').attributes('aria-busy')).toBe('true')
    second.resolve({ data: { content: [{ id: 2, recordedDate: '2026-09-02' }], totalPages: 1 } }); await b
    first.resolve({ data: { content: [{ id: 1, recordedDate: '2026-08-01' }], totalPages: 1 } }); await a
    expect(s.monthRecords[0].id).toBe(2); expect(s.monthLoading).toBe(false)
    mocks.sdk.listRecords!.mockResolvedValueOnce({ error: { message: 'failed' } }); await s.loadMonth(); await nextTick()
    expect(s.monthError).toBe(true); expect(w.text()).toContain('불러오지 못했어요. 다시 시도')
  })
  it('F5 월 로드 실패는 마지막 성공 데이터와 날짜 선택을 유지한다', async () => {
    const s = state(await mountPage(CalendarPage))
    const key = s.dateKey(2)
    mocks.sdk.listRecords!.mockResolvedValueOnce({ data: { content: [{ id: 1, recordedDate: key }], totalPages: 1 } })
    await s.loadMonth()
    expect(s.hasRecords(2)).toBe(true)
    mocks.sdk.listRecords!.mockResolvedValueOnce({ error: { message: 'failed' } })
    await s.loadMonth()
    expect(s.monthError).toBe(true)
    // 오류 1회로 월 전체가 잠기지 않는다 — 표시도 선택도 계속 가능해야 한다.
    expect(s.hasRecords(2)).toBe(true)
    mocks.sdk.getNote!.mockResolvedValueOnce({ data: { note: '메모' } })
    await s.selectDay(2)
    expect(s.selectedDate).not.toBeNull()
  })
  it('C10/A12/C33 힐링 dialog와 출석 안전영역/닫기 확장 구조', async () => {
    const w = await mountPage(HomePage); const s = state(w); s.healingMode = true; s.showAttendance = true; await nextTick()
    const stage = w.get('#my-terra-container')
    expect(stage.attributes('role')).toBe('dialog'); expect(stage.attributes('aria-modal')).toBe('true'); expect(stage.attributes('aria-label')).toBe('힐링 모드')
    expect(w.get('.apjek-safe-dialog').exists()).toBe(true)
    expect(w.get('[data-testid="attendance-popup"]').classes()).toContain('overflow-y-auto')
    expect(w.get('[data-testid="home-healing-close"]').classes()).toContain('after:-inset-[6px]')
  })
  it.each(['pendingReceived', 'pending', 'partnerIdle'])('C32 %s 버튼은 시각 높이 32px와 투명 확장을 유지한다', async (view) => {
    const w = await mountPage(HabitTrackerCard, { tracker: { id: 1, title: '독서', friendLinked: true, currentStreakDays: 0, cycleLengthDays: 7, status: 'ACTIVE', partnerStatus: 'NONE', extendStatus: 'NONE' }, view })
    const buttons = w.findAll('button').filter(b => b.classes().includes('h-[32px]'))
    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) expect(button.classes()).toContain('after:-inset-y-[6px]')
  })
  it('C18 공유 busy는 SNS도 잠그고 사용 가능한 클릭은 sns 이벤트를 보낸다', async () => {
    const w = await mountPage(ShareModal, { open: true, busy: true, inviteCreating: false, storyShareAvailable: false })
    expect(w.get('[data-testid="share-sns"]').attributes('disabled')).toBeDefined()
    await w.setProps({ busy: false }); await w.get('[data-testid="share-sns"]').trigger('click'); expect(w.emitted('sns')).toHaveLength(1)
  })
  it('C29 초대 수락 실패는 키보드를 유지하고 성공은 해제한다', async () => {
    const s = state(await mountPage(FriendsPage)); s.inputCode = 'ABCDEFGH'; mocks.dismiss.mockClear()
    mocks.sdk.acceptInvite!.mockResolvedValueOnce({ error: { message: 'failed' } }); await s.onAcceptInvite()
    expect(mocks.dismiss).not.toHaveBeenCalled(); expect(s.inputCode).toBe('ABCDEFGH')
    mocks.sdk.acceptInvite!.mockResolvedValueOnce({ data: { reward: { inviteeRuby: 1 } } }); await s.onAcceptInvite()
    expect(mocks.dismiss).toHaveBeenCalledTimes(1); expect(s.inputCode).toBe('')
  })
})


describe('T2-Y 이미지 공유와 배치 복구', () => {
  it('C18/C48 SNS action은 캡처 PNG를 공유하고 갤러리 완료를 주장하지 않는다', async () => {
    const w = await mountPage(HomePage); const s = state(w)
    // 캡처 대상은 실제 마운트한 스테이지 DOM이다.
    s.onSnsShare(); await flushPromises(); await flushPromises()
    expect(mocks.capture).toHaveBeenCalledTimes(1)
    expect(mocks.shareFile).toHaveBeenCalledTimes(1)
    expect(mocks.shareFile.mock.calls[0]![0]).toBeInstanceOf(Blob)
    expect(mocks.shareFile.mock.calls[0]![0].type).toBe('image/png')
    expect(mocks.toast.success).toHaveBeenCalledWith('이미지 공유·저장 요청 완료', expect.objectContaining({ description: '시스템 공유 또는 다운로드로 이미지를 전달했어요' }))
  })
  it('C16 실패 편집은 스냅샷 갱신에 남고 확인된 폐기만 서버 좌표로 돌아간다', async () => {
    const s = state(await mountPage(HomePage)); s.editMode = true
    s.placedItems = [{ placementId: 1, itemId: 1, x: 150, y: 300, scale: 2, flipped: true, zIndex: 1 }]
    s.dirtyPlacementIds.add(1)
    const snapshot = { terrarium: { placedItems: [], maxSlots: 6 }, freePlacements: { items: [{ placementId: 1, itemId: 1, isFreePlacement: true, posX: 0.25, posY: 0.5, scale: 1, flipped: false, zIndex: 0 }] } }
    s.applySnapshot(snapshot); expect(s.placedItems[0].scale).toBe(2); expect(s.placedItems[0].x).toBe(150)
    mocks.home.snapshot = snapshot as unknown as typeof mocks.home.snapshot
    s.exitManageMode(); s.manageExitTarget(true)
    expect(s.placedItems[0].scale).toBe(1); expect(s.placedItems[0].x).toBe(100)
    expect(s.editMode).toBe(false); expect(s.dirtyPlacementIds.size).toBe(0)
  })
})
