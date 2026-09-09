import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import SettingsPage from '~/pages/profile/settings.vue'

const mocks = vi.hoisted(() => ({
  platform: 'web', native: false,
  deleteUser: vi.fn(), updateUser: vi.fn(), signOutAndClear: vi.fn(),
  deactivateMyDevices: vi.fn(), registerPush: vi.fn(), registerPushIfGranted: vi.fn(), getAppInfo: vi.fn(),
  client: { request: vi.fn() },
  navigate: vi.fn(), toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
vi.mock('@capacitor/core', () => ({ Capacitor: {
  getPlatform: () => mocks.platform, isNativePlatform: () => mocks.native,
} }))
vi.mock('~/lib/auth-client', () => ({ authClient: {
  useSession: () => ref({ data: { user: { pushConsent: true, adConsent: true } } }),
  deleteUser: mocks.deleteUser, updateUser: mocks.updateUser,
} }))
mockNuxtImport('useAuth', () => () => ({ isLoggedIn: ref(true), signOutAndClear: mocks.signOutAndClear }))
mockNuxtImport('useOpenApi', () => () => ({ sdk: { deactivateMyDevices: mocks.deactivateMyDevices }, client: mocks.client }))
mockNuxtImport('useNative', () => () => ({
  registerPush: mocks.registerPush, registerPushIfGranted: mocks.registerPushIfGranted, getAppInfo: mocks.getAppInfo,
}))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('navigateTo', () => mocks.navigate)
mockNuxtImport('useDialogFocusTrap', () => () => undefined)
mockNuxtImport('useBackButtonStack', () => () => ({ pushBackHandler: () => () => undefined }))
mockNuxtImport('dismissKeyboard', () => vi.fn())

let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.clearAllMocks()
  mocks.platform = 'web'
  mocks.native = false
  mocks.deleteUser.mockReset().mockResolvedValue({ error: null })
  mocks.updateUser.mockReset().mockResolvedValue({ error: null })
  mocks.deactivateMyDevices.mockReset().mockResolvedValue({ error: undefined })
  mocks.signOutAndClear.mockReset().mockResolvedValue(undefined)
  mocks.registerPush.mockReset().mockResolvedValue({ receive: 'granted' })
  mocks.registerPushIfGranted.mockReset().mockResolvedValue(true)
  mocks.getAppInfo.mockReset().mockResolvedValue({ version: '1.2.3', build: '42' })
})
afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
})

async function mountSettings() {
  wrapper = await mountSuspended(SettingsPage, {
    attachTo: document.body,
    global: { stubs: { teleport: true } },
  })
  await flushPromises()
  return wrapper
}

describe('계정 설정', () => {
  it('처리방침·약관·버전·삭제 행과 웹 버전을 표시한다', async () => {
    const w = await mountSettings()
    for (const text of ['개인정보 처리방침', '이용약관', '앱 버전', '계정 삭제', '웹']) expect(w.text()).toContain(text)
    expect(w.get('a[href="/legal/privacy"]').text()).toBe('개인정보 처리방침')
    expect(w.get('a[href="/legal/terms"]').text()).toBe('이용약관')
  })

  it('삭제 pending 중 중복 요청과 닫기를 막고 비밀번호 오류 후 재시도 성공 시 로그인으로 이동한다', async () => {
    let resolve!: (value: { error: { code: string } }) => void
    mocks.deleteUser.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const w = await mountSettings()
    await w.get('[data-testid="delete-account"]').trigger('click')
    expect(w.get('[role="dialog"]').text()).toContain('복구할 수 없습니다')
    const confirm = w.get('[role="dialog"] button[autofocus]')
    expect(confirm.attributes('disabled')).toBeDefined()
    await w.get('#delete-account-password').setValue('wrong-password')
    await w.get('[role="dialog"] button[autofocus]').trigger('click')
    await w.get('[role="dialog"] button[autofocus]').trigger('click')
    await w.get('[data-testid="modal-backdrop"]').trigger('click')
    expect(w.find('[role="dialog"]').exists()).toBe(true)
    expect(w.get('[role="dialog"] button[autofocus]').attributes('disabled')).toBeDefined()
    expect(w.get('#delete-account-password').attributes('disabled')).toBeDefined()
    expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith({ password: 'wrong-password' })
    resolve({ error: { code: 'INVALID_PASSWORD' } })
    await flushPromises()
    expect(mocks.toast.error).toHaveBeenCalledWith('비밀번호가 올바르지 않습니다.')
    expect(mocks.signOutAndClear).not.toHaveBeenCalled()
    expect(w.find('[role="dialog"]').exists()).toBe(true)
    await w.get('#delete-account-password').setValue('correct-password')
    await w.get('[role="dialog"] button[autofocus]').trigger('click')
    await flushPromises()
    expect(mocks.deleteUser).toHaveBeenLastCalledWith({ password: 'correct-password' })
    expect(mocks.signOutAndClear).toHaveBeenCalledTimes(1)
    expect(mocks.navigate).toHaveBeenCalledWith('/auth/login')
    expect(w.find('[role="dialog"]').exists()).toBe(false)
  })

  it('삭제 서버 오류는 계정을 유지하고 일반 오류를 알린다', async () => {
    mocks.deleteUser.mockResolvedValueOnce({ error: { code: 'INTERNAL_SERVER_ERROR' } })
    const w = await mountSettings()
    await w.get('[data-testid="delete-account"]').trigger('click')
    await w.get('#delete-account-password').setValue('password')
    await w.get('[role="dialog"] button[autofocus]').trigger('click')
    await flushPromises()
    expect(mocks.toast.error).toHaveBeenCalledWith('계정 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.')
    expect(mocks.signOutAndClear).not.toHaveBeenCalled()
    expect(w.find('[role="dialog"]').exists()).toBe(true)
  })

  it('iOS에서는 푸시·광고 동의 토글을 숨기고 앱 버전과 빌드를 표시한다', async () => {
    mocks.platform = 'ios'; mocks.native = true
    const w = await mountSettings()
    expect(w.find('[data-testid="consent-push"]').exists()).toBe(false)
    expect(w.find('[data-testid="consent-adId"]').exists()).toBe(false)
    expect(w.find('[data-testid="consent-photo"]').exists()).toBe(true)
    expect(w.text()).toContain('1.2.3 (42)')
  })

  it('푸시 OFF는 모든 디바이스 비활성화 성공 후 동의를 저장한다', async () => {
    let resolve!: (value: object) => void
    mocks.deactivateMyDevices.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const w = await mountSettings()
    await w.get('[data-testid="consent-push"]').setValue(false)
    expect(mocks.deactivateMyDevices).toHaveBeenCalledExactlyOnceWith({ client: mocks.client })
    expect(mocks.updateUser).not.toHaveBeenCalled()
    resolve({})
    await flushPromises()
    expect(mocks.updateUser).toHaveBeenCalledExactlyOnceWith({ pushConsent: false })
    expect(mocks.registerPush).not.toHaveBeenCalled()
  })

  it('비활성화 실패 시 동의 저장을 중단하고 토글을 복원한다', async () => {
    mocks.deactivateMyDevices.mockResolvedValueOnce({ error: { message: 'failed' } })
    const w = await mountSettings()
    await w.get('[data-testid="consent-push"]').setValue(false)
    await flushPromises()
    expect(mocks.updateUser).not.toHaveBeenCalled()
    expect((w.get('[data-testid="consent-push"]').element as HTMLInputElement).checked).toBe(true)
    expect(mocks.toast.error).toHaveBeenCalled()
  })

  it('푸시 ON 권한 거절 시 동의를 저장하지 않고 토글을 복원한다', async () => {
    const w = await mountSettings()
    await w.get('[data-testid="consent-push"]').setValue(false)
    await flushPromises()
    mocks.updateUser.mockClear()
    mocks.registerPush.mockResolvedValueOnce({ receive: 'denied' })
    await w.get('[data-testid="consent-push"]').setValue(true)
    await flushPromises()
    expect(mocks.registerPush).toHaveBeenCalledTimes(1)
    expect(mocks.updateUser).not.toHaveBeenCalled()
    expect((w.get('[data-testid="consent-push"]').element as HTMLInputElement).checked).toBe(false)
    expect(mocks.toast.info).toHaveBeenCalled()
  })
})
