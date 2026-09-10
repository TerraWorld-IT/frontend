import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import capacitorPlugin from '~/plugins/capacitor.client'
import { Keyboard } from '@capacitor/keyboard'

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.classList.remove('keyboard-open')
  document.body.innerHTML = ''
})

const mocks = vi.hoisted(() => ({ native: false, recover: vi.fn().mockResolvedValue(undefined), pushListener: vi.fn(), trackPushRegistrationFailed: vi.fn() }))
const isLoggedIn = ref<boolean>(false)
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => 'android' } }))
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn() } }))
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: { addListener: mocks.pushListener } }))
vi.mock('@capacitor/keyboard', () => ({ Keyboard: { addListener: vi.fn() } }))
mockNuxtImport('useAuth', () => () => ({ isLoggedIn, loadJwt: async () => null }))
mockNuxtImport('useBackButtonStack', () => () => ({ popTopBackHandler: () => false }))
mockNuxtImport('useGtagEvents', () => () => ({ trackPushRegistrationFailed: mocks.trackPushRegistrationFailed }))
mockNuxtImport('recoverPendingPurchases', () => mocks.recover)

describe('Capacitor 구매 복구 초기화', () => {
  it('Push 초기화 예외 후에도 로그인 시 미완료 IAP를 복구한다', async () => {
    mocks.native = true
    mocks.pushListener.mockImplementation(() => { throw new Error('push unavailable') })
    await capacitorPlugin({} as never)
    expect(mocks.pushListener).toHaveBeenCalled()
    expect(mocks.trackPushRegistrationFailed).toHaveBeenCalledExactlyOnceWith({ reason: 'initialization_failed' })
    expect(mocks.recover).not.toHaveBeenCalled()
    isLoggedIn.value = true
    await nextTick()
    expect(mocks.recover).toHaveBeenCalledOnce()
  })
})

describe('Capacitor 키보드 스크롤 모션', () => {
  it.each([true, false, undefined])('키보드 표시 후 포커스 입력을 선호에 맞게 스크롤한다 (%s)', async (reduce) => {
    mocks.native = true
    mocks.pushListener.mockImplementation(() => { throw new Error('push unavailable') })
    vi.mocked(Keyboard.addListener).mockClear()
    if (reduce === undefined) vi.stubGlobal('matchMedia', undefined)
    else vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: query === '(prefers-reduced-motion: reduce)' && reduce }) as MediaQueryList)
    await capacitorPlugin({} as never)
    const show = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardWillShow')![1]
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    const scroll = vi.fn()
    input.scrollIntoView = scroll
    vi.useFakeTimers()
    show({ keyboardHeight: 300 })
    expect(document.body.classList.contains('keyboard-open')).toBe(true)
    vi.advanceTimersByTime(299)
    expect(scroll).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  })
})
