import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useBackButtonStack } from '~/composables/useBackButtonStack'
import { useDialogFocusTrap } from '~/composables/useDialogFocusTrap'
import { useToast } from '~/composables/useToast'
import { readFileSync } from 'node:fs'
const css = readFileSync('app/assets/css/tailwind.css', 'utf8')

const cleanups: Array<() => void> = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
  const toast = useToast()
  toast.toasts.value.forEach(t => toast.dismiss(t.id))
  vi.useRealTimers()
  document.body.innerHTML = ''
})

function dialog(open = ref<boolean>(true), empty = false, withEscape = true) {
  const escape = vi.fn(() => { open.value = false })
  const wrapper = mount(defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null)
      useDialogFocusTrap(root, open, withEscape ? escape : undefined)
      return () => open.value ? h('div', { ref: root, role: 'dialog' }, empty
        ? [h('button', { disabled: true }, 'disabled'), h('button', { style: 'display:none' }, 'hidden')]
        : [h('button', 'first'), h('button', 'last')]) : null
    },
  }), { attachTo: document.body })
  cleanups.push(() => wrapper.unmount())
  return { wrapper, open, escape }
}

function key(value: string, shiftKey = false) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true, cancelable: true }))
}

describe('안전영역 오버레이 수명', () => {
  it('닫기 거부 후 두 번 back은 같은 최상단을 호출하고 실제 해제 후 아래로 이동한다', () => {
    const stack = useBackButtonStack()
    const outer = vi.fn()
    const inner = vi.fn()
    const removeOuter = stack.pushBackHandler(outer)
    const removeInner = stack.pushBackHandler(inner)
    cleanups.push(removeOuter, removeInner)
    expect(stack.popTopBackHandler()).toBe(true)
    expect(stack.popTopBackHandler()).toBe(true)
    expect(inner).toHaveBeenCalledTimes(2)
    expect(outer).not.toHaveBeenCalled()
    removeInner()
    stack.popTopBackHandler()
    expect(outer).toHaveBeenCalledTimes(1)
    removeOuter()
    expect(stack.popTopBackHandler()).toBe(false)
  })

  it('initial true에서 포커스 이동, 중첩 Tab/Escape 소유권, 잠금 깊이 0→2→0', async () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const outer = dialog()
    await nextTick()
    expect(document.activeElement).toBe(outer.wrapper.findAll('button')[0]!.element)
    const inner = dialog()
    await nextTick()
    expect(document.documentElement.getAttribute('data-scroll-lock-count')).toBe('2')
    const buttons = inner.wrapper.findAll('button')
    buttons[1]!.element.focus()
    key('Tab')
    expect(document.activeElement).toBe(buttons[0]!.element)
    key('Tab', true)
    expect(document.activeElement).toBe(buttons[1]!.element)
    key('Escape')
    await nextTick()
    expect(inner.escape).toHaveBeenCalledTimes(1)
    expect(outer.escape).not.toHaveBeenCalled()
    expect(document.documentElement.getAttribute('data-scroll-lock-count')).toBe('1')
    expect(document.activeElement).toBe(outer.wrapper.findAll('button')[0]!.element)
    key('Escape')
    await nextTick()
    expect(document.documentElement.classList.contains('scroll-locked')).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('비활성/숨긴 조작뿐인 initial dialog는 root fallback으로 Tab을 가두고 unmount 시 복귀한다', async () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const modal = dialog(ref<boolean>(true), true)
    await nextTick()
    expect(modal.wrapper.attributes('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(modal.wrapper.element)
    key('Tab')
    expect(document.activeElement).toBe(modal.wrapper.element)
    modal.wrapper.unmount()
    cleanups.pop()
    expect(document.activeElement).toBe(trigger)
  })

  // F14 — onEscape 를 넘기지 않은 오버레이(차단 게이트 등)는 ESC 를 소비하지 않아야 한다.
  it('onEscape 가 없으면 ESC 를 preventDefault 하지 않는다', async () => {
    const gate = dialog(ref<boolean>(true), false, false)
    await nextTick()
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    document.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(gate.escape).not.toHaveBeenCalled()
    // 같은 조건에서 onEscape 가 있으면 소비한다(대조군).
    const modal = dialog()
    await nextTick()
    const consumed = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    document.dispatchEvent(consumed)
    expect(consumed.defaultPrevented).toBe(true)
    expect(modal.escape).toHaveBeenCalledTimes(1)
  })

  it('독립 페이지 잠금은 unlayered !important 규칙이다', () => {
    const index = css.indexOf('html.scroll-locked .apjek-page-scroll')
    expect(index).toBeGreaterThan(0)
    const prefix = css.slice(0, index).replace(/\/\*[\s\S]*?\*\//g, '')
    expect((prefix.match(/\{/g)?.length ?? 0) - (prefix.match(/\}/g)?.length ?? 0)).toBe(0)
    expect(css.slice(index).split('}')[0]).toMatch(/overflow:\s*hidden\s*!important/)
  })

  it('토스트 큐는 대기 시간을 차감하지 않고 포커스 중 자동 닫힘을 멈춘다', async () => {
    vi.useFakeTimers()
    const toast = useToast()
    toast.show({ title: 'first', duration: 1000 })
    toast.show({ title: 'second', duration: 1000 })
    const root = document.createElement('div')
    root.dataset.toastId = String(toast.toasts.value[0]!.id)
    const action = document.createElement('button')
    root.append(action)
    document.body.append(root)
    action.focus()
    await vi.advanceTimersByTimeAsync(2000)
    expect(toast.toasts.value).toHaveLength(2)
    action.blur()
    await vi.advanceTimersByTimeAsync(1000)
    expect(toast.toasts.value.map(t => t.message)).toEqual(['second'])
    await vi.advanceTimersByTimeAsync(1000)
    expect(toast.toasts.value).toHaveLength(0)
  })
})
