<template>
  <Teleport to="body">
    <!--
      WCAG 2.1 SC 4.1.3 (Status Messages) — screen reader 사용자에게 toast 공지.
      role="status" + aria-live="polite" + aria-atomic — 일반 알림은 polite (현재 작업 방해 X).
      error type 의 우선순위는 cite 의 직접 트리거가 알려주므로 별도 role="alert" 분기 안 함.
    -->
    <div
      class="fixed left-1/2 -translate-x-1/2 z-[9998] flex flex-col gap-2 w-full max-w-sm px-4"
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
            'px-4 py-3 rounded-xl text-sm font-medium riso-shadow-sm backdrop-blur-sm',
            toast.type === 'success' && 'bg-riso-sage/90 text-white',
            toast.type === 'error' && 'bg-riso-poppy/90 text-white',
            toast.type === 'info' && 'bg-white/90 text-riso-dark border border-riso-walnut/10',
          ]"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { toasts } = useToast()
</script>

<style scoped>
.toast-enter-active { transition: all 0.3s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateY(-12px); }
.toast-leave-to { opacity: 0; transform: translateY(-8px) scale(0.95); }
</style>
