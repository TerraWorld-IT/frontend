<template>
  <div
    :class="[
      'flex items-center justify-center rounded-xl border-2 transition-all cursor-pointer',
      sizeClasses,
      item
        ? 'bg-white/40 border-riso-walnut/10 hover:border-riso-green/40'
        : editable
          ? 'bg-white/20 border-dashed border-riso-walnut/15 hover:border-riso-green/40 hover:bg-white/30'
          : 'bg-white/10 border-transparent',
    ]"
    @click="$emit('click')"
  >
    <!-- Placed item -->
    <template v-if="item">
      <div :class="['transition-transform', item.isAnimated ? 'animate-sway' : '']">
        <span :class="itemTextSize">{{ item.itemImage }}</span>
      </div>
    </template>

    <!-- Empty slot -->
    <template v-else-if="editable">
      <div class="flex flex-col items-center gap-0.5">
        <span class="text-riso-dark/20 text-lg">+</span>
        <span class="text-[8px] text-riso-dark/20">{{ slotLabel }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PlacedItemDetail } from '@terraworld-it/openapi-frontend'

const props = defineProps<{
  slotId: number
  item?: PlacedItemDetail
  size: 'lg' | 'md' | 'figure'
  editable: boolean
}>()

defineEmits<{ click: [] }>()

const SLOT_LABELS: Record<number, string> = {
  0: '후경',
  1: '후경',
  2: '전경',
  3: '피규어',
  4: '전경',
}

const slotLabel = computed(() => SLOT_LABELS[props.slotId] ?? '')

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'lg': return 'w-20 h-28'
    case 'figure': return 'w-16 h-20'
    default: return 'w-16 h-16'
  }
})

const itemTextSize = computed(() => {
  switch (props.size) {
    case 'lg': return 'text-4xl'
    case 'figure': return 'text-3xl'
    default: return 'text-3xl'
  }
})
</script>
