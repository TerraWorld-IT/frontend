<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        ref="modalRoot"
        class="fixed inset-0 z-[9997] apjek-safe-dialog p-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? 'modal-title' : undefined"
        :aria-describedby="message ? 'modal-message' : undefined"
        tabindex="-1"
      >
        <!-- Backdrop — 탭/클릭 시 cancel (X·ESC 와 같은 경로). 루트의 .self 는 백드롭이 루트를 전부 덮어
             실제로는 발화하지 않던 것이라 백드롭 자체에 핸들러를 건다 -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" data-testid="modal-backdrop" @click="cancel" />

        <!--
          모달 카드 — 아프젝 Figma(2026-08-23 C4): 393 폭, r24, 흰 서피스, 헤더(선택 아이콘 + 제목)
          + 우상단 연파랑 원형 X, 본문, 검정 필 CTA(비활성 회색).
          max-height + overflow-y-auto (Codex 감사 지적): slot 콘텐츠가 긴 사용처(ExchangeModal /
          ItemSelectDialog / friends 페이지 등)에서 작은 화면 세로 방향에 카드가 뷰포트를 넘어도
          스크롤할 수 있어야 한다. items-start + my-auto 로 safe centering(짧을 땐 중앙, 길면
          상단부터 스크롤 가능) 적용.
        -->
        <div
          data-testid="modal-card"
          class="relative bg-apjek-surface text-apjek-text rounded-2xl p-6 w-full max-w-[393px] my-auto overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
          style="max-height: calc(100dvh - var(--sat) - var(--sab) - 32px)"
        >
          <!-- 우상단 닫기 X — 연파랑 원형. cancel 과 동일 경로 -->
          <button
            v-if="showClose"
            type="button"
            data-testid="modal-close"
            class="group absolute top-[10px] right-[10px] size-11 flex items-center justify-center"
            :aria-label="resolvedCancelText"
            @click="cancel"
          >
            <span class="size-8 rounded-full bg-apjek-blue-soft text-apjek-blue-deep flex items-center justify-center group-active:opacity-70">
              <Icon name="lucide:x" class="w-4 h-4" />
            </span>
          </button>

          <!-- 헤더: 선택 아이콘 슬롯 + 제목 (X 와 겹치지 않게 우측 여백) -->
          <div v-if="title || $slots.icon" class="flex items-center gap-2 pr-10 mb-2">
            <slot name="icon" />
            <h3 v-if="title" id="modal-title" class="text-lg font-bold leading-snug">{{ title }}</h3>
          </div>
          <p v-if="message" id="modal-message" class="text-sm text-apjek-text-sub mb-5">{{ message }}</p>
          <slot />

          <div class="flex gap-3 mt-5">
            <button
              v-if="showCancel"
              type="button"
              class="flex-1 py-3 rounded-full text-sm font-semibold bg-apjek-surface border border-apjek-border-strong text-apjek-text-sub active:bg-apjek-bg"
              @click="cancel"
            >
              {{ resolvedCancelText }}
            </button>
            <button
              autofocus
              type="button"
              class="apjek-cta flex-1 py-3 text-sm font-bold transition-opacity"
              :class="confirmClass"
              :disabled="confirmDisabled"
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
  /** 우상단 원형 X 표시 여부 (cancel 과 동일 경로) */
  showClose?: boolean
  /** confirm 비활성 — 회색 필 (Figma "이전 레벨을 먼저 해금해 주세요" 류) */
  confirmDisabled?: boolean
  /** danger 도 검정 CTA 유지(Figma) — 라벨로 구분한다. 호환을 위해 prop 은 남긴다. */
  variant?: 'primary' | 'danger'
}>(), {
  confirmText: undefined,
  cancelText: undefined,
  showCancel: true,
  showClose: true,
  confirmDisabled: false,
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
const { pushBackHandler } = useBackButtonStack()
let unregisterBackHandler: (() => void) | null = null

// 비활성은 apjek-cta:disabled 의 opacity 대신 회색 필로 명시(Figma 비활성 버튼 = 회색 채움).
const confirmClass = computed<string>(() =>
  props.confirmDisabled ? 'modal-cta-disabled' : '',
)

function confirm() {
  if (props.confirmDisabled) return
  emit('confirm')
  emit('update:modelValue', false)
}

function cancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

// 공용 포커스 소유권으로 중첩 Modal과 독립 다이얼로그를 같은 순서로 처리한다.
useDialogFocusTrap(modalRoot, toRef(props, 'modelValue'), cancel)
watch(() => props.modelValue, (open, previous) => {
  if (!import.meta.client) return
  if (open) unregisterBackHandler = pushBackHandler(cancel)
  else {
    if (previous) void dismissKeyboard()
    unregisterBackHandler?.()
    unregisterBackHandler = null
  }
}, { immediate: true })
onBeforeUnmount(() => {
  unregisterBackHandler?.()
  unregisterBackHandler = null
})
</script>

<style scoped>
.modal-enter-active { transition: all 0.2s ease-out; }
.modal-leave-active { transition: all 0.15s ease-in; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .relative { transform: scale(0.95); }

/* 비활성 CTA — apjek-cta 의 opacity 대신 회색 채움(Figma). scoped 라 specificity 가
   components 레이어의 .apjek-cta 보다 높아 배경/글자색을 덮는다. */
.modal-cta-disabled,
.modal-cta-disabled:disabled {
  background-color: var(--color-apjek-border-strong);
  color: var(--color-apjek-text-faint);
  opacity: 1;
}
</style>
