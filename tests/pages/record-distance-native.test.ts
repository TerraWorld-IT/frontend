import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import RecordPage from '~/pages/record/index.vue'

// B5: 네이티브 거리 트래커 — 이전 세션의 늦은 drain 응답 차단과 stop() 실패 보존·재시도.
// 실제 브리지 모듈(~/lib/nativeDistanceTracker)을 쓰고 Capacitor 플러그인 등록만 가짜 플러그인으로 바꾼다.
const mocks = vi.hoisted(() => ({
  native: false,
  tracker: { isAvailable: vi.fn(), start: vi.fn(), drain: vi.fn(), stop: vi.fn() },
  sdk: { listCategories: vi.fn(), listFriends: vi.fn(), getGrowth: vi.fn(), createRecord: vi.fn() },
  routeLeave: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))
vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>()
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: () => mocks.native,
      getPlatform: () => (mocks.native ? 'android' : 'web'),
      isPluginAvailable: (name: string) => (name === 'DistanceTracker' ? mocks.native : actual.Capacitor.isPluginAvailable(name)),
    },
    registerPlugin: ((name: string, impl?: object) => (name === 'DistanceTracker' ? mocks.tracker : actual.registerPlugin(name, impl))) as typeof actual.registerPlugin,
  }
})
vi.mock('vue-router', async () => ({ ...(await vi.importActual('vue-router')), onBeforeRouteLeave: mocks.routeLeave }))
vi.mock('~/stores/user', () => ({ useUserStore: () => ({ me: { userId: 'record-user' }, fetchMe: vi.fn(async () => undefined) }) }))
vi.mock('~/lib/auth-client', () => ({ authClient: { useSession: () => ref({ data: { user: { id: 'record-user' } } }) } }))
mockNuxtImport('useOpenApi', () => () => ({ sdk: mocks.sdk, client: {} }))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('useGtagEvents', () => () => ({ trackRecordCreated: vi.fn() }))
mockNuxtImport('useHabits', () => () => ({ trackers: ref([]), loaded: ref(true), loadError: ref(false), load: vi.fn() }))
mockNuxtImport('dismissKeyboard', () => vi.fn())

type Fix = { seq: number, time: number, lat: number, lng: number, accuracy: number }
// 위도 0.00009° ≈ 10m — 50m 미만 이동만 집계하는 규칙 안에서 거리 증가를 만든다.
function fixes(...seqs: number[]): { fixes: Fix[], lastSeq: number } {
  return { fixes: seqs.map(seq => ({ seq, time: seq, lat: 37 + seq * 0.00009, lng: 127, accuracy: 5 })), lastSeq: seqs.at(-1) ?? 0 }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

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
function sessionOf(call: number): string {
  return mocks.tracker.start.mock.calls[call]![0].sessionId
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.native = true
  mocks.tracker.isAvailable.mockReset().mockResolvedValue({ available: true })
  mocks.tracker.start.mockReset().mockResolvedValue(undefined)
  mocks.tracker.drain.mockReset().mockResolvedValue(fixes())
  mocks.tracker.stop.mockReset().mockResolvedValue(fixes())
  mocks.sdk.listCategories.mockResolvedValue({ data: { categories: [{ id: 1, name: '낙서', isCustom: false }] } })
  mocks.sdk.listFriends.mockResolvedValue({ data: [] })
  mocks.sdk.getGrowth.mockResolvedValue({ data: { items: [] } })
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    watchPosition: vi.fn(() => 17), clearWatch: vi.fn(),
    getCurrentPosition: vi.fn((success: (pos: unknown) => void) => success({ coords: { latitude: 37, longitude: 127 } })),
  } })
})
afterEach(async () => {
  wrappers.splice(0).reverse().forEach(wrapper => wrapper.unmount())
  await flushPromises()
  mocks.native = false
})

async function startNative(s: Record<string, any>) {
  s.openModal = 'distance'
  await s.startDistance()
  expect(s.nativeTracking).toBe(true)
}

describe('B5 거리 기록 네이티브 세션', () => {
  it('초기화 뒤 도착한 이전 세션의 drain 응답은 새 세션의 거리와 seq 를 오염시키지 않는다', async () => {
    const s = state(await mountPage())
    await startNative(s)
    const oldSession = sessionOf(0)
    const late = deferred<ReturnType<typeof fixes>>()
    mocks.tracker.drain.mockReturnValueOnce(late.promise)
    const draining = s.drainNative()
    await vi.waitFor(() => expect(mocks.tracker.drain).toHaveBeenCalledWith({ sessionId: oldSession, afterSeq: 0 }))

    s.resetDistance()
    await startNative(s)
    const newSession = sessionOf(1)
    expect(newSession).not.toBe(oldSession)
    late.resolve(fixes(1, 2, 3, 4, 5))
    await draining
    expect(s.distance).toBe(0)
    expect(s.nativeLastSeq).toBe(0)

    // 새 세션의 seq 1부터 정상 집계된다(이전 응답이 seq 를 앞당겼다면 건너뛰었을 것).
    mocks.tracker.drain.mockResolvedValueOnce(fixes(1, 2))
    await s.drainNative()
    expect(mocks.tracker.drain).toHaveBeenLastCalledWith({ sessionId: newSession, afterSeq: 0 })
    expect(s.nativeLastSeq).toBe(2)
    expect(s.distance).toBeGreaterThan(5)
  })

  it('종료 중 도착한 drain 응답은 반영하지 않고 종료 응답만 반영한다', async () => {
    const s = state(await mountPage())
    await startNative(s)
    const late = deferred<ReturnType<typeof fixes>>()
    mocks.tracker.drain.mockReturnValueOnce(late.promise)
    const draining = s.drainNative()
    await vi.waitFor(() => expect(mocks.tracker.drain).toHaveBeenCalledTimes(1))
    mocks.tracker.stop.mockResolvedValueOnce(fixes(1, 2))
    expect(await s.stopDistance()).toBe(true)
    late.resolve(fixes(1, 2, 3, 4, 5, 6))
    await draining
    expect(s.distPhase).toBe('done')
    expect(s.nativeLastSeq).toBe(2)
  })

  it('stop() 실패를 숨기지 않고 측정 상태와 세션을 보존하며 같은 세션으로 다시 종료할 수 있다', async () => {
    const s = state(await mountPage())
    await startNative(s)
    const session = sessionOf(0)
    mocks.tracker.drain.mockResolvedValueOnce(fixes(1))
    await s.drainNative()
    mocks.tracker.stop.mockRejectedValueOnce(new Error('bridge unavailable'))
    expect(await s.stopDistance()).toBe(false)
    expect(mocks.toast.error).toHaveBeenCalledExactlyOnceWith('거리 측정을 종료하지 못했어요. 다시 시도해 주세요.')
    expect(s.distPhase).toBe('tracking')
    expect(s.nativeTracking).toBe(true)
    expect(s.nativeSessionId).toBe(session)
    expect(s.submitting).toBe(false)
    // 보존된 세션에서는 수집이 계속 반영된다.
    mocks.tracker.drain.mockResolvedValueOnce(fixes(2))
    await s.drainNative()
    expect(s.nativeLastSeq).toBe(2)

    mocks.tracker.stop.mockResolvedValueOnce(fixes(3))
    expect(await s.stopDistance()).toBe(true)
    expect(mocks.tracker.stop).toHaveBeenCalledTimes(2)
    expect(mocks.tracker.stop).toHaveBeenNthCalledWith(1, { sessionId: session, afterSeq: 1 })
    expect(mocks.tracker.stop).toHaveBeenNthCalledWith(2, { sessionId: session, afterSeq: 2 })
    expect(s.distPhase).toBe('done')
    expect(s.nativeLastSeq).toBe(3)
  })

  it('종료 대기 중 복귀해도 웹 watch 를 시작하지 않고, 종료가 실패하면 네이티브 수집만 복구한다', async () => {
    const s = state(await mountPage())
    await startNative(s)
    const session = sessionOf(0)
    mocks.tracker.drain.mockResolvedValueOnce(fixes(1))
    await s.drainNative()
    const watchPosition = navigator.geolocation.watchPosition as ReturnType<typeof vi.fn>
    expect(watchPosition).not.toHaveBeenCalled()

    const pendingStop = deferred<ReturnType<typeof fixes>>()
    mocks.tracker.stop.mockReturnValueOnce(pendingStop.promise)
    s.pauseDistanceWatchForBackground()
    const stopping = s.stopDistance()
    await vi.waitFor(() => expect(mocks.tracker.stop).toHaveBeenCalledTimes(1))
    expect(s.nativeTracking).toBe(false)
    // 종료 대기 중 앱 복귀 — 서비스가 아직 수집 중일 수 있어 웹 watch 를 띄우지 않는다.
    s.resumeDistanceWatchFromBackground()
    await flushPromises()
    expect(watchPosition).not.toHaveBeenCalled()
    expect(s.distWatchId).toBeNull()

    pendingStop.reject(new Error('bridge unavailable'))
    expect(await stopping).toBe(false)
    expect(s.nativeTracking).toBe(true)
    expect(s.nativeSessionId).toBe(session)
    expect(s.distWatchId).toBeNull()
    expect(watchPosition).not.toHaveBeenCalled()

    // 복구 뒤 같은 이동(10m)은 네이티브 경로로 한 번만 집계된다.
    mocks.tracker.drain.mockResolvedValueOnce(fixes(2))
    await s.drainNative()
    expect(s.distance).toBeGreaterThan(9)
    expect(s.distance).toBeLessThan(11)
    expect(watchPosition).not.toHaveBeenCalled()
  })

  it('화면을 떠나며 종료가 실패하면 안내하고 다음 측정 시작 전에 같은 세션을 다시 종료한다', async () => {
    const first = await mountPage()
    const s = state(first)
    await startNative(s)
    const orphan = sessionOf(0)
    mocks.tracker.stop.mockRejectedValueOnce(new Error('bridge unavailable'))
    first.unmount()
    wrappers.splice(wrappers.indexOf(first), 1)
    await vi.waitFor(() => expect(mocks.toast.info).toHaveBeenCalledWith('거리 측정 종료를 확인하지 못했어요. 다음에 기록 화면을 열 때 다시 종료할게요.'))

    // 다음 화면 진입이 같은 세션을 다시 종료한다(네이티브 stop 은 멱등).
    mocks.tracker.stop.mockClear()
    const next = state(await mountPage())
    await vi.waitFor(() => expect(mocks.tracker.stop).toHaveBeenCalledWith({ sessionId: orphan, afterSeq: 0 }))
    mocks.tracker.stop.mockClear()
    await startNative(next)
    // 성공한 재종료는 대기 목록에서 빠져 새 세션 시작 때 다시 호출하지 않는다.
    expect(mocks.tracker.stop).not.toHaveBeenCalledWith({ sessionId: orphan, afterSeq: 0 })
  })

  it('초기화 때 종료가 실패한 이전 세션을 새 세션 시작보다 먼저 다시 종료한다', async () => {
    const s = state(await mountPage())
    await startNative(s)
    const orphan = sessionOf(0)
    mocks.tracker.stop.mockRejectedValueOnce(new Error('bridge unavailable'))
    s.resetDistance()
    await vi.waitFor(() => expect(mocks.toast.info).toHaveBeenCalledTimes(1))
    mocks.tracker.stop.mockClear()
    await startNative(s)
    expect(mocks.tracker.stop).toHaveBeenCalledWith({ sessionId: orphan, afterSeq: 0 })
    expect(mocks.tracker.stop.mock.invocationCallOrder[0]!).toBeLessThan(mocks.tracker.start.mock.invocationCallOrder[1]!)
    expect(sessionOf(1)).not.toBe(orphan)
  })
})
