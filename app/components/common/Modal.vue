<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        ref="modalRoot"
        class="fixed inset-0 z-[9997] flex items-start justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? 'modal-title' : undefined"
        :aria-describedby="message ? 'modal-message' : undefined"
        tabindex="-1"
        @click.self="cancel"
        @keydown.esc="cancel"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-riso-dark/30 backdrop-blur-sm" />

        <!--
          Modal card — max-height + overflow-y-auto (Codex 감사 지적): 이전엔 높이 제약이
          전혀 없어서 slot 콘텐츠가 긴 사용처(ExchangeModal/ItemSelectDialog/friends 페이지 등)에서
          작은 화면 세로 방향에 카드가 뷰포트를 넘어도 스크롤할 방법이 없었다. items-start + my-auto
          로 safe centering(짧을 땐 중앙, 길면 상단부터 스크롤 가능) 적용.
        -->
        <div
          class="relative bg-riso-cream rounded-2xl p-6 w-full max-w-sm riso-shadow border border-riso-walnut/10 my-auto overflow-y-auto"
          style="max-height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 32px)"
        >
          <h3 v-if="title" id="modal-title" class="text-lg font-bold mb-2">{{ title }}</h3>
          <p v-if="message" id="modal-message" class="text-sm text-riso-dark/60 mb-5">{{ message }}</p>
          <slot />

          <div class="flex gap-3 mt-5">
            <button
              v-if="showCancel"
              ref="cancelBtn"
              class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white border border-riso-walnut/15 text-riso-dark/60 active:bg-gray-50"
              @click="cancel"
            >
              {{ resolvedCancelText }}
            </button>
            <button
              ref="confirmBtn"
              class="flex-1 py-2.5 rounded-xl text-sm font-bold text-white riso-shadow-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              :class="confirmClass"
              @click="confirm"
            >
              {{ resolvedConfirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// UltraPlan code-review UX-002 — WCAG 2.1 SC 2.1.2 (No Keyboard Trap) + 2.4.3 (Focus Order)
// + 4.1.2 (Name, Role, Value).
// - role="dialog" + aria-modal + aria-labelledby/aria-describedby
// - Escape key 로 cancel
// - 열릴 때 confirm 버튼 으로 focus 이동 (또는 cancel — 의도된 default = confirm)
// - body scroll lock (열려있는 동안 background 스크롤 차단)
// - 닫힐 때 직전 focus 위치로 복귀
const { t } = useI18n()

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  variant?: 'primary' | 'danger'
}>(), {
  confirmText: undefined,
  cancelText: undefined,
  showCancel: true,
  variant: 'primary',
})

const resolvedConfirmText = computed<string>(() => props.confirmText ?? t('common.confirm'))
const resolvedCancelText = computed<string>(() => props.cancelText ?? t('common.cancel'))

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
  'cancel': []
}>()

const modalRoot = ref<HTMLElement | null>(null)
const confirmBtn = ref<HTMLButtonElement | null>(null)
const cancelBtn = ref<HTMLButtonElement | null>(null)
let previousActiveElement: Element | null = null

const confirmClass = computed(() =>
  props.variant === 'danger' ? 'bg-riso-poppy' : 'bg-riso-sage',
)

function confirm() {
  emit('confirm')
  emit('update:modelValue', false)
}

function cancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

// SSR-safe: import.meta.client 가드.
// SEC-302 — 다중 Modal 중첩 시 body scroll lock 누적 카운터. nested modal 모두 닫혀야 unlock.
function acquireScrollLock() {
  // 누적 카운터 — Modal A 열림 → B 열림 → A 닫힘 시에도 B 가 lock 유지
  const depth = Number((document.body.dataset.modalDepth ?? '0')) + 1
  document.body.dataset.modalDepth = String(depth)
  document.body.style.overflow = 'hidden'
}

function releaseScrollLock() {
  const depth = Math.max(0, Number((document.body.dataset.modalDepth ?? '0')) - 1)
  document.body.dataset.modalDepth = String(depth)
  if (depth === 0) {
    document.body.style.overflow = ''
    delete document.body.dataset.modalDepth
  }
}

watch(() => props.modelValue, async (open) => {
  if (!import.meta.client) return
  if (open) {
    previousActiveElement = document.activeElement
    acquireScrollLock()
    await nextTick()
    confirmBtn.value?.focus()
  } else {
    releaseScrollLock()
    if (previousActiveElement instanceof HTMLElement) {
      previousActiveElement.focus()
    }
    previousActiveElement = null
  }
})

// Focus trap — Tab / Shift+Tab 키 가 confirm ↔ cancel 사이만 순환
function handleTabTrap(e: KeyboardEvent) {
  // TYPE-201 — modelValue=false 시 ref 가 null 이라 length 0 으로 early return 되지만,
  // 의도 명시 + cost 절약 위해 modalValue open guard 를 맨 앞에.
  if (!props.modelValue) return
  if (e.key !== 'Tab') return
  const focusables = [cancelBtn.value, confirmBtn.value].filter((b): b is HTMLButtonElement => b !== null)
  if (focusables.length === 0) return
  const first = focusables[0]!
  const last = focusables[focusables.length - 1]!
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

onMounted(async () => {
  if (!import.meta.client) return
  document.addEventListener('keydown', handleTabTrap)
  // watch 는 modelValue 변경 시에만 발화 — 이미 열린 채 mount 되면 lock 을 직접 획득.
  if (props.modelValue) {
    previousActiveElement = document.activeElement
    acquireScrollLock()
    await nextTick()
    confirmBtn.value?.focus()
  }
})
onBeforeUnmount(() => {
  if (import.meta.client) {
    document.removeEventListener('keydown', handleTabTrap)
    // unmount 시 본 instance 가 lock 보유 중이었다면 depth 감소 후 0 일 때만 unlock
    if (props.modelValue) {
      releaseScrollLock()
    }
  }
})
</script>

<style scoped>
.modal-enter-active { transition: all 0.2s ease-out; }
.modal-leave-active { transition: all 0.15s ease-in; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .relative { transform: scale(0.95); }
</style>
