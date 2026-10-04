import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LoginPage from '~/pages/auth/login.vue'
import { PUSH_PERMISSION_DENIED_MESSAGE } from '~/composables/useNative'

// B2: 가입 폼에서 푸시에 동의한 Android 네이티브만 가입 직후 알림 권한을 한 번 요청한다.
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), signUp: vi.fn(), navigate: vi.fn(),
  registerPush: vi.fn(), registerPushIfGranted: vi.fn(),
  native: { isNative: true, isAndroid: true },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('~/lib/auth-client', () => ({ authClient: {
  getSession: mocks.getSession,
  signIn: { email: vi.fn() },
  signUp: { email: mocks.signUp },
} }))
mockNuxtImport('useAuth', () => () => ({ loadJwt: vi.fn(async () => 'test-token') }))
mockNuxtImport('useNative', () => () => ({
  registerPush: mocks.registerPush, registerPushIfGranted: mocks.registerPushIfGranted,
  isNative: mocks.native.isNative, isAndroid: mocks.native.isAndroid,
}))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('navigateTo', () => mocks.navigate)
mockNuxtImport('dismissKeyboard', () => vi.fn())
mockNuxtImport('useGtagEvents', () => () => ({ trackLogin: vi.fn(), trackSignup: vi.fn() }))

let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mocks.native.isNative = true
  mocks.native.isAndroid = true
  mocks.getSession.mockResolvedValue({ data: null })
  mocks.signUp.mockResolvedValue({ data: { token: 't', user: { id: 'new-user' } }, error: null })
  mocks.registerPush.mockResolvedValue({ receive: 'granted' })
  mocks.registerPushIfGranted.mockResolvedValue(false)
})
afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
})

async function submitSignup(pushConsent: boolean): Promise<void> {
  wrapper = await mountSuspended(LoginPage, { attachTo: document.body, shallow: true })
  await flushPromises()
  await wrapper.get('button[type="button"]').trigger('click')
  await wrapper.get('#auth-nickname').setValue('보리')
  await wrapper.get('#auth-birthDate').setValue('2000-01-01')
  const checkboxes = wrapper.findAll('input[type="checkbox"]')
  // [0] 전체 동의, [1] 약관, [2] 개인정보, [3] 푸시(선택 동의 첫 항목)
  await checkboxes[1]!.setValue(true)
  await checkboxes[2]!.setValue(true)
  await checkboxes[3]!.setValue(pushConsent)
  await wrapper.get('#auth-email').setValue('test@example.com')
  await wrapper.get('#auth-password').setValue('password123')
  wrapper.get('form').element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await flushPromises()
}

describe('가입 직후 푸시 권한 요청', () => {
  it('푸시 동의 + Android 네이티브면 가입한 사용자 ID 로 권한을 한 번 요청한다', async () => {
    await submitSignup(true)
    expect(mocks.signUp.mock.calls[0]![0]).toMatchObject({ pushConsent: true })
    expect(mocks.registerPush).toHaveBeenCalledExactlyOnceWith('new-user')
    expect(mocks.registerPushIfGranted).not.toHaveBeenCalled()
    expect(mocks.toast.info).not.toHaveBeenCalled()
    expect(mocks.navigate).toHaveBeenCalledWith('/')
  })

  it.each(['denied', 'prompt-with-rationale'])('권한이 %s 이면 설정 화면과 같은 안내를 띄우고 가입은 완료한다', async (receive) => {
    mocks.registerPush.mockResolvedValueOnce({ receive })
    await submitSignup(true)
    expect(mocks.toast.info).toHaveBeenCalledExactlyOnceWith(PUSH_PERMISSION_DENIED_MESSAGE)
    expect(mocks.toast.success).toHaveBeenCalledTimes(1)
    expect(mocks.navigate).toHaveBeenCalledWith('/')
  })

  it('권한 요청 예외도 가입 완료와 이동을 막지 않는다', async () => {
    mocks.registerPush.mockRejectedValueOnce(new Error('plugin missing'))
    await submitSignup(true)
    expect(mocks.toast.error).not.toHaveBeenCalled()
    expect(mocks.navigate).toHaveBeenCalledWith('/')
  })

  it('푸시에 동의하지 않으면 권한을 묻지 않고 기존 동의·권한 확인만 한다', async () => {
    await submitSignup(false)
    expect(mocks.registerPush).not.toHaveBeenCalled()
    expect(mocks.registerPushIfGranted).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['iOS', true, false],
    ['웹', false, false],
  ] as const)('%s 에서는 동의해도 권한을 요청하지 않는다', async (_label, isNative, isAndroid) => {
    mocks.native.isNative = isNative
    mocks.native.isAndroid = isAndroid
    await submitSignup(true)
    expect(mocks.registerPush).not.toHaveBeenCalled()
    expect(mocks.registerPushIfGranted).toHaveBeenCalledTimes(1)
  })

  it('가입 응답에 사용자 ID 가 없으면 권한을 요청하지 않는다', async () => {
    mocks.signUp.mockResolvedValueOnce({ data: null, error: null })
    await submitSignup(true)
    expect(mocks.registerPush).not.toHaveBeenCalled()
    expect(mocks.registerPushIfGranted).toHaveBeenCalledTimes(1)
  })
})
