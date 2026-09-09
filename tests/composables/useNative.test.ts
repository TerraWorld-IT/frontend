// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'

const pushMocks = vi.hoisted(() => ({
  platform: 'web', native: false,
  getSession: vi.fn(), checkPermissions: vi.fn(), requestPermissions: vi.fn(), register: vi.fn(),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: {
  getPlatform: () => pushMocks.platform, isNativePlatform: () => pushMocks.native,
} }))
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: pushMocks }))
vi.mock('~/lib/auth-client', () => ({ authClient: { getSession: pushMocks.getSession } }))

beforeEach(() => {
  vi.clearAllMocks()
  pushMocks.platform = 'web'; pushMocks.native = false
  pushMocks.getSession.mockResolvedValue({ data: { user: { pushConsent: true } } })
  pushMocks.checkPermissions.mockResolvedValue({ receive: 'granted' })
  pushMocks.register.mockResolvedValue(undefined)
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
})
