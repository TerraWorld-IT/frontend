import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useAppReview } from '~/composables/useAppReview'

const mocks = vi.hoisted(() => ({
  platform: 'ios', available: true,
  getInfo: vi.fn(), requestReview: vi.fn(), registerPlugin: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: null }),
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => mocks.platform, isPluginAvailable: (name: string) => name === 'InAppReview' && mocks.available },
  registerPlugin: (name: string) => { mocks.registerPlugin(name); return { requestReview: mocks.requestReview } },
}))
vi.mock('@capacitor/app', () => ({ App: { getInfo: mocks.getInfo } }))
vi.mock('~/lib/auth-client', () => ({ authClient: { useSession: () => ref<{ data: null }>({ data: null }), getSession: mocks.getSession } }))

const key = 'tw:app-review:user-a'
function day(n: number) { vi.setSystemTime(new Date(`2026-10-${String(n).padStart(2, '0')}T12:00:00+09:00`)) }
async function threeDays(request = useAppReview('user-a').maybeRequestReview) {
  for (const n of [1, 2, 3]) { day(n); await request() }
}

// happy-dom 저장소 프록시는 spyOn 교체를 복원하지 못해 다음 테스트로 새므로(useAdMob.test 와 같은 이유)
// 실패를 주입할 때는 메모리 저장소로 전역을 대체한다.
function stubStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed))
  const fail = { getItem: false, setItem: false }
  const storage = {
    getItem: vi.fn((name: string) => { if (fail.getItem) throw new Error('storage denied'); return data.get(name) ?? null }),
    setItem: vi.fn((name: string, value: string) => { if (fail.setItem) throw new Error('storage denied'); data.set(name, String(value)) }),
  }
  vi.stubGlobal('localStorage', storage)
  return { storage, fail, data }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  localStorage.clear()
  mocks.platform = 'ios'
  mocks.available = true
  mocks.getInfo.mockReset().mockResolvedValue({ version: '1.0.4' })
  mocks.requestReview.mockReset().mockResolvedValue(undefined)
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear() })

describe('iOS 평점 요청', () => {
  it.each(['web', 'android', 'missing-plugin'])('%s에서는 저장하거나 플러그인을 부르지 않는다', async (platform) => {
    if (platform === 'missing-plugin') mocks.available = false
    else mocks.platform = platform
    await threeDays()
    expect(mocks.requestReview).not.toHaveBeenCalled()
    expect(mocks.getInfo).not.toHaveBeenCalled()
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('같은 KST 날짜의 중복 성공은 하루로 세고 세 번째 날짜에 요청한다', async () => {
    const { maybeRequestReview } = useAppReview('user-a')
    vi.setSystemTime(new Date('2026-10-01T14:59:59Z'))
    await maybeRequestReview()
    await maybeRequestReview()
    vi.setSystemTime(new Date('2026-10-01T15:00:00Z'))
    await maybeRequestReview()
    await maybeRequestReview()
    expect(JSON.parse(localStorage.getItem(key)!).days).toEqual(['2026-10-01', '2026-10-02'])
    expect(mocks.requestReview).not.toHaveBeenCalled()
    day(3)
    await maybeRequestReview()
    expect(mocks.registerPlugin).toHaveBeenCalledWith('InAppReview')
    expect(mocks.requestReview).toHaveBeenCalledTimes(1)
  })

  it('같은 버전의 동시·후속 호출을 막고 새 버전에서만 다시 요청한다', async () => {
    await threeDays()
    const a = useAppReview('user-a')
    const b = useAppReview('user-a')
    day(4)
    await Promise.all([a.maybeRequestReview(), b.maybeRequestReview()])
    expect(mocks.requestReview).toHaveBeenCalledTimes(1)
    mocks.getInfo.mockResolvedValue({ version: '1.0.5' })
    await Promise.all([a.maybeRequestReview(), b.maybeRequestReview()])
    expect(mocks.requestReview).toHaveBeenCalledTimes(2)
    mocks.getInfo.mockResolvedValue({ version: '1.0.4' })
    await a.maybeRequestReview()
    expect(mocks.requestReview).toHaveBeenCalledTimes(2)
  })

  it('버전 기록 전 두 호출이 버전 조회를 겹쳐 기다려도 한 번만 요청한다', async () => {
    localStorage.setItem(key, JSON.stringify({ days: ['2026-10-01', '2026-10-02'], requestedVersions: [] }))
    let release!: () => void
    const pending = new Promise<{ version: string }>((resolve) => { release = () => resolve({ version: '1.0.4' }) })
    mocks.getInfo.mockReturnValue(pending)
    day(3)
    // vitest 는 동시에 겹친 동적 import 중 하나에 mock 이 아닌 실제 모듈을 주므로,
    // 첫 호출이 버전 조회에 들어간 뒤 두 번째 호출을 시작해 버전 조회 대기만 겹치게 한다.
    const first = useAppReview('user-a').maybeRequestReview()
    await vi.waitFor(() => expect(mocks.getInfo).toHaveBeenCalledTimes(1))
    const second = useAppReview('user-a').maybeRequestReview()
    await vi.waitFor(() => expect(mocks.getInfo).toHaveBeenCalledTimes(2))
    release()
    await Promise.all([first, second])
    expect(mocks.requestReview).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem(key)!).requestedVersions).toEqual(['1.0.4'])
  })

  it('로그인하지 않은 사용자와 다른 사용자의 기록일을 합치지 않는다', async () => {
    await threeDays(useAppReview(null).maybeRequestReview)
    expect(localStorage.length).toBe(0)
    await threeDays()
    await useAppReview('user-b').maybeRequestReview()
    expect(mocks.requestReview).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem('tw:app-review:user-b')!).days).toHaveLength(1)
  })

  it('버전 조회 중 사용자가 바뀌면 이전 사용자에게 요청하지 않는다', async () => {
    const user = ref('user-a')
    const { maybeRequestReview } = useAppReview(user)
    day(1); await maybeRequestReview()
    day(2); await maybeRequestReview()
    mocks.getInfo.mockImplementation(async () => { user.value = 'user-b'; return { version: '1.0.4' } })
    day(3); await maybeRequestReview()
    expect(mocks.requestReview).not.toHaveBeenCalled()
  })

  it('플러그인 거부를 삼키고 같은 버전에 재시도하지 않는다', async () => {
    mocks.requestReview.mockRejectedValue(new Error('native failure'))
    await expect(threeDays()).resolves.toBeUndefined()
    await useAppReview('user-a').maybeRequestReview()
    expect(mocks.requestReview).toHaveBeenCalledTimes(1)
  })

  it.each(['getItem', 'setItem'] as const)('localStorage.%s 예외는 밖으로 전파하지 않는다', async (method) => {
    const { storage, fail } = stubStorage()
    fail[method] = true
    await expect(threeDays()).resolves.toBeUndefined()
    expect(storage[method]).toHaveBeenCalled()
    expect(mocks.requestReview).not.toHaveBeenCalled()
  })

  it.each(['getItem', 'setItem'] as const)('버전 조회 후 localStorage.%s 실패 시에도 요청하지 않는다', async (method) => {
    const { storage, fail } = stubStorage({ [key]: JSON.stringify({ days: ['2026-10-01', '2026-10-02'], requestedVersions: [] }) })
    mocks.getInfo.mockImplementation(async () => {
      fail[method] = true
      return { version: '1.0.4' }
    })
    day(3)
    await expect(useAppReview('user-a').maybeRequestReview()).resolves.toBeUndefined()
    expect(mocks.getInfo).toHaveBeenCalledOnce()
    // 버전 조회 전 1회(성공) + 조회 후 1회(실패).
    expect(storage[method]).toHaveBeenCalledTimes(2)
    expect(mocks.requestReview).not.toHaveBeenCalled()
  })

  it('깨진 저장 상태와 버전 조회 실패도 조용히 무시한다', async () => {
    localStorage.setItem(key, '{broken')
    await expect(threeDays()).resolves.toBeUndefined()
    localStorage.removeItem(key)
    mocks.getInfo.mockRejectedValue(new Error('unavailable'))
    await expect(threeDays()).resolves.toBeUndefined()
    expect(mocks.requestReview).not.toHaveBeenCalled()
  })
})
