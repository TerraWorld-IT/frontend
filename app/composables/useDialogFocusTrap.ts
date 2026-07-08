const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * `role="dialog" aria-modal="true"` 를 선언한 bespoke 오버레이에 실제 focus containment 를
 * 부여하는 공용 composable. Modal.vue 의 focus-trap 로직(Codex Round 2/3 감사 지적 — aria-modal
 * 만 선언하고 실제 trap/initial-focus/restore 가 없으면 스크린리더 사용자에게 거짓 계약이 됨)을
 * bespoke 오버레이(index.vue/record/calendar/profile/shop/TierModal 등)에서 재사용하기 위해 추출.
 *
 * 사용법:
 *   const rootEl = ref<HTMLElement | null>(null)
 *   useDialogFocusTrap(rootEl, computed(() => showXxx.value))
 *   <div ref="rootEl" v-if="showXxx" role="dialog" aria-modal="true" ...>
 */
export function useDialogFocusTrap(rootRef: Ref<HTMLElement | null>, isOpen: Ref<boolean>) {
  let previousActiveElement: Element | null = null

  function handleKeydown(e: KeyboardEvent) {
    if (!isOpen.value || !rootRef.value) return
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
