<template>
  <div
    v-if="visual.showOverlay && visual.message"
    class="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center"
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
</script>
