import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, effectScope, nextTick, ref, type Ref } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useNuxtApp } from '#app'
import analyticsPlugin from '~/plugins/analytics-consent.client'

type User = { analyticsConsent?: boolean, consentVersion?: string }
const mocks = vi.hoisted(() => ({
  session: null as Ref<{ data: { user: User } | null }> | null,
  initialize: vi.fn(), disableAnalytics: vi.fn(), enableAnalytics: vi.fn(),
  getSession: vi.fn(async () => ({ data: null })),
  // 테스트 앱 부팅 때도 이 플러그인이 먼저 실행되므로 세션 준비 전에는 비로그인 상태를 준다.
  // 원래 구현은 vi.fn 에 넘겨 resetAllMocks 뒤에도 유지된다.
  useSession: vi.fn((): unknown => mocks.session ?? { value: null }),
}))
vi.mock('~/lib/auth-client', () => ({ authClient: { getSession: mocks.getSession, useSession: mocks.useSession } }))
// nuxt-gtag 가 비활성인 테스트 빌드에서는 useGtag 가 useGtagMock 별칭으로 자동 임포트되는데,
// mockNuxtImport 는 별칭 원본 이름을 대체하지 못한다. 두 구현 모듈을 직접 대체한다.
vi.mock('../../node_modules/nuxt-gtag/dist/runtime/composables/useGtagMock.js', () => ({ useGtagMock: () => mocks }))
vi.mock('../../node_modules/nuxt-gtag/dist/runtime/composables/useGtag.js', () => ({ useGtag: () => mocks }))
let scope: ReturnType<typeof effectScope>
let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.resetAllMocks()
  mocks.session = ref({ data: null })
  scope = effectScope()
})
afterEach(() => {
  scope.stop()
  wrapper?.unmount()
  wrapper = undefined
  // 앱 부팅에서 만든 감시자와 테스트의 세션을 분리한다.
  mocks.session = null
})
function start(user?: User) {
  mocks.session!.value.data = user ? { user } : null
  scope.run(() => analyticsPlugin({} as never))
}

describe('GA4 개정본 가입 및 별도 동의 게이트', () => {
  it.each([
    [true, '2026-06-23', false],
    [true, '2026-10-23', true],
    [false, '2026-10-23', false],
    [true, undefined, false],
    [true, '', false],
    [undefined, '2026-10-23', false],
    [true, '2026-10-24', true],
  ] as const)('동의 %s, 버전 %s의 초기화 여부는 %s', (analyticsConsent, consentVersion, eligible) => {
    start({ analyticsConsent, consentVersion })
    expect(mocks.initialize).toHaveBeenCalledTimes(eligible ? 1 : 0)
    expect(mocks.enableAnalytics).toHaveBeenCalledTimes(eligible ? 1 : 0)
    expect(mocks.disableAnalytics).not.toHaveBeenCalled()
  })

  it('비로그인 상태에서 초기화하지 않는다', () => {
    start()
    expect(mocks.initialize).not.toHaveBeenCalled()
  })

  it('Nuxt 앱에서 미로그인·미동의에서는 초기화하지 않고 동의·철회에만 반응한다', async () => {
    const session = mocks.session!
    wrapper = await mountSuspended(defineComponent({
      setup() {
        analyticsPlugin(useNuxtApp())
        return () => null
      },
    }))
    expect(mocks.useSession).toHaveBeenCalledOnce()
    expect(mocks.initialize).not.toHaveBeenCalled()
    session.value = { data: { user: { analyticsConsent: false, consentVersion: '2026-10-23' } } }
    await nextTick()
    expect(mocks.initialize).not.toHaveBeenCalled()
    session.value.data!.user.analyticsConsent = true
    await nextTick()
    await flushPromises()
    expect(mocks.initialize).toHaveBeenCalledTimes(1)
    expect(mocks.enableAnalytics).toHaveBeenCalledTimes(1)
    session.value.data!.user.analyticsConsent = false
    await nextTick()
    await flushPromises()
    expect(mocks.disableAnalytics).toHaveBeenCalledTimes(1)
  })

  it('동의 철회 시 중단하고 다시 동의하면 전송을 다시 허용한다', async () => {
    start({ analyticsConsent: true, consentVersion: '2026-10-23' })
    mocks.session!.value.data!.user.analyticsConsent = false
    await nextTick()
    expect(mocks.disableAnalytics).toHaveBeenCalledOnce()
    mocks.session!.value.data!.user.analyticsConsent = true
    await nextTick()
    expect(mocks.initialize).toHaveBeenCalledTimes(2)
    expect(mocks.enableAnalytics).toHaveBeenCalledTimes(2)
  })

  it.each(['2026-06-23', undefined])('분석 동의가 유지되어도 가입 버전이 %s로 바뀌면 중단한다', async (consentVersion) => {
    start({ analyticsConsent: true, consentVersion: '2026-10-23' })
    mocks.session!.value.data = { user: { analyticsConsent: true, consentVersion } }
    await nextTick()
    expect(mocks.initialize).toHaveBeenCalledOnce()
    expect(mocks.disableAnalytics).toHaveBeenCalledOnce()
  })

  it('로그아웃하면 중단한다', async () => {
    start({ analyticsConsent: true, consentVersion: '2026-10-23' })
    mocks.session!.value.data = null
    await nextTick()
    expect(mocks.disableAnalytics).toHaveBeenCalledOnce()
  })

  it('초기화 실패를 시작으로 기록하지 않고 다음 동의 전환에서 재시도한다', async () => {
    mocks.initialize.mockImplementationOnce(() => { throw new Error('차단됨') })
    start({ analyticsConsent: true, consentVersion: '2026-10-23' })
    expect(mocks.enableAnalytics).not.toHaveBeenCalled()
    mocks.session!.value.data!.user.analyticsConsent = false
    await nextTick()
    expect(mocks.disableAnalytics).not.toHaveBeenCalled()
    mocks.session!.value.data!.user.analyticsConsent = true
    await nextTick()
    expect(mocks.initialize).toHaveBeenCalledTimes(2)
    expect(mocks.enableAnalytics).toHaveBeenCalledOnce()
  })
})
