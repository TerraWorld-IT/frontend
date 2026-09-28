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
    const nuxtApp = useNuxtApp()
    const html = await nuxtApp.runWithContext(() => renderToString(createSSRApp(CalendarPage)))
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
