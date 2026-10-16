import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, ref, Suspense } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useNuxtApp, useRuntimeConfig } from '#app'
import { createHead, renderSSRHead } from '@unhead/vue/server'
import SharePage from '~/pages/share/[code].vue'
import bannerPlugin from '~/plugins/smart-app-banner'

const mocks = vi.hoisted(() => ({
  native: false,
  error: null as null | { statusCode: number },
  getSession: vi.fn().mockResolvedValue({ data: null }),
  head: undefined as any,
}))
vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>()
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => mocks.native } }
})
vi.mock('~/lib/auth-client', () => ({ authClient: { useSession: () => ref<{ data: null }>({ data: null }), getSession: mocks.getSession } }))
mockNuxtImport('useRoute', () => () => ({ params: { code: 'invite-123' } }))
mockNuxtImport('useOpenApi', () => () => ({ sdk: {}, client: {} }))
mockNuxtImport('useAuth', () => () => ({ isLoggedIn: ref(false) }))
mockNuxtImport('useAsyncData', () => async () => ({
  data: ref({ nickname: '친구', placedItems: [], background: null }), pending: ref(false), error: ref(mocks.error), refresh: vi.fn(),
}))
// Nuxt vitest 는 `@unhead/vue` import 를 `#imports` 로 바꿔 이 mock 자신을 다시 부르므로,
// Nuxt useHead 의 head 옵션으로 테스트마다 새 SSR head 에 기록한다.
mockNuxtImport('useHead', original => (input: any, options: any = {}) => original(input, mocks.head ? { ...options, head: mocks.head } : options))

const Link = defineComponent({ props: ['to'], setup: (props, { slots }) => () => h('a', { href: props.to }, slots.default?.()) })
const Preview = defineComponent({ setup: () => () => h('div', '테라리움') })
const wrappers: VueWrapper[] = []
const apps: ReturnType<typeof createSSRApp>[] = []
const containers: HTMLElement[] = []
let previousConfig: { appStoreId: string; appStoreProviderToken: string; siteUrl: string }

async function mountPage() {
  const wrapper = await mountSuspended(SharePage, { global: { stubs: { NuxtLink: Link, FriendsTerrariumView: Preview } } })
  wrappers.push(wrapper)
  return wrapper
}

function ssrApp() {
  const nuxt = useNuxtApp()
  const app = createSSRApp({ render: () => h(Suspense, null, { default: () => h(SharePage) }) })
  app._context.provides = { ...nuxt.vueApp._context.provides }
  app._context.components = { ...nuxt.vueApp._context.components, NuxtLink: Link, FriendsTerrariumView: Preview }
  app._context.directives = nuxt.vueApp._context.directives
  app.config.globalProperties = nuxt.vueApp.config.globalProperties
  for (const [key, value] of Object.entries(nuxt.vueApp)) {
    if (!(key in app)) (app as unknown as Record<string, unknown>)[key] = value
  }
  return app
}

beforeEach(() => {
  mocks.native = false
  mocks.error = null
  const config = useRuntimeConfig().public
  previousConfig = { appStoreId: config.appStoreId, appStoreProviderToken: config.appStoreProviderToken, siteUrl: config.siteUrl }
  Object.assign(config, { appStoreId: '6786987682', appStoreProviderToken: '', siteUrl: 'https://terraworld.web-qplay.kr' })
  mocks.head = createHead()
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  apps.splice(0).forEach(app => app.unmount())
  containers.splice(0).forEach(container => container.remove())
  Object.assign(useRuntimeConfig().public, previousConfig)
  mocks.head = undefined
  vi.restoreAllMocks()
})

describe('공유 페이지 App Store 경로', () => {
  it('기존 로그인 CTA의 대상·문구·클래스를 유지하고 보조 링크 하나를 추가한다', async () => {
    const wrapper = await mountPage()
    const cta = wrapper.get('a[href="/auth/login?redirect=/share/invite-123"]')
    expect(cta.text()).toBe('나도 TerraWorld 시작하기')
    expect(cta.attributes('class')).toBe('block w-full bg-riso-sage text-white rounded-2xl py-3 font-bold text-sm riso-shadow-sm text-center active:scale-95 transition-transform')
    const links = wrapper.findAll('a[href^="https://apps.apple.com/"]')
    expect(links).toHaveLength(1)
    expect(links[0]!.text()).toBe('App Store에서 앱 받기')
    expect(links[0]!.attributes()).toMatchObject({ href: 'https://apps.apple.com/kr/app/terraworld/id6786987682', target: '_blank', rel: 'noopener', class: 'text-sm text-riso-dark/40' })
  })

  it('오류 화면의 홈 CTA 대상·문구·클래스를 유지한다', async () => {
    mocks.error = { statusCode: 404 }
    const wrapper = await mountPage()
    const cta = wrapper.get('a[href="/"]')
    expect(cta.text()).toBe('TerraWorld 시작하기')
    expect(cta.attributes('class')).toBe('inline-flex p-[2.5px] -m-[2.5px]')
    expect(cta.get('span').attributes('class')).toBe('inline-block bg-riso-sage text-white px-6 py-2.5 rounded-full text-sm font-medium riso-shadow-sm')
    expect(wrapper.findAll('a[href^="https://apps.apple.com/"]')).toHaveLength(0)
  })

  it('네이티브에서는 보조 링크를 숨긴다', async () => {
    mocks.native = true
    expect((await mountPage()).findAll('a[href^="https://apps.apple.com/"]')).toHaveLength(0)
  })

  it.each(['', 'provider-123'])('런타임 토큰 %s로 전역 배너를 SSR하고 공유 배너 하나로 덮어쓴다', async (token) => {
    useRuntimeConfig().public.appStoreProviderToken = token
    const nuxt = useNuxtApp()
    await nuxt.runWithContext(() => (bannerPlugin as (app: typeof nuxt) => unknown)(nuxt))
    const globalHtml = (await renderSSRHead(mocks.head)).headTags
    const globalContent = `app-id=6786987682${token ? ', affiliate-data=pt=provider-123&ct=web&mt=8' : ''}`
    expect(globalHtml).toContain(`content="${globalContent}"`)
    expect(globalHtml.match(/name="apple-itunes-app"/g)).toHaveLength(1)
    await nuxt.runWithContext(() => renderToString(ssrApp()))
    const shareHtml = (await renderSSRHead(mocks.head)).headTags
    expect(shareHtml.match(/name="apple-itunes-app"/g)).toHaveLength(1)
    expect(shareHtml).toContain(`content="app-id=6786987682${token ? ', affiliate-data=pt=provider-123&ct=share&mt=8' : ''}, app-argument=https://terraworld.web-qplay.kr/share/invite-123"`)
  })

  it('런타임 앱 ID와 사이트 URL을 공유 배너·링크에 반영한다', async () => {
    Object.assign(useRuntimeConfig().public, { appStoreId: '123456', appStoreProviderToken: 'partner', siteUrl: 'https://staging.example.com/' })
    const wrapper = await mountPage()
    expect(wrapper.get('a[target="_blank"]').attributes('href')).toBe('https://apps.apple.com/kr/app/terraworld/id123456?pt=partner&ct=share&mt=8')
    const html = (await renderSSRHead(mocks.head)).headTags
    expect(html).toContain('app-id=123456')
    expect(html).toContain('app-argument=https://staging.example.com/share/invite-123')
  })

  it.each([false, true])('SSR 후 하이드레이션 불일치 없이 마운트에서만 링크를 판정한다 (native=%s)', async (native) => {
    mocks.native = native
    const nuxt = useNuxtApp()
    const html = await nuxt.runWithContext(() => renderToString(ssrApp()))
    expect(html).not.toContain('https://apps.apple.com/')
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    containers.push(container)
    const warnings: string[] = []
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = ssrApp()
    app.config.warnHandler = message => warnings.push(message)
    apps.push(app)
    nuxt.runWithContext(() => app.mount(container))
    await flushPromises()
    await nextTick()
    expect(container.querySelectorAll('a[href^="https://apps.apple.com/"]')).toHaveLength(native ? 0 : 1)
    expect(warnings.filter(message => /hydration/i.test(message))).toEqual([])
    expect(errors.mock.calls.filter(args => args.some(arg => /hydration/i.test(String(arg))))).toEqual([])
  })
})
