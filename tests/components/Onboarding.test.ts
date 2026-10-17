import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import Onboarding from '~/components/common/Onboarding.vue'
import { STORAGE_KEYS } from '~/utils/constants'
import { useBackButtonStack } from '~/composables/useBackButtonStack'

let wrapper: VueWrapper | undefined
const targets = ['nav-record', 'nav-grow', 'nav-shop', 'home-manage', 'home-friends']
const root = () => document.querySelector<HTMLElement>('[data-testid="onboarding-root"]')!
const spot = () => document.querySelector<HTMLElement>('[data-testid="onboarding-spot"]')!
const card = () => document.querySelector<HTMLElement>('[data-testid="onboarding-card"]')!
// happy-dom 은 max()·calc(var()) 값을 해석하지 못해 빈 값으로 읽으므로, 카드 style 에 대입된 원래 값을 기록해 확인한다.
function recordCardStyle(prop: 'left' | 'right' | 'top' | 'bottom') {
  const set = vi.spyOn(CSSStyleDeclaration.prototype, prop, 'set')
  return () => set.mock.calls.filter((_, i) => set.mock.contexts[i] === card().style).at(-1)?.[0] ?? ''
}
async function click(testId: string) {
  document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)!.click()
  await flushPromises()
}
async function open(show = true) {
  wrapper = await mountSuspended(Onboarding, { props: { show } })
  await flushPromises()
  return wrapper
}
function target(name: string, top = 600) {
  const element = document.createElement('a')
  element.href = '/record'
  element.dataset.tourTarget = name
  element.getBoundingClientRect = vi.fn(() => ({ left: 20, top, width: 60, height: 44, right: 80, bottom: top + 44, x: 20, y: top, toJSON() {} }))
  element.scrollIntoView = vi.fn()
  document.body.append(element)
  return element
}
beforeEach(() => {
  vi.stubGlobal('innerHeight', 800)
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  document.documentElement.classList.remove('scroll-locked')
  document.documentElement.removeAttribute('data-scroll-lock-count')
  localStorage.removeItem(STORAGE_KEYS.ONBOARDING_DONE)
})

describe('Onboarding 화면 안내', () => {
  it('show=false면 렌더하지 않는다', async () => {
    await open(false)
    expect(root()).toBeNull()
  })
  it('body 텔레포트·다이얼로그 밴드·접근성 연결과 단일 카드를 유지한다', async () => {
    const w = await open()
    expect(w.element.contains(root())).toBe(false)
    expect(root().classList.contains('z-[9998]')).toBe(true)
    expect(root().getAttribute('role')).toBe('dialog')
    expect(root().getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(root().getAttribute('aria-labelledby')!)?.tagName).toBe('H3')
    expect(document.getElementById(root().getAttribute('aria-describedby')!)?.tagName).toBe('P')
    expect(root().querySelectorAll(':scope > div')).toHaveLength(1)
  })
  it('대상이 없으면 가운데 안전 영역 카드로 대체한다', async () => {
    await open()
    expect(spot()).toBeNull()
    expect(card().dataset.placement).toBe('center')
    expect(root().classList.contains('apjek-safe-dialog')).toBe(true)
  })
  it.each([[600, 'above'], [100, 'below']] as const)('대상 top=%i에서 6px 여백과 %s 배치를 적용한다', async (top, placement) => {
    const assigned = { left: recordCardStyle('left'), right: recordCardStyle('right'), top: recordCardStyle('top'), bottom: recordCardStyle('bottom') }
    target('nav-record', top)
    await open()
    expect(spot().style.left).toBe('14px')
    expect(spot().style.top).toBe(`${top - 6}px`)
    expect(spot().style.width).toBe('72px')
    expect(spot().style.height).toBe('56px')
    expect(spot().getAttribute('aria-hidden')).toBe('true')
    expect(spot().tagName).toBe('SPAN')
    expect(card().dataset.placement).toBe(placement)
    expect(assigned.left()).toContain('--sal')
    expect(assigned.right()).toContain('--sar')
    const edge = assigned[placement === 'above' ? 'bottom' : 'top']()
    expect(edge).toContain('--sat')
    expect(edge).toContain('--sab')
    expect(root().querySelectorAll(':scope > div')).toHaveLength(1)
  })
  it('다섯 대상을 순서대로 강조하고 시작하기에서 완료를 저장한다', async () => {
    targets.forEach((name, i) => target(name, 80 + i * 100))
    const w = await open()
    for (let i = 0; i < targets.length; i++) {
      expect(spot().style.top).toBe(`${74 + i * 100}px`)
      expect(root().querySelector('[aria-live="polite"]')?.textContent).toBe(`${i + 1}/5`)
      expect(document.activeElement).toBe(root().querySelector('h3'))
      if (i < 4) await click('onboarding-next')
    }
    expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)).toBeNull()
    await click('onboarding-start')
    expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)).toBe('true')
    expect(w.emitted('close')).toHaveLength(1)
  })
  it.each(['Escape', 'skip'])('%s로 완료를 저장하고 닫는다', async (action) => {
    const w = await open()
    if (action === 'Escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    else await click('onboarding-skip')
    expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)).toBe('true')
    expect(w.emitted('close')).toHaveLength(1)
  })
  it('어두운 영역과 강조 위치 클릭을 막아 대상 링크를 실행하거나 닫지 않는다', async () => {
    const link = target('nav-record')
    const listener = vi.fn()
    link.addEventListener('click', listener)
    const w = await open()
    root().click()
    spot().click()
    expect(spot().classList.contains('pointer-events-none')).toBe(true)
    expect(root().classList.contains('fixed')).toBe(true)
    expect(listener).not.toHaveBeenCalled()
    expect(w.emitted('close')).toBeUndefined()
    expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)).toBeNull()
  })
  it('이전 버튼과 Android 뒤로가기로 이동하고 첫 단계 뒤로가기에서 완료한다', async () => {
    const w = await open()
    const { popTopBackHandler } = useBackButtonStack()
    await click('onboarding-next')
    await click('onboarding-prev')
    expect(root().querySelector('[aria-live]')?.textContent).toBe('1/5')
    await click('onboarding-next')
    expect(popTopBackHandler()).toBe(true)
    await nextTick()
    expect(root().querySelector('[aria-live]')?.textContent).toBe('1/5')
    expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)).toBeNull()
    expect(popTopBackHandler()).toBe(true)
    expect(w.emitted('close')).toHaveLength(1)
    expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)).toBe('true')
  })
  it('홈 대상에서 동작 줄이기 설정에 맞춰 스크롤한다', async () => {
    const manage = target('home-manage')
    const friends = target('home-friends')
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    await open()
    for (let i = 0; i < 3; i++) await click('onboarding-next')
    expect(manage.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' })
    await click('onboarding-next')
    expect(friends.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' })
  })
  it('포커스를 가두고 닫힘·언마운트에서 리스너와 뒤로가기 처리를 해제한다', async () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const w = await open()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    expect(root().contains(document.activeElement)).toBe(true)
    await w.setProps({ show: false })
    expect(useBackButtonStack().popTopBackHandler()).toBe(false)
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function), true)
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)).toBeNull()
  })
  it('스크롤·리사이즈·대상 크기 변경을 프레임마다 다시 측정한다', async () => {
    let onResize: ResizeObserverCallback | undefined
    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) { onResize = callback }
      observe = observe
      unobserve = vi.fn()
      disconnect = disconnect
    })
    let frame: FrameRequestCallback | undefined
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const element = target('nav-record')
    const rect = element.getBoundingClientRect as ReturnType<typeof vi.fn>
    await open()
    expect(observe).toHaveBeenCalledWith(element)
    frame!(0)
    rect.mockReturnValue({ left: 40, top: 200, width: 100, height: 50, bottom: 250 })
    window.dispatchEvent(new Event('scroll'))
    frame!(0)
    // 측정 결과는 반응형 상태라 DOM 반영은 다음 렌더에서 일어난다.
    await nextTick()
    expect(spot().style.left).toBe('34px')
    rect.mockReturnValue({ left: 50, top: 250, width: 120, height: 80, bottom: 330 })
    window.dispatchEvent(new Event('resize'))
    frame!(0)
    await nextTick()
    expect(spot().style.width).toBe('132px')
    rect.mockReturnValue({ left: 50, top: 250, width: 120, height: 100, bottom: 350 })
    onResize!([], {} as ResizeObserver)
    frame!(0)
    await nextTick()
    expect(spot().style.height).toBe('112px')
    wrapper!.unmount()
    wrapper = undefined
    expect(disconnect).toHaveBeenCalled()
  })
})
