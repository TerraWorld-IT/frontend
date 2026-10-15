import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LoginPage from '~/pages/auth/login.vue'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), signUp: vi.fn(), navigate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('~/lib/auth-client', () => ({ authClient: {
  getSession: mocks.getSession,
  signUp: { email: mocks.signUp },
} }))
mockNuxtImport('useAuth', () => () => ({ loadJwt: vi.fn(async () => 'test-token') }))
mockNuxtImport('useNative', () => () => ({ registerPushIfGranted: vi.fn(async () => undefined) }))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('navigateTo', () => mocks.navigate)
mockNuxtImport('dismissKeyboard', () => vi.fn())
mockNuxtImport('useGtagEvents', () => () => ({ trackLogin: vi.fn(), trackSignup: vi.fn() }))

let wrapper: VueWrapper | undefined
let previousEffectiveAt: string
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSession.mockResolvedValue({ data: null })
  mocks.signUp.mockResolvedValue({ error: null })
  previousEffectiveAt = useRuntimeConfig().public.adsEffectiveAt
  useRuntimeConfig().public.adsEffectiveAt = '2026-10-23T00:00:00+09:00'
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  useRuntimeConfig().public.adsEffectiveAt = previousEffectiveAt
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('가입 동의 버전', () => {
  it.each([
    ['2026-10-22T14:59:59.999Z', '2026-10-23T00:00:00+09:00', '2026-06-23'],
    ['2026-10-22T15:00:00.000Z', '2026-10-23T00:00:00+09:00', '2026-10-23'],
    ['2026-10-22T15:00:00.001Z', '2026-10-23T00:00:00+09:00', '2026-10-23'],
    ['2026-10-22T15:00:00.000Z', '2026-10-24T00:00:00+09:00', '2026-06-23'],
    ['2026-10-22T15:00:00.000Z', '', '2026-06-23'],
  ])('가입 요청 시각 %s와 시행 설정 %s에 따라 %s를 전송한다', async (now, effectiveAt, consentVersion) => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-22T14:59:59.999Z'))
    useRuntimeConfig().public.adsEffectiveAt = effectiveAt
    wrapper = await mountSuspended(LoginPage, { attachTo: document.body, shallow: true })
    await flushPromises()
    await wrapper.get('button[type="button"]').trigger('click')
    await wrapper.get('#auth-nickname').setValue('테스트')
    await wrapper.get('#auth-birthDate').setValue('2000-01-01')
    await wrapper.get('#auth-email').setValue('test@example.com')
    await wrapper.get('#auth-password').setValue('password123')
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[1]!.setValue(true)
    await checkboxes[2]!.setValue(true)
    // 시행 전에 연 폼에서도 실제 가입 요청 시각의 버전을 기록한다.
    clock.mockReturnValue(Date.parse(now))
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.signUp).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      agreeTerms: true,
      agreePrivacy: true,
      consentVersion,
    }))
    expect(mocks.toast.error).not.toHaveBeenCalled()
  })
})
