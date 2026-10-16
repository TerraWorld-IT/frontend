import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref, type Ref } from 'vue'
import { initGtag, resolveTags } from '../../node_modules/nuxt-gtag/dist/runtime/utils.js'
import analyticsPlugin from '~/plugins/analytics-consent.client'
import { useGtagEvents } from '~/composables/useGtagEvents'

type User = { analyticsConsent?: boolean, consentVersion?: string }
const GA_ID = 'G-TEST000000'
const gtagOptions = {
  id: GA_ID,
  tags: [],
  config: { allow_google_signals: false, allow_ad_personalization_signals: false },
  initCommands: [],
  initMode: 'manual',
  url: 'https://www.googletagmanager.com/gtag/js',
}
const mocks = vi.hoisted(() => ({
  session: null as Ref<{ data: { user: User } | null }> | null,
}))
vi.mock('~/lib/auth-client', () => ({ authClient: { useSession: () => mocks.session ?? { value: null } } }))
// 테스트 빌드는 nuxt-gtag 가 비활성이라 useGtag 가 useGtagMock(no-op)으로 자동 임포트된다.
// 운영과 같은 큐 동작을 보려고 실제 useGtag 구현으로 바꾸고, 그 런타임 설정만 운영 값과 같게 준다.
vi.mock('../../node_modules/nuxt-gtag/dist/runtime/composables/useGtagMock.js', async () => {
  const actual = await vi.importActual<typeof import('../../node_modules/nuxt-gtag/dist/runtime/composables/useGtag.js')>(
    '../../node_modules/nuxt-gtag/dist/runtime/composables/useGtag.js',
  )
  return { useGtagMock: actual.useGtag }
})

let scope: ReturnType<typeof effectScope>
let track: ReturnType<typeof useGtagEvents>
beforeEach(() => {
  ;(useRuntimeConfig().public as Record<string, unknown>).gtag = gtagOptions
  delete (window as { dataLayer?: unknown }).dataLayer
  delete (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`]
  mocks.session = ref({ data: { user: { analyticsConsent: false, consentVersion: '2026-10-23' } } })
  // nuxt-gtag 플러그인(plugin.client.js)이 manual 모드에서도 부팅 때 하는 일: dataLayer 생성 + js/config 큐 적재.
  initGtag({ tags: resolveTags(gtagOptions) })
  scope = effectScope()
  scope.run(() => {
    analyticsPlugin({} as never)
    track = useGtagEvents()
  })
})
afterEach(() => scope.stop())

function queuedEvents(): string[] {
  const dataLayer = (window as { dataLayer?: IArguments[] }).dataLayer ?? []
  return dataLayer.map(entry => Array.from(entry)).filter(args => args[0] === 'event').map(args => String(args[1]))
}
function setConsent(analyticsConsent: boolean) {
  mocks.session!.value.data!.user.analyticsConsent = analyticsConsent
  return nextTick()
}

describe('동의 전 GA4 이벤트 큐 차단(실제 nuxt-gtag 런타임)', () => {
  it('동의 전 이벤트는 동의 뒤 초기화되어도 dataLayer 에 없다', async () => {
    track.trackRankingViewed({ type: 'monthly', yearMonth: '2026-10' })
    track.trackHeartClick()
    expect(queuedEvents()).toEqual([])

    await setConsent(true)
    expect(window[`ga-disable-${GA_ID}` as keyof Window]).toBeUndefined()
    expect(queuedEvents()).toEqual([])

    track.trackHeartClick()
    expect(queuedEvents()).toEqual(['heart_click'])
  })

  it('철회 중 이벤트는 다시 동의해도 dataLayer 에 없다', async () => {
    await setConsent(true)
    track.trackHeartClick()
    await setConsent(false)
    expect(window[`ga-disable-${GA_ID}` as keyof Window]).toBe(true)

    track.trackRankingViewed({ type: 'monthly', yearMonth: '2026-10' })
    await setConsent(true)
    expect(window[`ga-disable-${GA_ID}` as keyof Window]).toBeUndefined()
    track.trackInviteCreated()
    expect(queuedEvents()).toEqual(['heart_click', 'invite_created'])
  })

  it.each([
    ['2026-06-23'],
    [undefined],
  ])('동의해도 가입 버전이 %s 이면 이벤트를 쌓지 않는다', async (consentVersion) => {
    mocks.session!.value.data!.user.consentVersion = consentVersion
    await setConsent(true)
    track.trackRankingViewed({ type: 'monthly', yearMonth: '2026-10' })
    expect(queuedEvents()).toEqual([])
  })

  it('로그아웃 상태에서는 이벤트를 쌓지 않는다', async () => {
    mocks.session!.value.data = null
    await nextTick()
    track.trackLogin()
    expect(queuedEvents()).toEqual([])
  })
})
