import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref, type Ref } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useNuxtApp } from '#app'
import consentPlugin from '~/plugins/analytics-consent.client'

type Session = { data: { user: { analyticsConsent: boolean } } | null }
const mocks = vi.hoisted(() => ({
  initialize: vi.fn(), disableAnalytics: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: null }),
  session: null as Ref<Session> | null,
  useSession: vi.fn(),
}))
vi.mock('~/lib/auth-client', () => ({ authClient: {
  getSession: mocks.getSession,
  useSession: mocks.useSession,
} }))
// 테스트 빌드는 gtag.enabled=false 라 auto-import 가 `useGtagMock as useGtag` 로 연결되어
// mockNuxtImport('useGtag') 가 실제 export 를 바꾸지 못한다. 두 구현 모듈을 직접 대체한다.
vi.mock('../../node_modules/nuxt-gtag/dist/runtime/composables/useGtagMock.js', () => ({
  useGtagMock: () => ({ initialize: mocks.initialize, disableAnalytics: mocks.disableAnalytics }),
}))
vi.mock('../../node_modules/nuxt-gtag/dist/runtime/composables/useGtag.js', () => ({
  useGtag: () => ({ initialize: mocks.initialize, disableAnalytics: mocks.disableAnalytics }),
}))
const Harness = defineComponent({
  setup() {
    consentPlugin(useNuxtApp())
    return () => null
  },
})
let wrapper: VueWrapper | undefined

// 앱 부팅에서 만든 감시자와 테스트의 세션을 분리한다.
mocks.useSession.mockImplementation(() => mocks.session ?? ref<Session>({ data: null }))
beforeEach(() => {
  vi.clearAllMocks()
  mocks.session = ref<Session>({ data: null })
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined; mocks.session = null })

describe('GA4 동의 게이트', () => {
  it('미로그인·미동의에서는 초기화하지 않고 동의·철회에만 반응한다', async () => {
    const session = mocks.session!
    wrapper = await mountSuspended(Harness)
    expect(mocks.useSession).toHaveBeenCalledOnce()
    expect(mocks.initialize).not.toHaveBeenCalled()
    session.value = { data: { user: { analyticsConsent: false } } }
    await nextTick()
    expect(mocks.initialize).not.toHaveBeenCalled()
    session.value.data!.user.analyticsConsent = true
    await nextTick()
    await flushPromises()
    expect(mocks.initialize).toHaveBeenCalledTimes(1)
    session.value.data!.user.analyticsConsent = false
    await nextTick()
    await flushPromises()
    expect(mocks.disableAnalytics).toHaveBeenCalledTimes(1)
  })
})
