import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LoginPage from '~/pages/auth/login.vue'

// 가입 폼 닉네임 금칙어 — 입력 즉시 안내하고 제출 요청을 보내지 않는다(서버 before hook 이 같은 정책으로 최종 거절).
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), signUp: vi.fn(), navigate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('~/lib/auth-client', () => ({ authClient: {
  getSession: mocks.getSession,
  signIn: { email: vi.fn() },
  signUp: { email: mocks.signUp },
} }))
mockNuxtImport('useAuth', () => () => ({ loadJwt: vi.fn(async () => 'test-token') }))
mockNuxtImport('useNative', () => () => ({ registerPush: vi.fn(async () => null), registerPushIfGranted: vi.fn(async () => undefined), isNative: false, isAndroid: false }))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('navigateTo', () => mocks.navigate)
mockNuxtImport('dismissKeyboard', () => vi.fn())
mockNuxtImport('useGtagEvents', () => () => ({ trackLogin: vi.fn(), trackSignup: vi.fn() }))

let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mocks.getSession.mockResolvedValue({ data: null })
  mocks.signUp.mockResolvedValue({ error: null })
})
afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
})

async function openSignup(nickname: string): Promise<VueWrapper> {
  const w = await mountSuspended(LoginPage, { attachTo: document.body, shallow: true })
  await flushPromises()
  await w.get('button[type="button"]').trigger('click')
  await w.get('#auth-nickname').setValue(nickname)
  await w.get('#auth-birthDate').setValue('2000-01-01')
  const checkboxes = w.findAll('input[type="checkbox"]')
  await checkboxes[1]!.setValue(true)
  await checkboxes[2]!.setValue(true)
  await w.get('#auth-email').setValue('test@example.com')
  await w.get('#auth-password').setValue('password123')
  return w
}

describe('가입 닉네임 금칙어', () => {
  it('금칙어 닉네임은 입력 즉시 안내하고 가입 요청을 보내지 않는다', async () => {
    wrapper = await openSignup('시1발')
    expect(wrapper.get('[data-testid="signup-nickname-forbidden"]').text()).toBe('사용할 수 없는 닉네임이에요')
    expect(wrapper.get('#auth-nickname').attributes('aria-invalid')).toBe('true')
    wrapper.get('form').element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(mocks.signUp).not.toHaveBeenCalled()
    expect(mocks.toast.error).toHaveBeenCalledWith('사용할 수 없는 닉네임이에요')
  })

  it('정상 닉네임은 안내 없이 가입 요청을 보낸다', async () => {
    wrapper = await openSignup('시바견 보리')
    expect(wrapper.find('[data-testid="signup-nickname-forbidden"]').exists()).toBe(false)
    wrapper.get('form').element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(mocks.signUp).toHaveBeenCalledTimes(1)
    expect(mocks.signUp.mock.calls[0]![0]).toMatchObject({ name: '시바견 보리' })
  })

  it('서버가 금칙어로 거절하면 같은 안내 문구를 보여 준다', async () => {
    mocks.signUp.mockResolvedValue({ error: { code: 'NICKNAME_NOT_ALLOWED', message: 'x' } })
    wrapper = await openSignup('테라')
    wrapper.get('form').element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(mocks.toast.error).toHaveBeenCalledWith('사용할 수 없는 닉네임이에요')
  })
})
