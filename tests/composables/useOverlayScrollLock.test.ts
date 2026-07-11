// 이 스위트는 nuxt 환경(happy-dom)에서 돈다 — vitest.config.ts 의 전역 environment 설정.
// (document.documentElement 이 필요해 DOM 이 있어야 한다.)
import { afterEach, describe, expect, it } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useOverlayScrollLock } from '~/composables/useOverlayScrollLock'

const LOCK = 'scroll-locked'
const locked = (): boolean => document.documentElement.classList.contains(LOCK)

afterEach(() => {
  document.documentElement.classList.remove(LOCK)
  document.documentElement.removeAttribute('data-scroll-lock-count')
})

/** effectScope 안에서 콜백을 돌리고 scope 를 돌려준다 (onScopeDispose 를 stop() 으로 흉내). */
function inScope(fn: () => void) {
  const scope = effectScope()
  scope.run(fn)
  return scope
}

describe('useOverlayScrollLock', () => {
  it('열리면 <html> 에 잠금 클래스를 붙이고 닫히면 뗀다', async () => {
    const open = ref<boolean>(false)
    const scope = inScope(() => useOverlayScrollLock(open))
    expect(locked()).toBe(false)

    open.value = true
    await nextTick()
    expect(locked()).toBe(true)

    open.value = false
    await nextTick()
    expect(locked()).toBe(false)
    scope.stop()
  })

  it('중첩 오버레이: 안쪽이 닫혀도 바깥이 열려 있으면 잠금이 유지된다', async () => {
    const outer = ref<boolean>(true)
    const inner = ref<boolean>(false)
    const sOuter = inScope(() => useOverlayScrollLock(outer))
    const sInner = inScope(() => useOverlayScrollLock(inner))
    await nextTick()
    expect(locked()).toBe(true) // outer 가 잡음

    inner.value = true
    await nextTick()
    expect(locked()).toBe(true) // 둘 다 열림

    inner.value = false
    await nextTick()
    expect(locked()).toBe(true) // 회귀 지점 — outer 가 아직 열려 있으므로 유지

    outer.value = false
    await nextTick()
    expect(locked()).toBe(false) // 마지막이 닫혀야 풀림
    sOuter.stop()
    sInner.stop()
  })

  it('열린 채로 scope 가 dispose 되면 잠금을 되돌린다 (라우트 전환 중 unmount)', async () => {
    const open = ref<boolean>(true)
    const scope = inScope(() => useOverlayScrollLock(open))
    await nextTick()
    expect(locked()).toBe(true)

    scope.stop() // onScopeDispose 발동
    expect(locked()).toBe(false)
  })

  it('같은 오버레이가 여러 번 열려도 카운트를 한 번만 올린다', async () => {
    const open = ref<boolean>(false)
    const scope = inScope(() => useOverlayScrollLock(open))

    open.value = true
    await nextTick()
    open.value = true // 중복 — 카운트가 2 로 새면 안 됨
    await nextTick()
    expect(locked()).toBe(true)

    open.value = false
    await nextTick()
    expect(locked()).toBe(false) // 한 번의 닫힘으로 풀려야 함
    scope.stop()
  })
})
