<template>
  <Teleport to="body">
    <div class="fixed top-16 left-1/2 -translate-x-1/2 z-[9998] flex flex-col gap-2 w-full max-w-sm px-4">
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
