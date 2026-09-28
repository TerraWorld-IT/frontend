import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { useNuxtApp, useState } from '#app'
import CalendarPage from '~/pages/calendar/index.vue'

// 서버(SSR) 달 = 2026-09(5주/35칸), 기기(클라이언트) 시계 달 = 2026-08(6주/42칸).
// e2e/layout-parity.spec.ts 의 calendar-6-week 케이스(브라우저 시계 2026-08-15, 서버 실제
// 시계 9월)와 같은 월 경계 불일치를 재현한다.
const SERVER_VIEW = { year: 2026, month: 8 } // 9월(0-indexed)
const DEVICE_NOW = new Date('2026-08-15T12:00:00+09:00')

const session = ref<{ data: { user: { id: string } } | null }>({ data: { user: { id: 'cal-user' } } })
const mocks = vi.hoisted(() => ({
  sdk: { listRecords: vi.fn(), getNote: vi.fn() },
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
  fetchMe: vi.fn(),
  routeLeave: vi.fn(),
}))

vi.mock('vue-router', async () => ({ ...(await vi.importActual('vue-router')), onBeforeRouteLeave: mocks.routeLeave }))
vi.mock('~/stores/user', () => ({ useUserStore: () => ({ me: { userId: 'cal-user' }, fetchMe: mocks.fetchMe }) }))
vi.mock('~/lib/auth-client', () => ({ authClient: { useSession: () => session } }))
mockNuxtImport('useOpenApi', () => () => ({ sdk: mocks.sdk, client: {} }))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('dismissKeyboard', () => vi.fn())

const wrappers: VueWrapper[] = []

function seedServerView(value: { year: number, month: number }) {
  const nuxtApp = useNuxtApp()
  const ssrView = nuxtApp.runWithContext(() => useState<{ year: number, month: number }>('calendar.ssrView', () => value))
  ssrView.value = value
}

// 순수 createSSRApp(CalendarPage) 는 i18n 등 Nuxt 플러그인이 없어 setup 의 useI18n 이 던진다.
// 그 예외가 setupComponent 의 isSSR 플래그 리셋(app/pages/calendar/index.vue 밖, Vue 내부)을
// 건너뛰게 해 이후 테스트의 onMounted 를 영구히 무력화하는 부작용까지 낸다 — 그래서 여기선
// 실제 Nuxt 앱(mountSuspended 가 쓰는 것과 같은 vueApp)의 provide/컴포넌트 컨텍스트를
// 그대로 재사용해(플러그인 재설치 없이) 같은 페이지 테스트들과 같은 @nuxt/test-utils 경로를 탄다.
function ssrRenderCalendarPage(): Promise<string> {
  const nuxtApp = useNuxtApp()
  const vueApp = nuxtApp.vueApp
  const app = createSSRApp(CalendarPage)
  app._context.provides = vueApp._context.provides
  app._context.components = vueApp._context.components
  app._context.directives = vueApp._context.directives
  app.config.globalProperties = vueApp.config.globalProperties
  // vue-i18n 의 useI18n() 은 inject 가 아니라 app.__VUE_I18N_SYMBOL__(app.use 가 심는 마커)로
  // 설치 여부를 먼저 검사한다 — mountSuspended 가 쓰는 patchInstanceAppContext 와 같은 방식으로
  // vueApp 이 가진 마커 프로퍼티를 그대로 옮겨온다.
  for (const [key, value] of Object.entries(vueApp)) {
    if (key in app) continue
    ;(app as unknown as Record<string, unknown>)[key] = value
  }
  return nuxtApp.runWithContext(() => renderToString(app))
}

beforeEach(() => {
  vi.clearAllMocks()
  session.value = { data: { user: { id: 'cal-user' } } }
  mocks.sdk.listRecords.mockResolvedValue({ data: { content: [], totalPages: 1 } })
  mocks.fetchMe.mockResolvedValue(undefined)
})

afterEach(() => {
  wrappers.splice(0).reverse().forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
})

describe('캘린더 SSR·기기 월 불일치', () => {
  it('서버가 판단한 달이 기기 달과 달라도 첫 렌더(SSR)는 서버가 넘긴 달의 주 수를 쓴다', async () => {
    // 기기 시계를 서버 달(2026-09)과 다른 2026-08 로 고정한다 — 이 고정이 없으면 실제
    // 날짜가 2026-09 일 때 수정 전 코드(new Date() 로 viewYear·viewMonth 초기화)도
    // 우연히 같은 달이 되어 이 검사를 통과해버린다.
    vi.useFakeTimers()
    vi.setSystemTime(DEVICE_NOW)
    seedServerView(SERVER_VIEW)
    const html = await ssrRenderCalendarPage()
    const skeletonCells = html.match(/data-testid="calendar-skeleton-cell"/g) ?? []
    // 2026-09 은 5주(35칸) — 기기 달인 2026-08(6주/42칸)과 다름을 이 수치 차이로 확인한다.
    expect(skeletonCells.length).toBe(35)
  })

  it('마운트 뒤 기기 시계 기준 달로 바뀌고 그 달 기록을 요청한다', async () => {
    seedServerView(SERVER_VIEW)
    vi.useFakeTimers()
    vi.setSystemTime(DEVICE_NOW)

    const wrapper = await mountSuspended(CalendarPage, { shallow: true })
    wrappers.push(wrapper)
    await flushPromises()

    const state = wrapper.vm.$.setupState as Record<string, any>
    // 기기 달(2026-08, 0-indexed 7)로 바뀌어 있어야 한다 — 서버가 넘긴 9월(8)이 남지 않는다.
    expect(state.viewYear).toBe(2026)
    expect(state.viewMonth).toBe(7)
    expect(mocks.sdk.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ year: 2026, month: 8 }) }),
    )
    expect(mocks.sdk.listRecords).not.toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ month: 9 }) }),
    )
  })
})
