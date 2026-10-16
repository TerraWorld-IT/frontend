import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref, type Ref } from 'vue'
import analyticsPlugin from '~/plugins/analytics-consent.client'

type User = { analyticsConsent?: boolean, consentVersion?: string }
const mocks = vi.hoisted(() => ({
  session: null as Ref<{ data: { user: User } | null }> | null,
  initialize: vi.fn(), disableAnalytics: vi.fn(), enableAnalytics: vi.fn(),
}))
// 테스트 앱 부팅 때도 이 플러그인이 먼저 실행되므로 세션 준비 전에는 비로그인 상태를 준다.
vi.mock('~/lib/auth-client', () => ({ authClient: { useSession: () => mocks.session ?? { value: null } } }))
// nuxt-gtag 가 비활성인 테스트 빌드에서는 useGtag 가 useGtagMock 별칭으로 자동 임포트되는데,
// mockNuxtImport 는 별칭 원본 이름을 대체하지 못한다. 두 구현 모듈을 직접 대체한다.
vi.mock('../../node_modules/nuxt-gtag/dist/runtime/composables/useGtagMock.js', () => ({ useGtagMock: () => mocks }))
vi.mock('../../node_modules/nuxt-gtag/dist/runtime/composables/useGtag.js', () => ({ useGtag: () => mocks }))
let scope: ReturnType<typeof effectScope>
beforeEach(() => {
  vi.resetAllMocks()
  mocks.session = ref({ data: null })
  scope = effectScope()
})
afterEach(() => scope.stop())
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
