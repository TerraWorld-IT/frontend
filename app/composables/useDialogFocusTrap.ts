const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// 중첩 오버레이는 마지막으로 열린 한 곳만 키보드와 초기 포커스를 소유한다.
const focusStack: Array<{ root: Ref<HTMLElement | null>, previous: Element | null }> = []

/**
 * `role="dialog" aria-modal="true"` 를 선언한 bespoke 오버레이에 실제 focus containment 를
 * 부여하는 공용 composable. Modal.vue 의 focus-trap 로직(Codex Round 2/3 감사 지적 — aria-modal
 * 만 선언하고 실제 trap/initial-focus/restore 가 없으면 스크린리더 사용자에게 거짓 계약이 됨)을
 * bespoke 오버레이(index.vue/record/calendar/profile/shop/GrowLostModal 등)에서 재사용하기 위해 추출.
 *
 * focus containment 와 함께 **배경 스크롤 잠금**도 부여한다(useOverlayScrollLock).
 * 모달이 열려 있는데 뒤 화면이 스크롤되던 문제를 이 한 곳에서 14개 오버레이에 일괄 적용한다.
 *
 * 사용법:
 *   const rootEl = ref<HTMLElement | null>(null)
 *   useDialogFocusTrap(rootEl, computed(() => showXxx.value), () => { showXxx.value = false })
 *   <div ref="rootEl" v-if="showXxx" role="dialog" aria-modal="true" ...>
 *
 * onEscape (선택): Escape 키로 오버레이를 닫는 콜백. 미전달 시 ESC 는 무동작(구 동작 유지).
 * 2026-07-20 audit C1-1 — ESC 닫기가 CommonModal 에만 있고 bespoke 15곳은 키보드로 닫을 수
 * 없던 불일치를 이 한 곳에서 일괄 해소한다.
 */
export function useDialogFocusTrap(rootRef: Ref<HTMLElement | null>, isOpen: Ref<boolean>, onEscape?: () => void) {
  useOverlayScrollLock(isOpen)
  const owner = { root: rootRef, previous: null as Element | null }

  function focusables(): HTMLElement[] {
    return Array.from(rootRef.value?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []).filter((el) => {
      if (el.matches(':disabled') || el.tabIndex < 0) return false
      for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node)
        if (node.hidden || node.inert || node.getAttribute('aria-hidden') === 'true' || style.display === 'none' || style.visibility === 'hidden') return false
      }
      return true
    })
  }

  function release() {
    const index = focusStack.indexOf(owner)
    if (index < 0) return
    const wasTop = index === focusStack.length - 1
    // 아래 모달이 먼저 사라지면 위 모달의 복귀점도 살아 있는 이전 조작으로 연결한다.
    const next = focusStack[index + 1]
    if (next && owner.root.value?.contains(next.previous)) next.previous = owner.previous
    focusStack.splice(index, 1)
    if (wasTop && owner.previous instanceof HTMLElement && owner.previous.isConnected) owner.previous.focus()
    owner.previous = null
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.defaultPrevented || !isOpen.value || !rootRef.value || focusStack.at(-1) !== owner) return
    if (e.key === 'Escape') {
      // 닫기 콜백이 없는 오버레이(차단 게이트 등)는 ESC 를 소비하지 않는다 — 상위 처리를 막지 않도록.
      if (!onEscape) return
      e.preventDefault()
      onEscape()
      return
    }
    if (e.key !== 'Tab') return
    const elements = focusables()
    const first = elements[0] ?? rootRef.value
    const last = elements.at(-1) ?? rootRef.value
    if (!elements.length || !elements.includes(document.activeElement as HTMLElement)
      || (e.shiftKey ? document.activeElement === first : document.activeElement === last)) {
      e.preventDefault()
      ;(e.shiftKey ? last : first).focus()
    }
  }

  watch(isOpen, async (open) => {
    if (!import.meta.client) return
    if (!open) { release(); return }
    owner.previous = document.activeElement
    focusStack.push(owner)
    await nextTick()
    if (!isOpen.value || focusStack.at(-1) !== owner || !rootRef.value) return
    if (!rootRef.value.hasAttribute('tabindex')) rootRef.value.setAttribute('tabindex', '-1')
    ;(focusables().find(el => el.hasAttribute('autofocus')) ?? focusables()[0] ?? rootRef.value).focus()
  }, { immediate: true })

  onMounted(() => {
    if (import.meta.client) document.addEventListener('keydown', handleKeydown)
  })
  onBeforeUnmount(() => {
    if (!import.meta.client) return
    document.removeEventListener('keydown', handleKeydown)
    release()
  })
}
