import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import capacitorPlugin from '~/plugins/capacitor.client'
import { App } from '@capacitor/app'
import { Keyboard } from '@capacitor/keyboard'

afterEach(() => {
  vi.clearAllMocks()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.classList.remove('keyboard-open')
  document.body.innerHTML = ''
  isLoggedIn = ref<boolean>(false)
  sessionStorage.clear()
})

const mocks = vi.hoisted(() => ({ native: false, recover: vi.fn().mockResolvedValue(undefined), pushListener: vi.fn(), trackPushRegistrationFailed: vi.fn(), toastInfo: vi.fn(), navigate: vi.fn() }))
let isLoggedIn = ref<boolean>(false)
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => 'android' } }))
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(), exitApp: vi.fn(), getLaunchUrl: vi.fn() } }))
mockNuxtImport('navigateTo', () => mocks.navigate)
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: { addListener: mocks.pushListener } }))
vi.mock('@capacitor/keyboard', () => ({ Keyboard: { addListener: vi.fn() } }))
mockNuxtImport('useAuth', () => () => ({ isLoggedIn, loadJwt: async () => null }))
mockNuxtImport('useBackButtonStack', () => () => ({ popTopBackHandler: () => false }))
mockNuxtImport('useToast', () => () => ({ info: mocks.toastInfo }))
mockNuxtImport('useGtagEvents', () => () => ({ trackPushRegistrationFailed: mocks.trackPushRegistrationFailed }))
mockNuxtImport('recoverPendingPurchases', () => mocks.recover)

describe('Capacitor 뒤로가기 종료 확인', () => {
  it('루트 화면에서 첫 입력은 번역된 안내를 표시하고 2초 안의 두 번째 입력에서 종료한다', async () => {
    mocks.native = true
    mocks.pushListener.mockImplementation(() => { throw new Error('push unavailable') })
    vi.mocked(App.addListener).mockClear()
    vi.mocked(App.exitApp).mockClear()
    mocks.toastInfo.mockClear()
    const translate = vi.spyOn(useNuxtApp().$i18n, 't')
    await capacitorPlugin({} as never)
    const backButton = vi.mocked(App.addListener).mock.calls.find(([event]) => event === 'backButton')![1]
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000)

    backButton({ canGoBack: false })
    expect(translate).toHaveBeenCalledExactlyOnceWith('common.pressBackAgainToExit')
    expect(mocks.toastInfo).toHaveBeenCalledExactlyOnceWith('한 번 더 누르면 종료됩니다')
    expect(App.exitApp).not.toHaveBeenCalled()

    now.mockReturnValue(11_000)
    backButton({ canGoBack: false })
    expect(mocks.toastInfo).toHaveBeenCalledTimes(1)
    expect(App.exitApp).toHaveBeenCalledOnce()
  })
})

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

describe('B6 콜드 스타트 딥링크', () => {
  function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((done) => { resolve = done })
    return { promise, resolve }
  }

  async function boot(launchUrl: Promise<{ url?: string } | undefined> | { url?: string } | undefined) {
    mocks.native = true
    mocks.pushListener.mockImplementation(() => { throw new Error('push unavailable') })
    vi.mocked(App.addListener).mockClear()
    vi.mocked(App.getLaunchUrl).mockReset().mockImplementation(async () => launchUrl as { url: string } | undefined)
    mocks.navigate.mockClear()
    await capacitorPlugin({} as never)
    return vi.mocked(App.addListener).mock.calls.filter(([event]) => event === 'appUrlOpen').at(-1)![1] as (event: { url: string }) => void
  }

  it('앱이 종료된 상태에서 초대 링크로 시작하면 라우터 준비 뒤 시작 URL 로 한 번 이동한다', async () => {
    await boot({ url: 'terraworld://share/abc_123' })
    await vi.waitFor(() => expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith('/share/abc_123'))
    expect(App.getLaunchUrl).toHaveBeenCalledTimes(1)
  })

  it('시작 URL 을 처리한 직후 같은 URL 이벤트가 와도(iOS 콜드 스타트) 중복 이동하지 않고, 다른 링크는 이동한다', async () => {
    const urlOpen = await boot({ url: 'https://terraworld.app/share/abc' })
    await vi.waitFor(() => expect(mocks.navigate).toHaveBeenCalledTimes(1))
    urlOpen({ url: 'https://terraworld.app/share/abc' })
    expect(mocks.navigate).toHaveBeenCalledTimes(1)
    urlOpen({ url: 'https://terraworld.app/share/other' })
    expect(mocks.navigate).toHaveBeenLastCalledWith('/share/other')
    // 중복 무시는 1회뿐 — 이후 같은 링크를 다시 열면 기존처럼 이동한다.
    urlOpen({ url: 'https://terraworld.app/share/abc' })
    expect(mocks.navigate).toHaveBeenCalledTimes(3)
  })

  it('이벤트가 시작 URL 조회보다 먼저 같은 URL 을 처리하면 시작 URL 은 건너뛴다', async () => {
    const launch = deferred<{ url?: string }>()
    const urlOpen = await boot(launch.promise)
    urlOpen({ url: 'terraworld://share/abc' })
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith('/share/abc')
    launch.resolve({ url: 'terraworld://share/abc' })
    await vi.waitFor(() => expect(App.getLaunchUrl).toHaveBeenCalledTimes(1))
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mocks.navigate).toHaveBeenCalledTimes(1)
  })

  it.each([undefined, {}, { url: 'https://evil.example/phish' }, { url: 'terraworld://settings' }, { url: 'not a url' }])('시작 URL 이 없거나 허용 경로가 아니면(%j) 이동하지 않는다', async (launch) => {
    await boot(launch)
    await vi.waitFor(() => expect(App.getLaunchUrl).toHaveBeenCalledTimes(1))
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('같은 WebView 새로고침으로 플러그인이 다시 실행돼도 같은 시작 URL 로 다시 이동하지 않는다', async () => {
    await boot({ url: 'terraworld://share/abc' })
    await vi.waitFor(() => expect(mocks.navigate).toHaveBeenCalledTimes(1))
    await boot({ url: 'terraworld://share/abc' })
    await vi.waitFor(() => expect(App.getLaunchUrl).toHaveBeenCalledTimes(1))
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('이벤트로 이미 이동한 링크를 새로고침 뒤 시작 URL 로 다시 돌려줘도 이동하지 않는다(iOS lastURL)', async () => {
    const urlOpen = await boot(undefined)
    await vi.waitFor(() => expect(App.getLaunchUrl).toHaveBeenCalledTimes(1))
    urlOpen({ url: 'https://terraworld.app/share/warm' })
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith('/share/warm')
    await boot({ url: 'https://terraworld.app/share/warm' })
    await vi.waitFor(() => expect(App.getLaunchUrl).toHaveBeenCalledTimes(1))
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('시작 URL 조회가 실패해도 이벤트 딥링크는 기존처럼 동작한다', async () => {
    mocks.native = true
    mocks.pushListener.mockImplementation(() => { throw new Error('push unavailable') })
    vi.mocked(App.addListener).mockClear()
    vi.mocked(App.getLaunchUrl).mockReset().mockRejectedValue(new Error('not implemented'))
    mocks.navigate.mockClear()
    await capacitorPlugin({} as never)
    const urlOpen = vi.mocked(App.addListener).mock.calls.filter(([event]) => event === 'appUrlOpen').at(-1)![1] as (event: { url: string }) => void
    await vi.waitFor(() => expect(App.getLaunchUrl).toHaveBeenCalledTimes(1))
    urlOpen({ url: 'terraworld:///share/xyz' })
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith('/share/xyz')
  })
})
