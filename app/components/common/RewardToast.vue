<template>
  <Teleport to="body">
    <Transition name="reward-slide">
      <div
        v-if="visible"
        class="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5 pointer-events-none"
      >
        <!-- Coin reward -->
        <div
          v-if="coin"
          class="flex items-center gap-1.5 bg-riso-butter/95 text-riso-dark px-4 py-2 rounded-full riso-shadow-sm border border-riso-walnut/15 backdrop-blur-sm animate-bounce-in"
        >
          <span class="text-lg">🪙</span>
          <span class="font-bold text-sm">+{{ coin }}</span>
        </div>

        <!-- Token reward -->
        <div
          v-if="token"
          class="flex items-center gap-1.5 bg-white/95 text-riso-dark px-4 py-2 rounded-full riso-shadow-sm border border-riso-walnut/15 backdrop-blur-sm animate-bounce-in"
          style="animation-delay: 0.15s"
        >
          <span class="text-lg">{{ tokenEmoji }}</span>
          <span class="font-bold text-sm">+{{ token }}</span>
        </div>

        <!-- EXP reward -->
        <div
          v-if="exp"
          class="flex items-center gap-1.5 bg-riso-sage/90 text-white px-4 py-2 rounded-full riso-shadow-sm animate-bounce-in"
          style="animation-delay: 0.3s"
        >
          <span class="text-lg">⭐</span>
          <span class="font-bold text-sm">+{{ exp }} EXP</span>
        </div>

        <!-- EXP progress bar (optional) -->
        <div
          v-if="exp && expProgress !== undefined"
          class="w-40 h-2 bg-white/60 rounded-full overflow-hidden border border-riso-walnut/10 animate-bounce-in"
          style="animation-delay: 0.5s"
        >
          <div
            class="h-full bg-gradient-to-r from-riso-sage to-riso-green rounded-full transition-all duration-700 ease-out"
            :style="{ width: expProgress + '%' }"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  coin?: number
  token?: number
  tokenEmoji?: string
  exp?: number
  expProgress?: number
  duration?: number
}>()

const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

function show() {
  visible.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    visible.value = false
  }, props.duration ?? 2500)
}

defineExpose({ show })

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.reward-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.reward-slide-leave-active {
  transition: all 0.3s ease-in;
}
.reward-slide-enter-from {
  opacity: 0;
  transform: translate(-50%, -20px) scale(0.9);
}
.reward-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}

@keyframes bounce-in {
  0% { opacity: 0; transform: scale(0.5) translateY(10px); }
  60% { transform: scale(1.1) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-bounce-in {
  animation: bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
</style>
