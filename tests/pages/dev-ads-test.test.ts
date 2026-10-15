import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { Capacitor } from '@capacitor/core'
import AdsTestPage from '~/pages/dev/ads-test.vue'

const sdk = vi.hoisted(() => ({
  initialize: vi.fn(),
  prepare: vi.fn(),
  show: vi.fn(),
  addListener: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    initialize: sdk.initialize,
    prepareRewardVideoAd: sdk.prepare,
    showRewardVideoAd: sdk.show,
    addListener: sdk.addListener,
  },
  RewardAdPluginEvents: {
    Loaded: 'loaded', FailedToLoad: 'failedToLoad', Showed: 'showed',
    FailedToShow: 'failedToShow', Rewarded: 'rewarded', Dismissed: 'dismissed',
  },
}))

let nativeWrapper: VueWrapper | undefined
let previousEffectiveAt: string
beforeEach(() => {
  previousEffectiveAt = useRuntimeConfig().public.adsEffectiveAt
  useRuntimeConfig().public.adsEffectiveAt = '2026-10-23T00:00:00+09:00'
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-22T14:59:59.999Z'))
  vi.clearAllMocks()
})
afterEach(() => {
  nativeWrapper?.unmount()
  nativeWrapper = undefined
  useRuntimeConfig().public.adsEffectiveAt = previousEffectiveAt
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

// 개발자 광고 테스트 페이지 — 웹(테스트 환경)에서는 광고 SDK 를 부르지 않고 이유를 안내한다.
describe('dev/ads-test', () => {
  it('웹에서는 실행 버튼을 막고 앱에서 열라고 안내한다', async () => {
    const wrapper = await mountSuspended(AdsTestPage)
    const button = wrapper.get('[data-testid="ads-test-run"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('앱(안드로이드/iOS)에서 열어야')
    wrapper.unmount()
  })

  it('환경 표에 실행 환경·운영 광고 ID 상태·사용하는 테스트 ID 를 보여준다', async () => {
    const wrapper = await mountSuspended(AdsTestPage)
    const env = wrapper.get('[data-testid="ads-test-env"]').text()
    expect(env).toContain('웹 브라우저')
    expect(env).toContain('운영 광고 단위 ID')
    expect(env).toContain('구글 테스트 ca-app-pub-394')
    wrapper.unmount()
  })

  describe.each(['ios', 'android'])('%s 네이티브 진입', (platform) => {
    beforeEach(() => {
      vi.stubEnv('PROD', true)
      vi.spyOn(Capacitor, 'getPlatform').mockReturnValue(platform)
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
      vi.spyOn(Capacitor, 'isPluginAvailable').mockReturnValue(true)
    })

    it('시행 직전에는 버튼을 막고 클릭을 직접 전달해도 SDK를 호출하지 않는다', async () => {
      nativeWrapper = await mountSuspended(AdsTestPage)
      const button = nativeWrapper.get('[data-testid="ads-test-run"]')
      expect(button.attributes('disabled')).toBeDefined()
      // 버튼 비활성화 외에 실행 함수의 차단도 검증한다.
      button.element.removeAttribute('disabled')
      await button.trigger('click')
      await flushPromises()
      expect(sdk.initialize).not.toHaveBeenCalled()
      expect(sdk.addListener).not.toHaveBeenCalled()
      expect(sdk.prepare).not.toHaveBeenCalled()
      expect(sdk.show).not.toHaveBeenCalled()
    })

    it('시행 시각부터 테스트 광고 초기화·로드·표시와 보상 결과가 유지된다', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-22T15:00:00.000Z'))
      const listeners = new Map<string, (value?: unknown) => void>()
      sdk.initialize.mockResolvedValue(undefined)
      sdk.prepare.mockResolvedValue(undefined)
      sdk.remove.mockResolvedValue(undefined)
      sdk.addListener.mockImplementation(async (event, callback) => {
        listeners.set(event, callback)
        return { remove: sdk.remove }
      })
      sdk.show.mockImplementation(async () => {
        listeners.get('rewarded')?.({ type: 'coins', amount: 10 })
        listeners.get('dismissed')?.()
      })
      nativeWrapper = await mountSuspended(AdsTestPage)
      const button = nativeWrapper.get('[data-testid="ads-test-run"]')
      expect(button.attributes('disabled')).toBeUndefined()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      await button.trigger('click')
      await vi.waitFor(() => expect(nativeWrapper!.find('[data-testid="ads-test-result"]').exists()).toBe(true))
      expect(sdk.initialize).toHaveBeenCalledExactlyOnceWith({ initializeForTesting: true })
      expect(sdk.prepare).toHaveBeenCalledExactlyOnceWith({
        adId: platform === 'ios' ? 'ca-app-pub-3940256099942544/1712485313' : 'ca-app-pub-3940256099942544/5224354917',
        npa: true,
        isTesting: true,
      })
      expect(sdk.show).toHaveBeenCalledTimes(1)
      expect(nativeWrapper.get('[data-testid="ads-test-result"]').text()).toContain('보상 이벤트 수신 ✓')
      expect(sdk.remove).toHaveBeenCalledTimes(6)
    })
  })
})
