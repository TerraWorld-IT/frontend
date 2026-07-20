<template>
  <Teleport to="body">
    <!--
      WCAG 2.1 SC 4.1.3 (Status Messages) — screen reader 사용자에게 toast 공지.
      role="status" + aria-live="polite" + aria-atomic — 일반 알림은 polite (현재 작업 방해 X).
      error type 의 우선순위는 cite 의 직접 트리거가 알려주므로 별도 role="alert" 분기 안 함.
      z-[9999]: 바텀시트/다이얼로그 밴드(9997~9998)보다 위, AppUpdateGate(10000)보다 아래 —
      시트 내부 버튼이 띄운 토스트가 시트 백드롭에 가려지던 문제(2026-07-20 audit C1-3).
    -->
    <div
      class="fixed left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-sm px-4"
      style="top: calc(64px + env(safe-area-inset-top, 0px))"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'px-4 py-3 rounded-xl text-sm font-medium riso-shadow-sm backdrop-blur-sm select-none',
            toast.type === 'success' && 'bg-riso-sage/90 text-white',
            toast.type === 'error' && 'bg-riso-poppy/90 text-white',
            toast.type === 'info' && 'bg-white/90 text-riso-dark border border-riso-walnut/10',
          ]"
          :style="dragStyle(toast.id)"
          @pointerdown="onPointerDown(toast.id, $event)"
          @pointermove="onPointerMove(toast.id, $event)"
          @pointerup="onPointerUp(toast.id, $event)"
          @pointercancel="onPointerCancel(toast.id)"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { toasts, dismiss } = useToast()

// 스와이프 닫기 (2026-07-20 사용자 결정): 토스트를 좌/우로 밀어 즉시 닫는다.
// pointer 이벤트라 터치·마우스 공통. 세로 스크롤 제스처와 충돌하지 않도록 touch-action: pan-y.
const DISMISS_THRESHOLD_PX = 64
const drag = ref<{ id: number, startX: number, dx: number } | null>(null)

function dragStyle(id: number): Record<string, string> {
  const base: Record<string, string> = { touchAction: 'pan-y' }
  if (drag.value?.id !== id) return base
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
