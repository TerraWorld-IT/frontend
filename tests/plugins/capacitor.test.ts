import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import capacitorPlugin from '~/plugins/capacitor.client'
import { App } from '@capacitor/app'
import { Keyboard } from '@capacitor/keyboard'

afterEach(() => {
  for (const dispose of keyboardDisposers.splice(0)) dispose()
  vi.clearAllMocks()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.classList.remove('keyboard-open')
  document.body.innerHTML = ''
  document.documentElement.scrollTop = 0
  isLoggedIn = ref<boolean>(false)
  sessionStorage.clear()
  mocks.platform = 'android'
  vi.mocked(Keyboard.setResizeMode).mockReset().mockResolvedValue(undefined)
})

const mocks = vi.hoisted(() => ({ native: false, platform: 'android', recover: vi.fn().mockResolvedValue(undefined), pushListener: vi.fn(), trackPushRegistrationFailed: vi.fn(), toastInfo: vi.fn(), navigate: vi.fn() }))
const keyboardDisposers: (() => void)[] = []
function pluginApp() {
  return { vueApp: { onUnmount: (dispose: () => void) => keyboardDisposers.push(dispose) } } as never
}
let isLoggedIn = ref<boolean>(false)
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => mocks.platform } }))
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(), exitApp: vi.fn(), getLaunchUrl: vi.fn() } }))
mockNuxtImport('navigateTo', () => mocks.navigate)
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: { addListener: mocks.pushListener } }))
vi.mock('@capacitor/keyboard', () => ({ KeyboardResize: { Native: 'native', None: 'none' }, Keyboard: { addListener: vi.fn().mockImplementation(async () => ({ remove: vi.fn().mockResolvedValue(undefined) })), setResizeMode: vi.fn().mockResolvedValue(undefined) } }))
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
    await capacitorPlugin(pluginApp())
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
    await capacitorPlugin(pluginApp())
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
    await capacitorPlugin(pluginApp())
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

describe('Capacitor iOS 키보드 리사이즈', () => {
  async function boot(platform: string) {
    mocks.native = true
    mocks.platform = platform
    mocks.pushListener.mockImplementation(() => { throw new Error('push unavailable') })
    await capacitorPlugin(pluginApp())
  }

  it('iOS 네이티브에서 리스너 등록 전에 None을 설정하고 CSS 보정을 켠다', async () => {
    await boot('ios')
    expect(Keyboard.setResizeMode).toHaveBeenCalledExactlyOnceWith({ mode: 'none' })
    expect(vi.mocked(Keyboard.setResizeMode).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(Keyboard.addListener).mock.invocationCallOrder[0]!)
    expect(document.body.classList.contains('ios-native-keyboard')).toBe(true)
    expect(document.body.classList.contains('ios-css-keyboard')).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('0px')
  })

  it('WillShow에서 높이를 즉시 반영하고 다음 프레임에 스크롤하며 WillHide부터 여백을 없앤다', async () => {
    await boot('ios')
    const show = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardWillShow')![1]
    const willHide = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardWillHide')![1]
    const didHide = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardDidHide')![1]
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    input.scrollIntoView = vi.fn()
    vi.useFakeTimers()
    show({ keyboardHeight: 301 })
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('301px')
    expect(document.body.classList.contains('keyboard-open')).toBe(true)
    expect(input.scrollIntoView).not.toHaveBeenCalled()
    vi.advanceTimersToNextFrame()
    expect(input.scrollIntoView).toHaveBeenCalledOnce()
    vi.mocked(input.scrollIntoView).mockClear()
    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(300)
    expect(input.scrollIntoView).not.toHaveBeenCalled()
    willHide()
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('0px')
    expect(document.body.classList.contains('keyboard-open')).toBe(true)
    didHide()
    expect(document.body.classList.contains('keyboard-open')).toBe(false)
  })

  it('기본 레이아웃은 열림 직전에 문서 위치를 main으로 옮기고 닫힘 직후 현재 위치를 복원한다', async () => {
    await boot('ios')
    document.body.insertAdjacentHTML('beforeend', '<div class="app-keyboard-frame"><main><input></main></div>')
    const main = document.querySelector('main')!
    const input = main.querySelector('input')!
    const documentScroller = document.scrollingElement ?? document.documentElement
    input.focus()
    input.scrollIntoView = vi.fn(() => {
      expect(main.scrollTop).toBe(240)
      expect(documentScroller.scrollTop).toBe(0)
    })
    documentScroller.scrollTop = 240
    const show = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardWillShow')![1]
    const willHide = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardWillHide')![1]
    const didHide = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardDidHide')![1]
    vi.useFakeTimers()
    expect(document.body.classList.contains('keyboard-open')).toBe(false)
    expect(main.scrollTop).toBe(0)
    show({ keyboardHeight: 300 })
    expect(main.scrollTop).toBe(240)
    expect(documentScroller.scrollTop).toBe(0)
    expect(input.scrollIntoView).not.toHaveBeenCalled()
    vi.advanceTimersToNextFrame()
    expect(input.scrollIntoView).toHaveBeenCalledOnce()
    main.scrollTop = 310
    show({ keyboardHeight: 340 })
    expect(main.scrollTop).toBe(310)
    willHide()
    expect(document.body.classList.contains('keyboard-open')).toBe(true)
    expect(documentScroller.scrollTop).toBe(0)
    didHide()
    expect(document.body.classList.contains('keyboard-open')).toBe(false)
    expect(documentScroller.scrollTop).toBe(310)
    expect(main.scrollTop).toBe(0)
    didHide()
    expect(documentScroller.scrollTop).toBe(310)
  })

  it.each(['android', 'native-fallback'])('%s는 문서와 main의 스크롤 위치를 이전하지 않는다', async (platform) => {
    if (platform === 'native-fallback') vi.mocked(Keyboard.setResizeMode).mockRejectedValueOnce(new Error('none unavailable'))
    await boot(platform === 'native-fallback' ? 'ios' : platform)
    document.body.insertAdjacentHTML('beforeend', '<div class="app-keyboard-frame"><main></main></div>')
    const main = document.querySelector('main')!
    const documentScroller = document.scrollingElement ?? document.documentElement
    documentScroller.scrollTop = 240
    const show = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardWillShow')![1]
    const hide = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardDidHide')![1]
    show({ keyboardHeight: 300 })
    expect(main.scrollTop).toBe(0)
    expect(documentScroller.scrollTop).toBe(240)
    hide()
    expect(documentScroller.scrollTop).toBe(240)
  })

  it('열린 상태에서 플러그인을 해제해도 main의 현재 위치를 문서로 복원한다', async () => {
    await boot('ios')
    document.body.insertAdjacentHTML('beforeend', '<div class="app-keyboard-frame"><main></main></div>')
    const main = document.querySelector('main')!
    const show = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardWillShow')![1]
    show({ keyboardHeight: 300 })
    main.scrollTop = 180
    for (const dispose of keyboardDisposers.splice(0)) dispose()
    expect((document.scrollingElement ?? document.documentElement).scrollTop).toBe(180)
    expect(main.scrollTop).toBe(0)
  })

  it.each([0, -1, -300, NaN, Infinity, -Infinity, undefined, null, '300'])('잘못된 높이(%s)는 열린 키보드 여백을 0으로 되돌린다', async (height) => {
    await boot('ios')
    const show = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardWillShow')![1]
    show({ keyboardHeight: 300 })
    show({ keyboardHeight: height as number })
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('0px')
  })

  it('줄어든 스크롤 영역의 트랜지션 완료 뒤 다시 보정하고 해제 뒤에는 보정하지 않는다', async () => {
    await boot('ios')
    const show = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardWillShow')![1]
    const container = document.createElement('div')
    container.className = 'apjek-page-scroll'
    const input = document.createElement('input')
    container.append(input)
    document.body.append(container)
    input.focus()
    input.scrollIntoView = vi.fn()
    vi.useFakeTimers()
    show({ keyboardHeight: 300 })
    vi.advanceTimersToNextFrame()
    vi.mocked(input.scrollIntoView).mockClear()
    // happy-dom의 TransitionEvent는 propertyName 초기화를 지원하지 않는다.
    const transition = (propertyName: string) => Object.assign(new Event('transitionend', { bubbles: true }), { propertyName })
    container.dispatchEvent(transition('opacity'))
    expect(input.scrollIntoView).not.toHaveBeenCalled()
    container.dispatchEvent(transition('height'))
    expect(input.scrollIntoView).toHaveBeenCalledOnce()
    for (const dispose of keyboardDisposers.splice(0)) dispose()
    document.body.classList.add('keyboard-open')
    container.dispatchEvent(transition('height'))
    expect(input.scrollIntoView).toHaveBeenCalledOnce()
  })

  it('높이 변경은 누적하지 않고 마지막 높이를 반영하며 해제 시 변수와 대기 프레임을 정리한다', async () => {
    await boot('ios')
    const show = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardWillShow')![1]
    const input = document.createElement('textarea')
    document.body.append(input)
    input.focus()
    input.scrollIntoView = vi.fn()
    vi.useFakeTimers()
    for (const height of [301, 216.5, 216.5, 346]) {
      show({ keyboardHeight: height })
      expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe(`${height}px`)
    }
    for (const dispose of keyboardDisposers.splice(0)) dispose()
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('')
    expect(document.body.classList.contains('ios-css-keyboard')).toBe(false)
    vi.advanceTimersByTime(400)
    expect(input.scrollIntoView).not.toHaveBeenCalled()
  })

  it('Android 네이티브에서는 리사이즈를 설정하거나 iOS 표시를 추가하지 않는다', async () => {
    await boot('android')
    expect(Keyboard.setResizeMode).not.toHaveBeenCalled()
    expect(document.body.classList.contains('ios-native-keyboard')).toBe(false)
    const show = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardWillShow')![1]
    show({ keyboardHeight: 300 })
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('')
    expect(document.body.classList.contains('ios-css-keyboard')).toBe(false)
  })

  it('웹에서는 키보드 초기화를 실행하지 않는다', async () => {
    mocks.native = false
    mocks.platform = 'ios'
    await capacitorPlugin(pluginApp())
    expect(Keyboard.setResizeMode).not.toHaveBeenCalled()
    expect(Keyboard.addListener).not.toHaveBeenCalled()
  })

  it.each([false, true])('None 실패 후 Native로 폴백하고 초기화를 계속한다 (Native 실패: %s)', async (nativeFails) => {
    vi.mocked(Keyboard.setResizeMode).mockRejectedValueOnce(new Error('none unavailable'))
    if (nativeFails) vi.mocked(Keyboard.setResizeMode).mockRejectedValueOnce(new Error('native unavailable'))
    await boot('ios')
    expect(Keyboard.setResizeMode).toHaveBeenNthCalledWith(1, { mode: 'none' })
    expect(Keyboard.setResizeMode).toHaveBeenNthCalledWith(2, { mode: 'native' })
    expect(document.body.classList.contains('ios-native-keyboard')).toBe(true)
    expect(document.body.classList.contains('ios-css-keyboard')).toBe(false)
    const show = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardWillShow')![1]
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    input.scrollIntoView = vi.fn()
    vi.useFakeTimers()
    show({ keyboardHeight: 300 })
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('')
    vi.advanceTimersByTime(299)
    expect(input.scrollIntoView).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(input.scrollIntoView).toHaveBeenCalledOnce()
    expect(Keyboard.addListener).toHaveBeenCalledWith('keyboardWillShow', expect.any(Function))
    expect(Keyboard.addListener).toHaveBeenCalledWith('keyboardDidHide', expect.any(Function))
    expect(App.addListener).toHaveBeenCalledWith('resume', expect.any(Function))
  })

  it.each([true, false])('늦은 뷰포트 변경 뒤 입력을 다시 보정하고 닫힘·해제 뒤에는 보정하지 않는다 (%s)', async (reduce) => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: reduce }) as MediaQueryList)
    vi.mocked(Keyboard.setResizeMode).mockRejectedValueOnce(new Error('none unavailable'))
    await boot('ios')
    const show = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardWillShow')![1]
    const hide = vi.mocked(Keyboard.addListener).mock.calls.find(([event]) => event === 'keyboardDidHide')![1]
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    input.scrollIntoView = vi.fn()
    window.dispatchEvent(new Event('resize'))
    expect(input.scrollIntoView).not.toHaveBeenCalled()
    vi.useFakeTimers()
    show({ keyboardHeight: 300 })
    vi.advanceTimersByTime(300)
    vi.mocked(input.scrollIntoView).mockClear()
    window.dispatchEvent(new Event('resize'))
    expect(input.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
    hide()
    expect(document.body.classList.contains('keyboard-open')).toBe(false)
    vi.mocked(input.scrollIntoView).mockClear()
    window.dispatchEvent(new Event('resize'))
    expect(input.scrollIntoView).not.toHaveBeenCalled()

    const handles = await Promise.all(vi.mocked(Keyboard.addListener).mock.results.map(result => result.value))
    for (const dispose of keyboardDisposers.splice(0)) dispose()
    await Promise.resolve()
    expect(document.body.classList.contains('ios-native-keyboard')).toBe(false)
    for (const handle of handles) expect(handle.remove).toHaveBeenCalledOnce()
    // 해제 뒤 표시 상태가 남더라도 뷰포트 리스너는 더 이상 실행되지 않는다.
    document.body.classList.add('keyboard-open')
    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(400)
    expect(input.scrollIntoView).not.toHaveBeenCalled()
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
    await capacitorPlugin(pluginApp())
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
    await capacitorPlugin(pluginApp())
    const urlOpen = vi.mocked(App.addListener).mock.calls.filter(([event]) => event === 'appUrlOpen').at(-1)![1] as (event: { url: string }) => void
    await vi.waitFor(() => expect(App.getLaunchUrl).toHaveBeenCalledTimes(1))
    urlOpen({ url: 'terraworld:///share/xyz' })
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith('/share/xyz')
  })
})
