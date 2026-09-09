// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { STORAGE_KEYS } from '~/utils/constants'

const pushMocks = vi.hoisted(() => ({
  platform: 'web', native: false,
  getSession: vi.fn(), checkPermissions: vi.fn(), requestPermissions: vi.fn(), register: vi.fn(),
  addListener: vi.fn(), registerDevice: vi.fn(),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: {
  getPlatform: () => pushMocks.platform, isNativePlatform: () => pushMocks.native,
} }))
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: pushMocks }))
vi.mock('~/lib/auth-client', () => ({ authClient: { getSession: pushMocks.getSession } }))
vi.mock('@terraworld-it/openapi-frontend', () => ({ registerDevice: pushMocks.registerDevice }))
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn() } }))
vi.mock('@capacitor/keyboard', () => ({ Keyboard: { addListener: vi.fn() } }))
mockNuxtImport('useAuth', () => () => ({ isLoggedIn: ref(false) }))
mockNuxtImport('useBackButtonStack', () => () => ({ popTopBackHandler: vi.fn() }))
mockNuxtImport('useGtagEvents', () => () => ({ trackPushRegistrationFailed: vi.fn() }))

beforeEach(async () => {
  pushMocks.getSession.mockReset().mockResolvedValue({ data: { user: { pushConsent: true } } })
  pushMocks.checkPermissions.mockReset().mockResolvedValue({ receive: 'granted' })
  pushMocks.requestPermissions.mockReset().mockResolvedValue({ receive: 'granted' })
  pushMocks.register.mockReset().mockResolvedValue(undefined)
  pushMocks.registerDevice.mockReset().mockResolvedValue({})
  pushMocks.addListener.mockReset().mockResolvedValue({ remove: vi.fn() })
  // 각 테스트는 사용자가 새로 ON한 상태에서 시작해 모듈의 철회 상태를 격리한다.
  pushMocks.platform = 'android'; pushMocks.native = true
  const { useNative } = await import('~/composables/useNative')
  await useNative().registerPush()
  pushMocks.platform = 'web'; pushMocks.native = false
  vi.clearAllMocks()
  localStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN)
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
    expect(await useNative().registerPush()).toBeNull()
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
    native.invalidatePushRegistration()
    resolve({ data: { user: { pushConsent: true } } })
    expect(await registration).toBe(false)
    expect(pushMocks.register).not.toHaveBeenCalled()
    expect(await native.registerPushIfGranted()).toBe(false)
    expect(pushMocks.getSession).toHaveBeenCalledTimes(1)
  })

  it('권한 확인 중 OFF가 되면 자동 등록을 폐기한다', async () => {
    pushMocks.platform = 'android'; pushMocks.native = true
    let resolve!: (value: object) => void
    pushMocks.checkPermissions.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const { useNative } = await import('~/composables/useNative')
    const native = useNative()
    const registration = native.registerPushIfGranted()
    await vi.waitFor(() => expect(pushMocks.checkPermissions).toHaveBeenCalledTimes(1))
    native.invalidatePushRegistration()
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
    useNative().invalidatePushRegistration()
    // 서버 OFF 완료 뒤에도 이전 세션 응답은 동의 true일 수 있다.
    resolve({ data: { user: { pushConsent: true } } })
    await pending
    await callback({ value: 'late-token' })
    expect(pushMocks.registerDevice).not.toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_TOKEN)).toBeNull()
    // 명시적인 ON 뒤에는 정상 등록 경로가 다시 열린다.
    await useNative().registerPush()
    await callback({ value: 'new-token' })
    expect(pushMocks.registerDevice).toHaveBeenCalledExactlyOnceWith({ client: {}, body: { token: 'new-token', platform: 'ANDROID' } })
    localStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN)
  })
})
