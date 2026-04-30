<template>
  <div
    v-if="visual.showOverlay && visual.message"
    class="absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 pointer-events-none"
    :class="visual.extraClass"
    aria-live="polite"
    :aria-label="`시들기 단계 ${visual.stage}: ${visual.message}`"
  >
    <div
      class="px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-sm riso-shadow-sm text-xs font-medium text-riso-dark"
    >
      <span class="mr-1">
        {{ stageIcon }}
      </span>
      {{ visual.message }}
    </div>

    <!-- stage 2 부터 CTA 노출. stage 1 은 단순 안내(말풍선)만. -->
    <button
      v-if="visual.stage >= 2"
      type="button"
      class="pointer-events-auto px-3 py-1.5 rounded-full bg-riso-pink text-white text-[11px] font-semibold riso-shadow-sm active:scale-95 transition-transform"
      @click="goRecord"
    >
      지금 기록하러 가기 →
    </button>
  </div>
</template>

<script setup lang="ts">
import type { WiltingState } from '~/composables/useWilting'

const props = defineProps<{
  state: WiltingState | null | undefined
}>()

const stateRef = computed(() => props.state)
const { visual } = useWilting(stateRef)

const stageIcon = computed(() => {
  switch (visual.value.stage) {
    case 1: return '💧'
    case 2: return '🥀'
    case 3: return '⚠️'
    default: return ''
  }
})

function goRecord() {
  navigateTo('/record')
}
</script>
