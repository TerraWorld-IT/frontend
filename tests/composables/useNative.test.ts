// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { STORAGE_KEYS } from '~/utils/constants'

const pushMocks = vi.hoisted(() => ({
  platform: 'web', native: false,
  getSession: vi.fn().mockResolvedValue({ data: null }), checkPermissions: vi.fn(), requestPermissions: vi.fn(), register: vi.fn(),
  addListener: vi.fn(), registerDevice: vi.fn(), deactivateMyDevices: vi.fn(),
  isLoggedIn: null as ReturnType<typeof ref<boolean>> | null, getJwt: vi.fn(),
  me: null as { userId: string } | null,
}))
vi.mock('@capacitor/core', () => ({ Capacitor: {
  getPlatform: () => pushMocks.platform, isNativePlatform: () => pushMocks.native,
} }))
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: pushMocks }))
vi.mock('~/lib/auth-client', () => ({ authClient: {
  getSession: pushMocks.getSession, useSession: () => ref<{ data: null }>({ data: null }),
} }))
vi.mock('@terraworld-it/openapi-frontend', () => ({ registerDevice: pushMocks.registerDevice, deactivateMyDevices: pushMocks.deactivateMyDevices }))
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn() } }))
vi.mock('~/stores/user', () => ({ useUserStore: () => ({ me: pushMocks.me }) }))
vi.mock('@capacitor/keyboard', () => ({ Keyboard: { addListener: vi.fn() } }))
mockNuxtImport('useAuth', () => () => ({ isLoggedIn: pushMocks.isLoggedIn ??= ref<boolean>(false), getJwt: pushMocks.getJwt, loadJwt: vi.fn(async () => null) }))
mockNuxtImport('useBackButtonStack', () => () => ({ popTopBackHandler: vi.fn() }))
mockNuxtImport('useGtagEvents', () => () => ({ trackPushRegistrationFailed: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  pushMocks.isLoggedIn = ref<boolean>(false)
  pushMocks.getJwt.mockReset().mockReturnValue('jwt-a')
  pushMocks.getSession.mockReset().mockResolvedValue({ data: { user: { id: 'user-a', pushConsent: true } } })
  pushMocks.checkPermissions.mockReset().mockResolvedValue({ receive: 'granted' })
  pushMocks.requestPermissions.mockReset().mockResolvedValue({ receive: 'granted' })
  pushMocks.register.mockReset().mockResolvedValue(undefined)
  pushMocks.registerDevice.mockReset().mockResolvedValue({})
  pushMocks.deactivateMyDevices.mockReset().mockResolvedValue({})
  pushMocks.addListener.mockReset().mockResolvedValue({ remove: vi.fn() })
  pushMocks.platform = 'web'; pushMocks.native = false
  pushMocks.me = null
  vi.clearAllMocks()
  localStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a')
  localStorage.removeItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-b')
  localStorage.removeItem(STORAGE_KEYS.PUSH_LOGOUT_PENDING_PREFIX + 'user-a')
  localStorage.removeItem(STORAGE_KEYS.PUSH_LOGOUT_PENDING_PREFIX + 'user-b')
})

/**
 * useNative 는 Capacitor.isNativePlatform() 분기로 native 환경에서만 실제
 * 액션을 수행. 웹 분기와 모의 네이티브 권한 분기를 검증하며 실기기 동작을 보장하지 않는다.
 */
describe('useNative contract', () => {
  it('exports useNative function', async () => {
    const mod = await import('~/composables/useNative')
    expect(typeof mod.useNative).toBe('function')
  })
  it('웹에서는 자동 푸시 등록을 수행하지 않는다', async () => {
    const { useNative } = await import('~/composables/useNative')
    expect(await useNative().registerPushIfGranted()).toBe(false)
    expect(await useNative().registerPush('user-a')).toBeNull()
    expect(pushMocks.getSession).not.toHaveBeenCalled()
    expect(pushMocks.register).not.toHaveBeenCalled()
  })
  it('기존 동의와 granted 권한이 있는 Android에서만 프롬프트 없이 등록한다', async () => {
    pushMocks.platform = 'android'; pushMocks.native = true
    const { useNative } = await import('~/composables/useNative')
    expect(await useNative().registerPushIfGranted()).toBe(true)
    expect(pushMocks.getSession).toHaveBeenCalledWith({ query: { disableCookieCache: true } })
    expect(pushMocks.checkPermissions).toHaveBeenCalledTimes(1)
    expect(pushMocks.register).toHaveBeenCalledTimes(1)
    expect(pushMocks.requestPermissions).not.toHaveBeenCalled()
  })
  it.each(['denied', 'prompt', 'prompt-with-rationale'])('기존 권한이 %s이면 요청도 등록도 하지 않는다', async (receive) => {
    pushMocks.platform = 'android'; pushMocks.native = true
    pushMocks.checkPermissions.mockResolvedValueOnce({ receive })
    const { useNative } = await import('~/composables/useNative')
    expect(await useNative().registerPushIfGranted()).toBe(false)
    expect(pushMocks.requestPermissions).not.toHaveBeenCalled()
    expect(pushMocks.register).not.toHaveBeenCalled()
  })
  it('철회된 동의와 iOS에서는 자동 등록을 하지 않는다', async () => {
    pushMocks.platform = 'android'; pushMocks.native = true
    pushMocks.getSession.mockResolvedValueOnce({ data: { user: { pushConsent: false } } })
    const { useNative } = await import('~/composables/useNative')
    expect(await useNative().registerPushIfGranted()).toBe(false)
    pushMocks.platform = 'ios'
    expect(await useNative().registerPushIfGranted()).toBe(false)
    expect(pushMocks.checkPermissions).not.toHaveBeenCalled()
    expect(pushMocks.register).not.toHaveBeenCalled()
  })

  it('자동 등록의 세션 응답이 OFF 뒤 도착하면 OS 등록을 폐기한다', async () => {
    pushMocks.platform = 'android'; pushMocks.native = true
    let resolve!: (value: object) => void
    pushMocks.getSession.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const { useNative } = await import('~/composables/useNative')
    const native = useNative()
    const registration = native.registerPushIfGranted()
    native.invalidatePushRegistration('user-a')
    resolve({ data: { user: { id: 'user-a', pushConsent: true } } })
    expect(await registration).toBe(false)
    expect(pushMocks.register).not.toHaveBeenCalled()
    expect(await native.registerPushIfGranted()).toBe(false)
    expect(pushMocks.getSession).toHaveBeenCalledTimes(2)
  })

  it('권한 확인 중 OFF가 되면 자동 등록을 폐기한다', async () => {
    pushMocks.platform = 'android'; pushMocks.native = true
    let resolve!: (value: object) => void
    pushMocks.checkPermissions.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const { useNative } = await import('~/composables/useNative')
    const native = useNative()
    const registration = native.registerPushIfGranted()
    await vi.waitFor(() => expect(pushMocks.checkPermissions).toHaveBeenCalledTimes(1))
    native.invalidatePushRegistration('user-a')
    resolve({ receive: 'granted' })
    expect(await registration).toBe(false)
    expect(pushMocks.register).not.toHaveBeenCalled()
  })

  it('등록 콜백의 지연 세션 응답과 OFF 이후 콜백이 디바이스를 재활성화하지 않는다', async () => {
    pushMocks.platform = 'android'; pushMocks.native = true
    const { useNative } = await import('~/composables/useNative')
    const { default: plugin } = await import('~/plugins/capacitor.client')
    await (plugin as (app: unknown) => Promise<void>)({ $apiClient: {} })
    const callback = pushMocks.addListener.mock.calls.find(([event]) => event === 'registration')?.[1] as (token: { value: string }) => Promise<void>
    expect(callback).toBeTypeOf('function')
    let resolve!: (value: object) => void
    pushMocks.getSession.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const pending = callback({ value: 'stale-token' })
    useNative().invalidatePushRegistration('user-a')
    // 서버 OFF 완료 뒤에도 이전 세션 응답은 동의 true일 수 있다.
    resolve({ data: { user: { id: 'user-a', pushConsent: true } } })
    await pending
    await callback({ value: 'late-token' })
    expect(pushMocks.registerDevice).not.toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_TOKEN)).toBeNull()
    // 명시적인 ON 뒤에는 정상 등록 경로가 다시 열린다.
    await useNative().registerPush('user-a')
    await callback({ value: 'new-token' })
    expect(pushMocks.registerDevice).toHaveBeenCalledExactlyOnceWith({ client: {}, body: { token: 'new-token', platform: 'ANDROID' } })
    localStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN)
  })

  it.each([false, true])('재시작 후 보류 디바이스 해제 오류 %s이면 자동 등록 없이 해제만 재시도한다', async (failed) => {
    pushMocks.platform = 'android'; pushMocks.native = true
    const { useNative } = await import('~/composables/useNative')
    useNative().invalidatePushRegistration('user-a')
    const pendingKey = STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a'
    localStorage.setItem(pendingKey, '1')
    // 새 모듈은 메모리 차단값이 없으므로 영속 보류 키와 서버 동의만으로 동작해야 한다.
    vi.resetModules()
    const restarted = await import('~/composables/useNative')
    pushMocks.getSession.mockResolvedValue({ data: { user: { id: 'user-a', pushConsent: false } } })
    pushMocks.deactivateMyDevices.mockResolvedValueOnce(failed ? { error: { message: 'failed' } } : {})
    expect(await restarted.useNative().registerPushIfGranted()).toBe(false)
    expect(pushMocks.deactivateMyDevices).toHaveBeenCalledExactlyOnceWith({ client: expect.objectContaining({ request: expect.any(Function) }) })
    expect(pushMocks.register).not.toHaveBeenCalled()
    expect(pushMocks.checkPermissions).not.toHaveBeenCalled()
    expect(localStorage.getItem(pendingKey)).toBe(failed ? '1' : null)
  })

  it.each([false, true])('세션 조회 대기 중 JWT 전환 %s에 따라 보류 해제를 건너뛰거나 완료한다', async (switched) => {
    pushMocks.platform = 'android'; pushMocks.native = true
    const pendingKey = STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a'
    localStorage.setItem(pendingKey, '1')
    let resolve!: (value: object) => void
    pushMocks.getSession.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const { useNative } = await import('~/composables/useNative')
    const registration = useNative().registerPushIfGranted()
    if (switched) pushMocks.getJwt.mockReturnValue('jwt-b')
    resolve({ data: { user: { id: 'user-a', pushConsent: false } } })
    expect(await registration).toBe(false)
    expect(pushMocks.deactivateMyDevices).toHaveBeenCalledTimes(switched ? 0 : 1)
    expect(localStorage.getItem(pendingKey)).toBe(switched ? '1' : null)
    expect(pushMocks.register).not.toHaveBeenCalled()
  })

  it.each(['성공', '응답 오류', '네트워크 오류'])('동일 사용자의 동시 해제는 요청과 %s 결과를 공유하고 완료 후 재시도한다', async (outcome) => {
    const { deactivateDevicesOnce } = await import('~/composables/useNative')
    const { createClient } = await import('@hey-api/client-fetch')
    const client = createClient()
    const pendingKey = STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a'
    localStorage.setItem(pendingKey, '1')
    let resolve!: (value: object) => void
    let reject!: (reason: Error) => void
    pushMocks.deactivateMyDevices.mockReturnValueOnce(new Promise((done, fail) => { resolve = done; reject = fail }))
    const first = deactivateDevicesOnce('user-a', client)
    const second = deactivateDevicesOnce('user-a', client)
    expect(first).toBe(second)
    expect(pushMocks.deactivateMyDevices).toHaveBeenCalledExactlyOnceWith({ client })
    const settled = Promise.allSettled([first, second])
    const result = outcome === '응답 오류' ? { error: { message: 'failed' } } : {}
    const error = new Error('network')
    if (outcome === '네트워크 오류') reject(error)
    else resolve(result)
    expect(await settled).toEqual(outcome === '네트워크 오류'
      ? [{ status: 'rejected', reason: error }, { status: 'rejected', reason: error }]
      : [{ status: 'fulfilled', value: result }, { status: 'fulfilled', value: result }])
    expect(localStorage.getItem(pendingKey)).toBe(outcome === '성공' ? null : '1')
    await deactivateDevicesOnce('user-a', client)
    expect(pushMocks.deactivateMyDevices).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem(pendingKey)).toBeNull()
  })

  it('A의 OFF와 보류 키가 B의 자동 등록을 막거나 B의 디바이스를 해제하지 않는다', async () => {
    pushMocks.platform = 'android'; pushMocks.native = true
    const { useNative } = await import('~/composables/useNative')
    const native = useNative()
    native.invalidatePushRegistration('user-a')
    localStorage.setItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a', '1')
    pushMocks.getSession.mockResolvedValue({ data: { user: { id: 'user-b', pushConsent: true } } })
    expect(await native.registerPushIfGranted()).toBe(true)
    expect(pushMocks.register).toHaveBeenCalledTimes(1)
    expect(pushMocks.deactivateMyDevices).not.toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a')).toBe('1')
  })

  it('새 모듈의 등록 콜백도 동의 true인 오래된 세션보다 사용자별 보류 키를 우선한다', async () => {
    pushMocks.platform = 'android'; pushMocks.native = true
    localStorage.setItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a', '1')
    const { default: plugin } = await import('~/plugins/capacitor.client')
    await (plugin as (app: unknown) => Promise<void>)({ $apiClient: {} })
    const callback = pushMocks.addListener.mock.calls.find(([event]) => event === 'registration')?.[1] as (token: { value: string }) => Promise<void>
    await callback({ value: 'pending-token' })
    expect(pushMocks.registerDevice).not.toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_TOKEN)).toBeNull()
    pushMocks.getSession.mockResolvedValue({ data: { user: { id: 'user-b', pushConsent: true } } })
    await callback({ value: 'user-b-token' })
    expect(pushMocks.registerDevice).toHaveBeenCalledExactlyOnceWith({ client: {}, body: { token: 'user-b-token', platform: 'ANDROID' } })
  })

  it('로그아웃 해제 보류가 있으면 같은 사용자의 다음 등록 전에 해제를 끝내고 보류를 지운 뒤 등록한다', async () => {
    pushMocks.platform = 'android'; pushMocks.native = true
    const logoutKey = STORAGE_KEYS.PUSH_LOGOUT_PENDING_PREFIX + 'user-a'
    localStorage.setItem(logoutKey, '1')
    const { useNative } = await import('~/composables/useNative')
    expect(await useNative().registerPushIfGranted()).toBe(true)
    expect(pushMocks.deactivateMyDevices).toHaveBeenCalledTimes(1)
    expect(pushMocks.deactivateMyDevices.mock.invocationCallOrder[0]!).toBeLessThan(pushMocks.register.mock.invocationCallOrder[0]!)
    expect(localStorage.getItem(logoutKey)).toBeNull()
  })

  it.each(['응답 오류', '네트워크 오류'])('로그아웃 해제 재시도가 %s면 등록하지 않고 보류를 남겨 다음 복귀에 다시 시도한다', async (outcome) => {
    pushMocks.platform = 'android'; pushMocks.native = true
    const logoutKey = STORAGE_KEYS.PUSH_LOGOUT_PENDING_PREFIX + 'user-a'
    localStorage.setItem(logoutKey, '1')
    if (outcome === '응답 오류') pushMocks.deactivateMyDevices.mockResolvedValueOnce({ error: { message: 'failed' } })
    else pushMocks.deactivateMyDevices.mockRejectedValueOnce(new Error('network'))
    const { useNative } = await import('~/composables/useNative')
    const attempt = useNative().registerPushIfGranted()
    if (outcome === '응답 오류') expect(await attempt).toBe(false)
    else await expect(attempt).rejects.toThrow('network')
    expect(pushMocks.register).not.toHaveBeenCalled()
    expect(localStorage.getItem(logoutKey)).toBe('1')
    // 다음 복귀에서 다시 해제하고 성공하면 등록한다.
    expect(await useNative().registerPushIfGranted()).toBe(true)
    expect(pushMocks.deactivateMyDevices).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem(logoutKey)).toBeNull()
  })

  it('A의 로그아웃 보류는 B 로그인에서 A 해제를 시도하거나 B 등록을 막지 않는다', async () => {
    pushMocks.platform = 'android'; pushMocks.native = true
    localStorage.setItem(STORAGE_KEYS.PUSH_LOGOUT_PENDING_PREFIX + 'user-a', '1')
    pushMocks.getSession.mockResolvedValue({ data: { user: { id: 'user-b', pushConsent: true } } })
    const { useNative } = await import('~/composables/useNative')
    expect(await useNative().registerPushIfGranted()).toBe(true)
    expect(pushMocks.deactivateMyDevices).not.toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_LOGOUT_PENDING_PREFIX + 'user-a')).toBe('1')
  })

  it('로그아웃 해제 보류 중 도착한 등록 콜백은 서버 등록을 하지 않는다', async () => {
    pushMocks.platform = 'android'; pushMocks.native = true
    localStorage.setItem(STORAGE_KEYS.PUSH_LOGOUT_PENDING_PREFIX + 'user-a', '1')
    const { default: plugin } = await import('~/plugins/capacitor.client')
    await (plugin as (app: unknown) => Promise<void>)({ $apiClient: {} })
    const callback = pushMocks.addListener.mock.calls.find(([event]) => event === 'registration')?.[1] as (token: { value: string }) => Promise<void>
    await callback({ value: 'pending-logout-token' })
    expect(pushMocks.registerDevice).not.toHaveBeenCalled()
  })

  it('PUSH OFF 해제 성공은 같은 사용자의 로그아웃 보류도 함께 지운다', async () => {
    const { deactivateDevicesOnce } = await import('~/composables/useNative')
    const { createClient } = await import('@hey-api/client-fetch')
    localStorage.setItem(STORAGE_KEYS.PUSH_LOGOUT_PENDING_PREFIX + 'user-a', '1')
    localStorage.setItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a', '1')
    await deactivateDevicesOnce('user-a', createClient())
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_LOGOUT_PENDING_PREFIX + 'user-a')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a')).toBeNull()
  })

  it.each([
    ['android', true, 'denied', 'denied'],
    ['android', true, 'granted', 'granted'],
    ['ios', true, 'granted', null],
    ['web', false, 'granted', null],
  ] as const)('알림 권한 조회: %s(네이티브 %s) 권한 %s → %s', async (platform, native, receive, expected) => {
    pushMocks.platform = platform; pushMocks.native = native
    pushMocks.checkPermissions.mockResolvedValue({ receive })
    const { useNative } = await import('~/composables/useNative')
    expect(await useNative().checkPushPermission()).toBe(expected)
    expect(pushMocks.requestPermissions).not.toHaveBeenCalled()
  })
})

describe('B3 OS 등록과 서버 등록 분리', () => {
  async function bootPlugin() {
    pushMocks.platform = 'android'; pushMocks.native = true
    pushMocks.isLoggedIn!.value = true
    const { default: plugin } = await import('~/plugins/capacitor.client')
    const { App } = await import('@capacitor/app')
    await (plugin as (app: unknown) => Promise<void>)({ $apiClient: {} })
    const registration = pushMocks.addListener.mock.calls.find(([event]) => event === 'registration')?.[1] as (token: { value: string }) => Promise<void>
    const resume = vi.mocked(App.addListener).mock.calls.find(([event]) => event === 'resume')?.[1] as () => void
    await vi.waitFor(() => expect(pushMocks.register).toHaveBeenCalledTimes(1))
    await flushPromises()
    return { registration, resume }
  }

  it.each(['응답 오류', '네트워크 오류'])('OS 등록 뒤 서버 등록이 %s면 다음 복귀에서 다시 등록한다', async (outcome) => {
    const { registration, resume } = await bootPlugin()
    if (outcome === '응답 오류') pushMocks.registerDevice.mockResolvedValueOnce({ error: { message: 'down' }, response: { status: 503 } })
    else pushMocks.registerDevice.mockRejectedValueOnce(new TypeError('network'))
    await registration({ value: 'token-1' })
    expect(pushMocks.registerDevice).toHaveBeenCalledTimes(1)
    resume()
    await vi.waitFor(() => expect(pushMocks.register).toHaveBeenCalledTimes(2))
    await flushPromises()
    // 재등록 콜백의 서버 등록이 성공하면 이후 복귀는 다시 등록하지 않는다.
    await registration({ value: 'token-1' })
    expect(pushMocks.registerDevice).toHaveBeenCalledTimes(2)
    resume()
    await flushPromises()
    expect(pushMocks.register).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['응답 오류', '새 토큰', 'token-2'],
    ['네트워크 오류', '새 토큰', 'token-2'],
    ['응답 오류', '같은 토큰', 'token-1'],
    ['네트워크 오류', '같은 토큰', 'token-1'],
  ])('이전 토큰 등록이 성공한 뒤 %s로 %s 재등록이 실패하면 다음 복귀에서 다시 등록한다', async (outcome, _kind, nextToken) => {
    const { registration, resume } = await bootPlugin()
    await registration({ value: 'token-1' })
    resume()
    await flushPromises()
    expect(pushMocks.register).toHaveBeenCalledTimes(1)

    // OS 토큰 갱신(또는 같은 토큰 재전달)의 서버 등록 실패 — 이전 성공 기록으로 재시도를 건너뛰면 안 된다.
    if (outcome === '응답 오류') pushMocks.registerDevice.mockResolvedValueOnce({ error: { message: 'down' }, response: { status: 503 } })
    else pushMocks.registerDevice.mockRejectedValueOnce(new TypeError('network'))
    await registration({ value: nextToken })
    expect(pushMocks.registerDevice).toHaveBeenLastCalledWith({ client: {}, body: { token: nextToken, platform: 'ANDROID' } })
    resume()
    await vi.waitFor(() => expect(pushMocks.register).toHaveBeenCalledTimes(2))
    await flushPromises()

    // 현재 토큰의 서버 등록이 성공하면 이후 복귀는 다시 등록하지 않는다.
    await registration({ value: nextToken })
    resume()
    await flushPromises()
    expect(pushMocks.register).toHaveBeenCalledTimes(2)
  })

  it('새 토큰의 등록이 끝나기 전에 늦게 끝난 이전 토큰의 성공은 완료로 기록하지 않는다', async () => {
    const { registration, resume } = await bootPlugin()
    let finishOld!: (value: object) => void
    pushMocks.registerDevice.mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve }))
    const oldRegistration = registration({ value: 'token-1' })
    await vi.waitFor(() => expect(pushMocks.registerDevice).toHaveBeenCalledTimes(1))
    pushMocks.registerDevice.mockRejectedValueOnce(new TypeError('network'))
    await registration({ value: 'token-2' })
    finishOld({})
    await oldRegistration
    resume()
    await vi.waitFor(() => expect(pushMocks.register).toHaveBeenCalledTimes(2))
  })

  it('서버 등록 성공 뒤 로그아웃·재로그인은 다시 등록하고, OFF로 세대가 바뀌면 완료 기록이 무효가 된다', async () => {
    const { registration, resume } = await bootPlugin()
    await registration({ value: 'token-1' })
    resume()
    await flushPromises()
    expect(pushMocks.register).toHaveBeenCalledTimes(1)
    pushMocks.isLoggedIn!.value = false
    await nextTick()
    pushMocks.isLoggedIn!.value = true
    await nextTick()
    await vi.waitFor(() => expect(pushMocks.register).toHaveBeenCalledTimes(2))
    await flushPromises()
    await registration({ value: 'token-1' })
    const sessionChecks = pushMocks.getSession.mock.calls.length
    const { useNative } = await import('~/composables/useNative')
    useNative().invalidatePushRegistration('user-a')
    // 세대가 바뀌면 이전 완료 기록으로 건너뛰지 않고 자동 등록 판단(동의·차단)을 다시 거친다 — 차단된 사용자라 등록은 하지 않는다.
    resume()
    await vi.waitFor(() => expect(pushMocks.getSession.mock.calls.length).toBe(sessionChecks + 1))
    await flushPromises()
    expect(pushMocks.register).toHaveBeenCalledTimes(2)
  })

  it.each([true, false])('A 등록 응답 지연 중 로그아웃(감시 반영 %s)하면 늦은 성공이 완료로 남지 않아 B 로그인에서 B 등록이 실행된다', async (flushed) => {
    const { registration } = await bootPlugin()
    let finishA!: (value: object) => void
    pushMocks.registerDevice.mockReturnValueOnce(new Promise((resolve) => { finishA = resolve }))
    const pendingA = registration({ value: 'token-1' })
    await vi.waitFor(() => expect(pushMocks.registerDevice).toHaveBeenCalledTimes(1))
    pushMocks.isLoggedIn!.value = false
    if (flushed) await nextTick()
    finishA({})
    await pendingA
    await nextTick()

    pushMocks.getSession.mockResolvedValue({ data: { user: { id: 'user-b', pushConsent: true } } })
    pushMocks.isLoggedIn!.value = true
    await nextTick()
    await vi.waitFor(() => expect(pushMocks.register).toHaveBeenCalledTimes(2))
    await flushPromises()
    await registration({ value: 'token-1' })
    expect(pushMocks.registerDevice).toHaveBeenCalledTimes(2)
    expect(pushMocks.registerDevice).toHaveBeenLastCalledWith({ client: {}, body: { token: 'token-1', platform: 'ANDROID' } })
  })

  it('완료 기록은 등록한 사용자에 묶여 확인된 현재 사용자가 다르면 복귀에서 다시 등록한다', async () => {
    const { registration, resume } = await bootPlugin()
    await registration({ value: 'token-1' })
    pushMocks.me = { userId: 'user-a' }
    resume()
    await flushPromises()
    expect(pushMocks.register).toHaveBeenCalledTimes(1)
    pushMocks.me = { userId: 'user-b' }
    resume()
    await vi.waitFor(() => expect(pushMocks.register).toHaveBeenCalledTimes(2))
  })

  it('A 로그아웃 해제가 실패하면 A 재로그인에서 해제를 다시 호출하고 보류 키를 지운 뒤 등록한다', async () => {
    const logoutKey = STORAGE_KEYS.PUSH_LOGOUT_PENDING_PREFIX + 'user-a'
    const { registration } = await bootPlugin()
    let finishA!: (value: object) => void
    pushMocks.registerDevice.mockReturnValueOnce(new Promise((resolve) => { finishA = resolve }))
    const pendingA = registration({ value: 'token-1' })
    await vi.waitFor(() => expect(pushMocks.registerDevice).toHaveBeenCalledTimes(1))

    // 로그아웃 — signOutAndClear 와 같은 순서로 기기 해제가 실패하면 보류 키를 남기고 로그아웃한다.
    const { deactivateDevicesOnce, markPushLogoutPending } = await import('~/composables/useNative')
    pushMocks.deactivateMyDevices.mockResolvedValueOnce({ error: { message: 'down' } })
    expect((await deactivateDevicesOnce('user-a', {} as never)).error).toBeTruthy()
    markPushLogoutPending('user-a')
    pushMocks.isLoggedIn!.value = false
    await nextTick()
    finishA({})
    await pendingA

    pushMocks.isLoggedIn!.value = true
    await nextTick()
    await vi.waitFor(() => expect(pushMocks.register).toHaveBeenCalledTimes(2))
    expect(pushMocks.deactivateMyDevices).toHaveBeenCalledTimes(2)
    expect(pushMocks.deactivateMyDevices.mock.invocationCallOrder[1]!).toBeLessThan(pushMocks.register.mock.invocationCallOrder[1]!)
    expect(localStorage.getItem(logoutKey)).toBeNull()
  })

  it('A 의 자동 등록이 세션 조회를 기다리는 사이 로그아웃·B 로그인하면 B 등록이 바로 실행되고, A 의 종료는 B 의 진행 중 가드를 풀지 않는다', async () => {
    pushMocks.platform = 'android'; pushMocks.native = true
    pushMocks.isLoggedIn!.value = true
    let finishA!: (value: object) => void
    let finishB!: (value: object) => void
    pushMocks.getSession
      .mockReturnValueOnce(new Promise((resolve) => { finishA = resolve }))
      .mockReturnValueOnce(new Promise((resolve) => { finishB = resolve }))
    const { default: plugin } = await import('~/plugins/capacitor.client')
    const { App } = await import('@capacitor/app')
    await (plugin as (app: unknown) => Promise<void>)({ $apiClient: {} })
    const resume = vi.mocked(App.addListener).mock.calls.find(([event]) => event === 'resume')?.[1] as () => void
    await vi.waitFor(() => expect(pushMocks.getSession).toHaveBeenCalledTimes(1))

    pushMocks.isLoggedIn!.value = false
    await nextTick()
    pushMocks.isLoggedIn!.value = true
    await nextTick()
    // B 의 등록은 A 의 진행 중 가드에 막히지 않고 세션 조회부터 시작한다.
    await vi.waitFor(() => expect(pushMocks.getSession).toHaveBeenCalledTimes(2))

    // 이전 세대(A)의 요청이 끝나도 B 의 가드는 유지돼 복귀가 중복 등록을 시작하지 않는다.
    finishA({ data: { user: { id: 'user-a', pushConsent: true } } })
    await flushPromises()
    resume()
    await flushPromises()
    expect(pushMocks.getSession).toHaveBeenCalledTimes(2)
    expect(pushMocks.register).not.toHaveBeenCalled()

    finishB({ data: { user: { id: 'user-b', pushConsent: true } } })
    await vi.waitFor(() => expect(pushMocks.register).toHaveBeenCalledTimes(1))
  })
})
