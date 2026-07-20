const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * `role="dialog" aria-modal="true"` 를 선언한 bespoke 오버레이에 실제 focus containment 를
 * 부여하는 공용 composable. Modal.vue 의 focus-trap 로직(Codex Round 2/3 감사 지적 — aria-modal
 * 만 선언하고 실제 trap/initial-focus/restore 가 없으면 스크린리더 사용자에게 거짓 계약이 됨)을
 * bespoke 오버레이(index.vue/record/calendar/profile/shop/TierModal 등)에서 재사용하기 위해 추출.
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

  let previousActiveElement: Element | null = null

  function handleKeydown(e: KeyboardEvent) {
    if (!isOpen.value || !rootRef.value) return
    if (e.key === 'Escape' && onEscape) {
      e.preventDefault()
      onEscape()
      return
    }
    if (e.key !== 'Tab') return
    const focusables = Array.from(rootRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    if (focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    }
    else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  watch(isOpen, async (open) => {
    if (!import.meta.client) return
    if (open) {
      previousActiveElement = document.activeElement
      await nextTick()
      rootRef.value?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
    }
    else if (previousActiveElement instanceof HTMLElement) {
      previousActiveElement.focus()
      previousActiveElement = null
    }
  })

  onMounted(() => {
    if (import.meta.client) document.addEventListener('keydown', handleKeydown)
  })
  onBeforeUnmount(() => {
    if (import.meta.client) document.removeEventListener('keydown', handleKeydown)
  })
}
