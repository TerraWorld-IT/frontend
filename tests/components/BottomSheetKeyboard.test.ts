import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { nextTick, ref } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import BottomSheet from '~/components/common/BottomSheet.vue'
import RecordPage from '~/pages/record/index.vue'
import Modal from '~/components/common/Modal.vue'
import ExchangeDialog from '~/components/shop/ExchangeDialog.vue'
import DefaultLayout from '~/layouts/default.vue'

// B8: 키보드가 레이아웃 뷰포트를 줄이지 않는 WebView(Android 15 edge-to-edge)에서 시트 하단 CTA 가
// 키보드에 가려지지 않도록 visualViewport 기준으로 패널을 보이는 영역 안에 둔다. Android 네이티브에서만
// 적용하고 iOS 는 None 모드의 CSS 키보드 높이를 쓰며 웹 브라우저는 기존 배치를 유지한다.
const mocks = vi.hoisted(() => ({
  // 앱 부팅 플러그인(capacitor.client)이 네이티브 경로를 타지 않도록 기본은 web, 각 테스트에서 바꾼다.
  platform: 'web' as 'android' | 'ios' | 'web',
  sdk: { listCategories: vi.fn(), listFriends: vi.fn(), getGrowth: vi.fn(), createRecord: vi.fn(), getExchangeRates: vi.fn(async () => ({ data: { rates: [] } })) },
  routeLeave: vi.fn(),
}))
vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>()
  return {
    ...actual,
    Capacitor: { ...actual.Capacitor, isNativePlatform: () => mocks.platform !== 'web', getPlatform: () => mocks.platform },
  }
})
vi.mock('vue-router', async () => ({ ...(await vi.importActual('vue-router')), onBeforeRouteLeave: mocks.routeLeave }))
vi.mock('~/stores/user', () => ({ useUserStore: () => ({ me: { userId: 'record-user' }, fetchMe: vi.fn(async () => undefined) }) }))
vi.mock('~/lib/auth-client', () => ({ authClient: { useSession: () => ref({ data: { user: { id: 'record-user' } } }), getSession: vi.fn(async () => ({ data: { user: { id: 'record-user' } } })) } }))
mockNuxtImport('useOpenApi', () => () => ({ sdk: mocks.sdk, client: {} }))
mockNuxtImport('useToast', () => () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }))
mockNuxtImport('useGtagEvents', () => () => ({ trackRecordCreated: vi.fn() }))
mockNuxtImport('useHabits', () => () => ({ trackers: ref([]), loaded: ref(true), loadError: ref(false), load: vi.fn() }))
mockNuxtImport('dismissKeyboard', () => vi.fn())

// DOM 모의 환경은 dvh 레이아웃을 계산하지 않으므로 실제 CSS 규칙의 선택자·선언을 DOM과 대조한다.
const keyboardCss = readFileSync('app/assets/css/tailwind.css', 'utf8')
function keyboardRulesFor(element: Element): string[] {
  return Array.from(keyboardCss.matchAll(/(body\.ios-css-keyboard[^{}]*)\{([^{}]*)\}/g))
    .filter(([, selector]) => Array.from(document.querySelectorAll(selector!.trim())).includes(element))
    .map(([, , declarations]) => declarations!)
}

/** 테스트용 visualViewport — 실제 브라우저처럼 resize/scroll 이벤트로 변화를 알린다. */
class FakeVisualViewport extends EventTarget {
  height = 800
  offsetTop = 0
  scale = 1
  set(next: Partial<Pick<FakeVisualViewport, 'height' | 'offsetTop' | 'scale'>>, event: 'resize' | 'scroll' = 'resize') {
    Object.assign(this, next)
    this.dispatchEvent(new Event(event))
  }
}

let viewport: FakeVisualViewport
const originalViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport')
const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight')
const wrappers: VueWrapper[] = []

beforeEach(() => {
  mocks.platform = 'android'
  viewport = new FakeVisualViewport()
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
})
afterEach(() => {
  wrappers.splice(0).forEach(w => w.unmount())
  mocks.platform = 'web'
  if (originalViewport) Object.defineProperty(window, 'visualViewport', originalViewport)
  else delete (window as { visualViewport?: unknown }).visualViewport
  if (originalInnerHeight) Object.defineProperty(window, 'innerHeight', originalInnerHeight)
  document.body.innerHTML = ''
  document.body.classList.remove('ios-css-keyboard', 'keyboard-open')
  document.documentElement.style.removeProperty('--keyboard-inset')
})

async function mountSheet(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(BottomSheet, {
    props: { open: true, ariaLabel: '일기 기록', ...props },
    slots: { default: '<textarea data-test-body />', footer: '<button data-test-cta>저장하기</button>' },
  })
  wrappers.push(wrapper)
  return wrapper
}

function panel(): HTMLElement {
  return document.body.querySelector<HTMLElement>('.sheet-panel')!
}

function panelStyle(wrapper: VueWrapper): Record<string, string> {
  return (wrapper.vm.$ as unknown as { setupState: { panelStyle: Record<string, string> } }).setupState.panelStyle
}

describe('BottomSheet 키보드 가림 보정 (visualViewport, Android 네이티브)', () => {
  it('키보드가 없으면 기존처럼 화면 하단에 붙고 높이 상한만 둔다', async () => {
    const wrapper = await mountSheet()
    expect(panelStyle(wrapper).bottom).toBeUndefined()
    expect(panelStyle(wrapper).maxHeight).toBe('min(min(620px, 88dvh), calc(100dvh - var(--sat)))')
    expect(panel().style.bottom).toBe('')
  })

  it('Android edge-to-edge 실측(뷰포트 499px)처럼 레이아웃이 줄지 않으면 패널을 키보드 위로 올리고 보이는 높이로 줄인다', async () => {
    const wrapper = await mountSheet()
    viewport.set({ height: 499 })
    await nextTick()
    expect(panel().style.bottom).toBe('301px')
    expect(panelStyle(wrapper).maxHeight).toBe('min(min(min(620px, 88dvh), calc(100dvh - var(--sat))), calc(499px - var(--sat)))')
    // footer CTA 는 스크롤 영역 밖 패널 하단이라 패널 하단(=보이는 영역 하단) 위에 남는다.
    expect(panel().querySelector('[data-testid="sheet-footer"] [data-test-cta]')).not.toBeNull()

    viewport.set({ height: 800 })
    await nextTick()
    expect(panel().style.bottom).toBe('')
    expect(panelStyle(wrapper).maxHeight).toBe('min(min(620px, 88dvh), calc(100dvh - var(--sat)))')
  })

  it('보이는 영역이 스크롤(offsetTop)돼도 보이는 영역 하단에 맞춘다', async () => {
    const wrapper = await mountSheet()
    viewport.set({ height: 450, offsetTop: 100 })
    await nextTick()
    expect(panel().style.bottom).toBe('250px')
    expect(panelStyle(wrapper).maxHeight).toContain('calc(550px - var(--sat))')
    viewport.set({ offsetTop: 0 }, 'scroll')
    await nextTick()
    expect(panel().style.bottom).toBe('350px')
  })

  it('레이아웃 뷰포트가 함께 줄어드는 환경(가림 0)과 핀치 확대에서는 배치를 바꾸지 않는다', async () => {
    const wrapper = await mountSheet()
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 499 })
    viewport.set({ height: 499 })
    await nextTick()
    expect(panelStyle(wrapper).bottom).toBeUndefined()
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    viewport.set({ height: 400, scale: 2 })
    await nextTick()
    expect(panelStyle(wrapper).bottom).toBeUndefined()
  })

  it('fixedHeight 시트는 고정 높이도 보이는 영역 안으로 줄인다', async () => {
    const wrapper = await mountSheet({ fixedHeight: true })
    viewport.set({ height: 499 })
    await nextTick()
    expect(panelStyle(wrapper).height).toBe('min(min(620px, 88dvh), calc(499px - var(--sat)))')
  })

  it('닫히거나 언마운트되면 visualViewport 구독을 해제한다', async () => {
    const remove = vi.spyOn(viewport, 'removeEventListener')
    const wrapper = await mountSheet()
    viewport.set({ height: 499 })
    await nextTick()
    await wrapper.setProps({ open: false })
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(panelStyle(wrapper).bottom).toBeUndefined()
    await wrapper.setProps({ open: true })
    expect(panelStyle(wrapper).bottom).toBe('301px')
  })
})

describe('BottomSheet 키보드 가림 보정 플랫폼 분기', () => {
  it('웹에서는 visualViewport 를 구독하지 않고 키보드가 떠도 배치가 이전과 같다', async () => {
    mocks.platform = 'web'
    const add = vi.spyOn(viewport, 'addEventListener')
    const wrapper = await mountSheet()
    viewport.set({ height: 499 })
    await nextTick()
    expect(add).not.toHaveBeenCalled()
    expect(panelStyle(wrapper).bottom).toBeUndefined()
    expect(panelStyle(wrapper).maxHeight).toBe('min(min(620px, 88dvh), calc(100dvh - var(--sat)))')
    expect(panel().style.bottom).toBe('')
  })

  it.each([false, true])('iOS는 CSS 높이로 패널 하단과 높이를 제한하고 visualViewport와 중복 보정하지 않는다 (고정 높이: %s)', async (fixedHeight) => {
    mocks.platform = 'ios'
    document.body.classList.add('ios-css-keyboard', 'keyboard-open')
    document.documentElement.style.setProperty('--keyboard-inset', '301px')
    const add = vi.spyOn(viewport, 'addEventListener')
    const wrapper = await mountSheet({ fixedHeight })
    viewport.set({ height: 499 })
    await nextTick()
    expect(add).not.toHaveBeenCalled()
    // happy-dom은 bottom의 var()를 버리므로 Vue에 전달하는 스타일 계약을 검증한다.
    expect(panelStyle(wrapper).bottom).toBe('var(--keyboard-inset, 0px)')
    expect(panelStyle(wrapper).maxHeight).toContain('calc(100dvh - var(--keyboard-inset, 0px) - var(--sat))')
    if (fixedHeight) expect(panelStyle(wrapper).height).toContain('calc(100dvh - var(--keyboard-inset, 0px) - var(--sat))')
    expect(panel().querySelector('[data-testid="sheet-footer"] [data-test-cta]')).not.toBeNull()
    document.documentElement.style.setProperty('--keyboard-inset', '0px')
    expect(panelStyle(wrapper).bottom).toBe('var(--keyboard-inset, 0px)')
  })

  it('iOS Native 폴백은 CSS 높이 변수가 없으면 추가 여백을 만들지 않는다', async () => {
    mocks.platform = 'ios'
    const wrapper = await mountSheet()
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('')
    expect(panelStyle(wrapper).bottom).toBe('var(--keyboard-inset, 0px)')
  })
})

describe('iOS 키보드 레이아웃과 입력 모달', () => {
  it('닫힌 기본 레이아웃과 독립 페이지에는 고정 높이 규칙이 적용되지 않고 열렸을 때만 적용된다', async () => {
    mocks.platform = 'ios'
    document.body.classList.add('ios-css-keyboard')
    const wrapper = await mountSuspended(DefaultLayout, { attachTo: document.body })
    wrappers.push(wrapper)
    const frame = wrapper.get('.app-keyboard-frame').element
    expect(frame.closest('body')).toBe(document.body)
    const main = wrapper.get('main').element
    const layout = wrapper.get('.app-keyboard-layout').element
    const page = document.createElement('div')
    page.className = 'apjek-page-scroll'
    document.body.append(page)
    expect(frame.classList.contains('min-h-dvh')).toBe(true)
    for (const element of [frame, main, layout, page]) expect(keyboardRulesFor(element)).toHaveLength(0)
    document.body.classList.add('keyboard-open')
    expect(keyboardRulesFor(frame)[0]).toContain('height: max(0px, calc(100dvh - var(--keyboard-inset, 0px)))')
    expect(keyboardRulesFor(frame)[0]).toContain('min-height: 0')
    expect(keyboardRulesFor(main)[0]).toContain('min-height: 0')
    expect(keyboardRulesFor(page)[0]).toContain('height: max(0px, calc(100dvh - var(--keyboard-inset, 0px)))')
    document.body.classList.remove('keyboard-open')
    for (const element of [frame, main, layout, page]) expect(keyboardRulesFor(element)).toHaveLength(0)
  })

  it.each(['modal', 'exchange'] as const)('F1 %s의 body 입력 모달은 iOS CSS 모드에서만 하단과 패널 높이를 키보드와 함께 전환한다', async (kind) => {
    mocks.platform = 'ios'
    document.body.classList.add('ios-css-keyboard', 'keyboard-open')
    document.documentElement.style.setProperty('--keyboard-inset', '301px')
    const wrapper = kind === 'modal'
      ? await mountSuspended(Modal, { props: { modelValue: true }, slots: { default: '<input data-test-input>' } })
      : await mountSuspended(ExchangeDialog, { props: { modelValue: true } })
    wrappers.push(wrapper)
    await flushPromises()
    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.closest('body')).toBe(document.body)
    expect(dialog.querySelector('input')).not.toBeNull()
    const rules = keyboardRulesFor(dialog)
    expect(rules).toHaveLength(2)
    expect(rules[0]).toContain('bottom: var(--dialog-keyboard-inset)')
    expect(rules[0]).toContain('--dialog-keyboard-inset: var(--keyboard-inset, 0px)')
    const panel = dialog.querySelector<HTMLElement>(':scope > [style]')!
    expect(panel.getAttribute('style')).toContain('max-height: calc(100dvh - var(--dialog-keyboard-inset, 0px) - var(--sat) - var(--sab) - 32px)')
    expect(panel.classList.contains('overflow-y-auto')).toBe(true)
    const dialogTransition = 'transition: var(--dialog-visibility-transition, opacity 0s), bottom 0.25s ease'
    expect(rules.join('\n')).toContain(dialogTransition)
    expect(keyboardRulesFor(panel).join('\n')).toContain('transition: max-height 0.25s ease')
    // 전역 iOS 규칙이 scoped 등장·퇴장 규칙보다 우선해도 기존 효과를 함께 합성한다.
    const componentCss = readFileSync(kind === 'modal' ? 'app/components/common/Modal.vue' : 'app/components/shop/ExchangeDialog.vue', 'utf8').split('<style scoped>')[1]!
    if (kind === 'modal') {
      expect(componentCss).toMatch(/\.modal-enter-active\s*\{[^}]*--dialog-visibility-transition: all 0\.2s ease-out;/)
      expect(componentCss).toMatch(/\.modal-leave-active\s*\{[^}]*--dialog-visibility-transition: all 0\.15s ease-in;/)
    } else {
      expect(componentCss).toMatch(/\.fade-enter-active,\s*\.fade-leave-active\s*\{[^}]*--dialog-visibility-transition: opacity 0\.2s ease;/)
    }
    // 전역 reduced-motion의 !important가 두 트랜지션을 모두 사실상 즉시 완료시킨다.
    expect(keyboardCss).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\*,\s*\*::before,\s*\*::after\s*\{[^}]*transition-duration: 0\.01ms !important;/)
    document.documentElement.style.setProperty('--keyboard-inset', '0px')
    expect(keyboardRulesFor(dialog).join('\n')).toContain(dialogTransition)
    expect(keyboardRulesFor(panel).join('\n')).toContain('transition: max-height 0.25s ease')
    document.body.classList.remove('keyboard-open')
    expect(keyboardRulesFor(dialog)).toHaveLength(1)
    expect(keyboardRulesFor(dialog).join('\n')).not.toContain('transition:')
    expect(keyboardRulesFor(panel)).toHaveLength(0)
    // Android·웹·Native 폴백은 같은 템플릿에서도 여백 변수를 정의하는 CSS가 적용되지 않는다.
    document.body.classList.remove('ios-css-keyboard')
    for (const platform of ['android', 'web', 'ios'] as const) {
      mocks.platform = platform
      expect(keyboardRulesFor(dialog)).toHaveLength(0)
      expect(keyboardRulesFor(panel)).toHaveLength(0)
      expect(getComputedStyle(dialog).getPropertyValue('--dialog-keyboard-inset')).toBe('')
    }
  })
})

describe('일기 기록 시트 저장 CTA', () => {
  async function mountDiary() {
    mocks.sdk.listCategories.mockResolvedValue({ data: { categories: [{ id: 1, name: '독서', isCustom: false }] } })
    mocks.sdk.listFriends.mockResolvedValue({ data: [] })
    mocks.sdk.getGrowth.mockResolvedValue({ data: { items: [] } })
    const wrapper = await mountSuspended(RecordPage, {
      shallow: true,
      global: { renderStubDefaultSlot: true, stubs: {
        CommonBottomSheet: {
          props: ['open', 'ariaLabel'],
          template: '<section v-if="open" :aria-label="ariaLabel"><div data-sheet-body><slot /></div><div data-sheet-footer><slot name="footer" /></div></section>',
        },
      } },
    })
    wrappers.push(wrapper)
    await flushPromises()
    ;(wrapper.vm.$ as unknown as { setupState: { openModal: string } }).setupState.openModal = 'diary'
    await nextTick()
    return wrapper.get('section[aria-label="일기 기록"]')
  }

  it('Android 네이티브는 저장하기 버튼을 본문 스크롤 영역이 아닌 시트 footer 에 둔다', async () => {
    const sheet = await mountDiary()
    expect(sheet.find('[data-sheet-footer] [data-testid="diary-save"]').exists()).toBe(true)
    expect(sheet.find('[data-sheet-body] [data-testid="diary-save"]').exists()).toBe(false)
    expect(sheet.find('[data-sheet-body] textarea').exists()).toBe(true)
  })

  it.each(['ios', 'web'] as const)('%s 는 이전 배치 그대로 본문 아래에 둔다(footer 슬롯 없음)', async (platform) => {
    mocks.platform = platform
    const sheet = await mountDiary()
    const save = sheet.find('[data-sheet-body] [data-testid="diary-save"]')
    expect(save.exists()).toBe(true)
    // 이전과 같은 감싸기 요소·간격 클래스
    expect(save.element.parentElement!.className).toBe('px-5 pb-1 pt-2')
    expect(sheet.find('[data-sheet-footer] [data-testid="diary-save"]').exists()).toBe(false)
    expect(sheet.find('[data-sheet-footer]').text()).toBe('')
  })
})
