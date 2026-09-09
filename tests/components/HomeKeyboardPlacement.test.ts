import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref, type Component } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import HomePage from '~/pages/index.vue'

const mocks = vi.hoisted(() => ({
  sdk: Object.fromEntries(['updateFreePosition', 'updateTerrariumPlacements', 'listCategories', 'listFriends', 'createRecord', 'getRecordStatistics', 'listRecords', 'getNote', 'saveNote', 'deleteNote', 'getUnreadNotificationCount'].map(key => [key, vi.fn()])),
  user: { me: { userId: 'u1', nickname: '테스트', currency: {}, ownedItems: [], entitlements: { freePlacement: true } }, fetchMe: vi.fn(), updateCurrency: vi.fn() },
  home: { snapshot: { terrarium: { placedItems: [], maxSlots: 6 }, freePlacements: { items: [] } }, fetch: vi.fn(), invalidate: vi.fn(), patchFreePlacement: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  routeLeave: vi.fn(),
}))
vi.mock('vue-router', async () => ({ ...(await vi.importActual('vue-router')), onBeforeRouteLeave: mocks.routeLeave }))
vi.mock('~/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('~/stores/items', () => ({ useItemsStore: () => ({ items: [], fetchAll: vi.fn() }) }))
vi.mock('~/stores/homeSnapshot', () => ({ useHomeSnapshotStore: () => mocks.home }))
mockNuxtImport('useOpenApi', () => () => ({ sdk: mocks.sdk, client: {} }))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('dismissKeyboard', () => vi.fn())
mockNuxtImport('useGtagEvents', () => () => new Proxy({}, { get: () => vi.fn() }))
mockNuxtImport('useNative', () => () => ({ isNative: false, hapticImpact: vi.fn(), registerPushIfGranted: vi.fn(async () => undefined) }))
mockNuxtImport('useAuth', () => () => ({ isLoggedIn: ref<boolean>(true), loadJwt: vi.fn(async () => 'test-token') }))
mockNuxtImport('useHabits', () => () => ({ trackers: ref<never[]>([]), loaded: ref<boolean>(true), loadError: ref<boolean>(false), load: vi.fn() }))
mockNuxtImport('useAttendance', () => () => ({ state: ref<null>(null), loading: ref<boolean>(false), error: ref<string | null>(null), refresh: vi.fn() }))
mockNuxtImport('useTier', () => () => ({ state: ref<null>(null), catalog: ref<null>(null), loading: ref<boolean>(false), loadError: ref<boolean>(false), load: vi.fn() }))
mockNuxtImport('useBgm', () => () => ({ enabled: ref<boolean>(false), playing: ref<boolean>(false), hasSource: false, play: vi.fn(), stop: vi.fn() }))
mockNuxtImport('useAdMob', () => () => ({ isNative: false, isAndroid: false, isIos: false }))
mockNuxtImport('useAppUpdate', () => () => ({ updateRequired: ref<boolean>(true), isNative: false, check: vi.fn(), openStore: vi.fn() }))

const wrappers: VueWrapper[] = []
async function mountPage(component: Component) {
  const wrapper = await mountSuspended(component, {
    shallow: true, attachTo: document.body,
    global: { renderStubDefaultSlot: true },
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
  mocks.user.me.entitlements.freePlacement = true
  for (const fn of Object.values(mocks.sdk)) fn.mockReset().mockResolvedValue({ data: [], error: undefined })
  mocks.sdk.listCategories!.mockResolvedValue({ data: { categories: [{ id: 1, name: '독서', isCustom: false }] } })
  mocks.sdk.listRecords!.mockResolvedValue({ data: { content: [], totalPages: 1 } })
  mocks.sdk.getRecordStatistics!.mockResolvedValue({ data: { totalRecords: 0, byCategory: [] } })
  mocks.sdk.getNote!.mockResolvedValue({ data: { note: '서버 메모' } })
  mocks.user.fetchMe.mockResolvedValue(undefined)
  mocks.home.fetch.mockReset().mockResolvedValue(undefined)
  localStorage.clear()
})
afterEach(() => {
  wrappers.splice(0).reverse().forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  document.body.innerHTML = ''
})

async function managePage() {
  const wrapper = await mountPage(HomePage)
  const s = state(wrapper)
  s.editMode = true
  s.placedItems = [1, 2].map(id => ({
    placementId: id, itemId: id, name: `식물${id}`, image: '🌵', isAnimated: false,
    x: 100, y: 300, scale: 1, flipped: false, zIndex: 0, rarity: 'common',
  }))
  await nextTick()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  return { wrapper, s, item: wrapper.get('[role="button"][aria-label="식물1"]') }
}

describe('홈 배치 키보드 조작', () => {
  it('관리 모드에서만 포커스·이름을 제공하고 Enter/Space로 선택한다', async () => {
    const { wrapper, s, item } = await managePage()
    expect(item.attributes('tabindex')).toBe('0')
    await item.trigger('keydown', { key: 'Enter', isComposing: true })
    expect(s.selectedItemId).toBeNull()
    await item.trigger('keydown', { key: 'Enter' })
    expect(s.selectedItemId).toBe(1)
    await item.trigger('keydown', { key: ' ' })
    expect(s.selectedItemId).toBeNull()
    s.editMode = false
    await nextTick()
    expect(wrapper.find('[role="button"][aria-label="식물1"]').exists()).toBe(false)
    expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
  })

  it('본체에 포커스한 뒤 Enter로 선택하고 본체·작업·코너 순서로 포커스 대상을 제공한다', async () => {
    const { wrapper, s, item } = await managePage()
    ;(item.element as HTMLElement).focus()
    expect(document.activeElement).toBe(item.element)
    await item.trigger('keydown', { key: 'Enter' })
    expect(s.selectedItemId).toBe(1)
    const focusable = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
    for (const body of wrapper.findAll('[role="button"]')) {
      expect(body.findAll(focusable)).toHaveLength(0)
    }
    const placement = item.element.parentElement!
    const actions = wrapper.findAll('[data-testid^="home-item-action-"]')
    const corners = wrapper.findAll('[data-testid^="home-resize-"]')
    expect(actions).toHaveLength(4)
    expect(corners).toHaveLength(4)
    expect([...placement.querySelectorAll(focusable)]).toEqual([
      item.element, ...actions.map(button => button.element), ...corners.map(button => button.element),
    ])
    for (const button of [...actions, ...corners]) expect(button.element.parentElement).toBe(placement)
  })

  it('방향키는 4px씩 이동하고 마지막 키 이후 300ms에 최종 좌표만 한 번 저장한다', async () => {
    const { s, item } = await managePage()
    await item.trigger('keydown', { key: 'ArrowRight' })
    expect(s.placedItems[0].x).toBe(104)
    expect(s.dirtyPlacementIds.has(1)).toBe(true)
    await vi.advanceTimersByTimeAsync(299)
    expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
    await item.trigger('keydown', { key: 'ArrowDown' })
    expect(s.placedItems[0].y).toBe(304)
    await vi.advanceTimersByTimeAsync(299)
    expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(mocks.sdk.updateFreePosition).toHaveBeenCalledTimes(1)
    expect(mocks.sdk.updateFreePosition).toHaveBeenCalledWith(expect.objectContaining({
      path: { placementId: 1 }, body: { posX: 104 / 400, posY: 304 / 552, scale: 1, flipped: false, zIndex: 0 },
    }))
    expect(s.dirtyPlacementIds.size).toBe(0)
  })

  it('이동은 편집 영역과 시각 반지름 경계에서 멈춘다', async () => {
    const { s, item } = await managePage()
    s.placedItems[0].x = 48
    s.placedItems[0].y = 220
    await item.trigger('keydown', { key: 'ArrowLeft' })
    await item.trigger('keydown', { key: 'ArrowUp' })
    expect(s.placedItems[0]).toMatchObject({ x: 48, y: 220 })
    s.placedItems[0].x = 352
    s.placedItems[0].y = 504
    await item.trigger('keydown', { key: 'ArrowRight' })
    await item.trigger('keydown', { key: 'ArrowDown' })
    expect(s.placedItems[0]).toMatchObject({ x: 352, y: 504 })
  })

  it('코너 +/-는 크기와 좌표를 clamp하고 부모의 선택을 바꾸지 않는다', async () => {
    const { wrapper, s, item } = await managePage()
    await item.trigger('keydown', { key: 'Enter' })
    const corner = wrapper.get('[data-testid="home-resize-br"]')
    await corner.trigger('keydown', { key: '+' })
    expect(s.placedItems[0].scale).toBeCloseTo(1.1)
    s.placedItems[0].scale = 3.95
    s.placedItems[0].x = 352
    s.placedItems[0].y = 504
    await corner.trigger('keydown', { key: '+' })
    expect(s.placedItems[0]).toMatchObject({ scale: 4, x: 208, y: 360 })
    s.placedItems[0].scale = 0.35
    await corner.trigger('keydown', { key: '-' })
    expect(s.placedItems[0].scale).toBe(0.3)
    await corner.trigger('keydown', { key: 'Enter' })
    expect(s.selectedItemId).toBe(1)
    await vi.advanceTimersByTimeAsync(300)
    expect(mocks.sdk.updateFreePosition).toHaveBeenCalledTimes(1)
  })

  it.each(['placementBusy', 'saving', 'backgroundBusy'])('%s 중 선택·이동·크기를 바꾸거나 저장하지 않는다', async (busy) => {
    const { wrapper, s, item } = await managePage()
    await item.trigger('keydown', { key: 'Enter' })
    const corner = wrapper.get('[data-testid="home-resize-br"]')
    s[busy] = true
    await nextTick()
    await item.trigger('keydown', { key: ' ' })
    await item.trigger('keydown', { key: 'ArrowRight' })
    await corner.trigger('keydown', { key: '+' })
    await vi.advanceTimersByTimeAsync(300)
    expect(s.selectedItemId).toBe(1)
    expect(s.placedItems[0]).toMatchObject({ x: 100, y: 300, scale: 1 })
    expect(s.dirtyPlacementIds.size).toBe(0)
    expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
  })

  it.each(['placementBusy', 'saving', 'backgroundBusy'])('입력 뒤 시작한 %s가 끝나면 추가 입력 없이 최종 좌표를 한 번 저장한다', async (busy) => {
    const { s, item } = await managePage()
    await item.trigger('keydown', { key: 'ArrowRight' })
    await vi.advanceTimersByTimeAsync(100)
    s[busy] = true
    await vi.advanceTimersByTimeAsync(800)
    expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
    expect(s.dirtyPlacementIds.has(1)).toBe(true)
    s[busy] = false
    await vi.advanceTimersByTimeAsync(300)
    expect(mocks.sdk.updateFreePosition).toHaveBeenCalledTimes(1)
    expect(mocks.sdk.updateFreePosition).toHaveBeenCalledWith(expect.objectContaining({
      path: { placementId: 1 }, body: expect.objectContaining({ posX: 104 / 400, posY: 300 / 552 }),
    }))
    expect(s.dirtyPlacementIds.size).toBe(0)
    await vi.advanceTimersByTimeAsync(900)
    expect(mocks.sdk.updateFreePosition).toHaveBeenCalledTimes(1)
  })

  it('다른 아이템으로 포커스를 옮겨도 각 최종 위치를 저장한다', async () => {
    const { wrapper, item } = await managePage()
    await item.trigger('keydown', { key: 'ArrowRight' })
    await wrapper.get('[role="button"][aria-label="식물2"]').trigger('keydown', { key: 'ArrowLeft' })
    await vi.advanceTimersByTimeAsync(300)
    expect(mocks.sdk.updateFreePosition).toHaveBeenCalledTimes(2)
  })

  it('스냅샷 재적용이 객체를 교체해도 유지된 키보드 초안을 저장한다', async () => {
    const { s, item } = await managePage()
    await item.trigger('keydown', { key: 'ArrowRight' })
    const previous = s.placedItems[0]
    s.applySnapshot({
      terrarium: { placedItems: [], maxSlots: 6 },
      freePlacements: { items: [{
        placementId: 1, itemId: 1, itemImage: '🌵', itemName: '식물1',
        posX: 0.1, posY: 0.1, scale: 1, flipped: false, zIndex: 0, isFreePlacement: true,
      }] },
    })
    expect(s.placedItems[0]).not.toBe(previous)
    expect(s.placedItems[0].x).toBe(104)
    await vi.advanceTimersByTimeAsync(300)
    expect(mocks.sdk.updateFreePosition).toHaveBeenCalledTimes(1)
    expect(mocks.sdk.updateFreePosition).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ posX: 104 / 400 }) }))
  })

  it('미보유는 미리보기만 이동하고 dirty나 API 요청을 남기지 않는다', async () => {
    mocks.user.me.entitlements.freePlacement = false
    const { s, item } = await managePage()
    await item.trigger('keydown', { key: 'ArrowRight' })
    await vi.advanceTimersByTimeAsync(300)
    expect(s.placedItems[0].x).toBe(104)
    expect(s.dirtyPlacementIds.size).toBe(0)
    expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
    s.exitManageMode()
    expect(s.editMode).toBe(false)
  })

  it.each(['폐기', '언마운트', '삭제'])('%s 후 지연 저장이 이전 배치를 쓰지 않는다', async (action) => {
    const { wrapper, s, item } = await managePage()
    await item.trigger('keydown', { key: 'ArrowRight' })
    if (action === '폐기') {
      s.exitManageMode()
      s.manageExitTarget(true)
    }
    else if (action === '언마운트') wrapper.unmount()
    else await s.removeItem(s.placedItems[0])
    await vi.advanceTimersByTimeAsync(300)
    expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
  })

  it.each(['성공', '실패'])('삭제 응답 뒤 재조회 %s에도 삭제한 배치의 보류 예약과 dirty를 즉시 지운다', async (reloadResult) => {
    const { s, item } = await managePage()
    // 삭제할 한 개의 배치를 준비하고 삭제 응답과 후속 재조회만 외부 I/O 경계에서 제어한다.
    s.placedItems = [s.placedItems[0]]
    s.terrarium = { placedItems: [{ itemId: 1, slotId: 0 }], maxSlots: 6 }
    const removed = s.placedItems[0]
    let finishDelete!: (result: { error: undefined }) => void
    mocks.sdk.updateTerrariumPlacements!.mockReturnValueOnce(new Promise<{ error: undefined }>((resolve) => {
      finishDelete = resolve
    }))
    let finishReload!: () => void
    let rejectReload!: (error: Error) => void
    mocks.home.fetch.mockReturnValueOnce(new Promise<void>((resolve, reject) => {
      finishReload = resolve
      rejectReload = reject
    }))
    mocks.home.fetch.mockClear()

    await item.trigger('keydown', { key: 'ArrowRight' })
    await vi.advanceTimersByTimeAsync(100)
    const removal = s.removeItem(removed)
    expect(s.placementBusy).toBe(true)
    expect(mocks.sdk.updateTerrariumPlacements).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      body: { placedItems: [] },
    }))
    await vi.advanceTimersByTimeAsync(800)
    expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
    expect(mocks.home.fetch).not.toHaveBeenCalled()
    expect(s.keyboardPlacementTimers.size).toBe(1)
    expect(s.dirtyPlacementIds.has(1)).toBe(true)

    finishDelete({ error: undefined })
    await flushPromises()
    expect(mocks.home.fetch).toHaveBeenCalledExactlyOnceWith(true)
    expect(s.placementBusy).toBe(true)
    expect.soft(s.keyboardPlacementTimers.size).toBe(0)
    expect.soft(vi.getTimerCount()).toBe(0)
    expect(s.dirtyPlacementIds.size).toBe(0)
    if (reloadResult === '실패') rejectReload(new Error('삭제 후 재조회 실패'))
    else finishReload()
    await removal
    expect(s.placementBusy).toBe(false)
    if (reloadResult === '실패') {
      expect(s.placedItems[0]).toBe(removed)
      expect(mocks.toast.error).toHaveBeenCalledWith('삭제 후 재조회 실패')
    }
    else {
      expect(s.placedItems).toHaveLength(0)
      expect(mocks.toast.success).toHaveBeenCalledWith('아이템이 제거되었습니다!')
    }
    await vi.advanceTimersByTimeAsync(300)
    expect.soft(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
    expect(s.keyboardPlacementTimers.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(s.dirtyPlacementIds.size).toBe(0)
  })

  it('종료 확인창에서 300ms 이상 기다린 뒤 저장하지 않고 종료해도 저장하지 않는다', async () => {
    const { s, item } = await managePage()
    await item.trigger('keydown', { key: 'ArrowRight' })
    await vi.advanceTimersByTimeAsync(100)
    s.exitManageMode()
    expect(s.manageExitTarget).toBeTypeOf('function')
    await vi.advanceTimersByTimeAsync(900)
    expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
    expect(s.dirtyPlacementIds.has(1)).toBe(true)
    s.manageExitTarget(true)
    await vi.advanceTimersByTimeAsync(900)
    expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
    expect(s.editMode).toBe(false)
    expect(s.dirtyPlacementIds.size).toBe(0)
  })

  it('종료를 취소하면 초안을 유지하고 다음 키 입력으로 저장을 다시 예약한다', async () => {
    const { s, item } = await managePage()
    await item.trigger('keydown', { key: 'ArrowRight' })
    s.exitManageMode()
    s.manageExitTarget(false)
    await vi.advanceTimersByTimeAsync(900)
    expect(s.editMode).toBe(true)
    expect(s.dirtyPlacementIds.has(1)).toBe(true)
    expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
    await item.trigger('keydown', { key: 'ArrowDown' })
    await vi.advanceTimersByTimeAsync(300)
    expect(mocks.sdk.updateFreePosition).toHaveBeenCalledTimes(1)
    expect(mocks.sdk.updateFreePosition).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.objectContaining({ posX: 104 / 400, posY: 304 / 552 }),
    }))
  })

  it.each(['명시 저장', '폐기', '언마운트', '삭제'])('busy 중 보류한 예약도 %s 후에는 다시 저장하지 않는다', async (action) => {
    const { wrapper, s, item } = await managePage()
    await item.trigger('keydown', { key: 'ArrowRight' })
    s.backgroundBusy = true
    await vi.advanceTimersByTimeAsync(600)
    s.backgroundBusy = false
    if (action === '명시 저장') await s.onSaveManage()
    else if (action === '폐기') {
      s.exitManageMode()
      await vi.advanceTimersByTimeAsync(600)
      expect(mocks.sdk.updateFreePosition).not.toHaveBeenCalled()
      s.manageExitTarget(true)
    }
    else if (action === '언마운트') wrapper.unmount()
    else await s.removeItem(s.placedItems[0])
    await vi.advanceTimersByTimeAsync(900)
    expect(mocks.sdk.updateFreePosition).toHaveBeenCalledTimes(action === '명시 저장' ? 1 : 0)
  })

  it('명시 저장은 지연 저장을 취소하고 실패 건은 dirty로 재시도 가능하게 유지한다', async () => {
    const { s, item } = await managePage()
    mocks.sdk.updateFreePosition!.mockResolvedValueOnce({ error: { message: '실패' } })
    await item.trigger('keydown', { key: 'ArrowRight' })
    await s.onSaveManage()
    await vi.advanceTimersByTimeAsync(300)
    expect(mocks.sdk.updateFreePosition).toHaveBeenCalledTimes(1)
    expect(s.dirtyPlacementIds.has(1)).toBe(true)
    expect(s.editMode).toBe(true)
    await s.onSaveManage()
    expect(mocks.sdk.updateFreePosition).toHaveBeenCalledTimes(2)
    expect(s.editMode).toBe(false)
  })
})
