<template>
  <Teleport to="body">
    <!--
      WCAG 2.1 SC 4.1.3 (Status Messages) — screen reader 사용자에게 toast 공지.
      role="status" + aria-live="polite" + aria-atomic — 일반 알림은 polite (현재 작업 방해 X).
      error type 의 우선순위는 cite 의 직접 트리거가 알려주므로 별도 role="alert" 분기 안 함.
      z-[9999]: 바텀시트/다이얼로그 밴드(9997~9998)보다 위, AppUpdateGate(10000)보다 아래 —
      시트 내부 버튼이 띄운 토스트가 시트 백드롭에 가려지던 문제(2026-07-20 audit C1-3).

      아프젝 Figma 2종 (2026-08-23 C4):
      - card: 393×88 흰 카드 + 1px 외곽선 r8, 좌 아이콘 + 굵은 제목 + 회색 부제
      - pill: 351×51 흰 필 + 핑크 외곽선(#FFA0D6) 텍스트 1줄
      수평 중앙은 `inset-x-0 mx-auto` — Tailwind v4 의 -translate-x-1/2 는 개별 translate 라
      스와이프 transform 과 합성돼 이중 적용되므로 쓰지 않는다(frontend/CLAUDE.md 함정).
    -->
    <div
      class="fixed inset-x-0 mx-auto z-[9999] flex flex-col items-center gap-2 w-full max-w-[393px] px-4"
      style="top: calc(16px + env(safe-area-inset-top, 0px))"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :data-variant="toast.variant"
          :data-type="toast.type"
          :class="[
            'select-none bg-apjek-surface text-apjek-text',
            toast.variant === 'card'
              ? 'apjek-toast-card w-full min-h-[88px] rounded-[8px] border px-4 py-3 flex items-center gap-3'
              : 'apjek-toast-pill w-full max-w-[351px] min-h-[51px] rounded-full border px-5 py-3 flex items-center justify-center gap-2',
          ]"
          :style="toastStyle(toast)"
          @pointerdown="onPointerDown(toast.id, $event)"
          @pointermove="onPointerMove(toast.id, $event)"
          @pointerup="onPointerUp(toast.id, $event)"
          @pointercancel="onPointerCancel(toast.id)"
        >
          <!-- 좌측 아이콘 (이모지 또는 lucide) — 카드형만 큰 원형 배경, 필형은 인라인 -->
          <span
            v-if="toast.icon"
            :class="toast.variant === 'card'
              ? 'shrink-0 w-12 h-12 rounded-full bg-apjek-bg flex items-center justify-center text-2xl'
              : 'shrink-0 text-base leading-none'"
            aria-hidden="true"
          >
            <Icon v-if="isIconName(toast.icon)" :name="toast.icon" class="w-6 h-6" />
            <template v-else>{{ toast.icon }}</template>
          </span>

          <div class="min-w-0 flex-1" :class="toast.variant === 'pill' && 'text-center'">
            <p
              :class="toast.variant === 'card'
                ? 'text-[15px] font-bold leading-snug truncate'
                : 'text-sm font-semibold leading-snug truncate'"
            >
              {{ toast.message }}
            </p>
            <p
              v-if="toast.variant === 'card' && toast.description"
              class="text-xs text-apjek-text-sub mt-0.5 line-clamp-2"
            >
              {{ toast.description }}
            </p>
          </div>

          <!-- 선택 액션 (예: "보기") — 탭 시 토스트 닫힘. 스와이프 제스처와 구분하려 pointerdown 전파 차단 -->
          <button
            v-if="toast.actionLabel"
            type="button"
            class="shrink-0 text-sm font-semibold text-apjek-blue-deep px-2 py-1 rounded-full"
            @pointerdown.stop
            @click.stop="onAction(toast)"
          >
            {{ toast.actionLabel }}
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Toast } from '~/composables/useToast'

const { toasts, dismiss } = useToast()

/** 핑크 외곽선(Figma #FFA0D6). error 타입만 붉은 계열로 구분한다. */
const PILL_BORDER_PINK = '#FFA0D6'
const BORDER_ERROR = '#FF8A80'

function isIconName(icon: string): boolean {
  return icon.includes(':')
}

function onAction(toast: Toast) {
  toast.onAction?.()
  dismiss(toast.id)
}

// 스와이프 닫기 (2026-07-20 사용자 결정): 토스트를 좌/우로 밀어 즉시 닫는다.
// pointer 이벤트라 터치·마우스 공통. 세로 스크롤 제스처와 충돌하지 않도록 touch-action: pan-y.
const DISMISS_THRESHOLD_PX = 64
const drag = ref<{ id: number, startX: number, dx: number } | null>(null)

function toastStyle(toast: Toast): Record<string, string> {
  const borderColor = toast.type === 'error'
    ? BORDER_ERROR
    : toast.variant === 'pill' ? PILL_BORDER_PINK : 'var(--color-apjek-text)'
  const base: Record<string, string> = { touchAction: 'pan-y', borderColor }
  if (drag.value?.id !== toast.id) return base
  const dx = drag.value.dx
  return {
    ...base,
    transform: `translateX(${dx}px)`,
    opacity: String(Math.max(0.3, 1 - Math.abs(dx) / 160)),
    transition: 'none',
  }
}

function onPointerDown(id: number, e: PointerEvent) {
  drag.value = { id, startX: e.clientX, dx: 0 }
  ;(e.currentTarget as HTMLElement | null)?.setPointerCapture?.(e.pointerId)
}

function onPointerMove(id: number, e: PointerEvent) {
  if (drag.value?.id !== id) return
  drag.value = { ...drag.value, dx: e.clientX - drag.value.startX }
}

function onPointerUp(id: number, e: PointerEvent) {
  if (drag.value?.id !== id) return
  const dx = e.clientX - drag.value.startX
  drag.value = null
  if (Math.abs(dx) >= DISMISS_THRESHOLD_PX) dismiss(id)
}

function onPointerCancel(id: number) {
  if (drag.value?.id === id) drag.value = null
}
</script>

<style scoped>
.toast-enter-active { transition: all 0.3s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateY(-12px); }
.toast-leave-to { opacity: 0; transform: translateY(-8px) scale(0.95); }
</style>
