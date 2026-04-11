<template>
  <div class="relative select-none" :style="{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }" @wheel.prevent="onWheel">
    <!-- Glass Jar Container -->
    <div class="relative aspect-square bg-gradient-to-b from-riso-cream via-white to-riso-cream/60 rounded-[2.5rem] border-2 border-riso-walnut/10 overflow-hidden riso-shadow">
      <!-- Jar outline -->
      <div class="absolute inset-3 rounded-[2rem] border-2 border-riso-walnut/8">
        <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-2/5 h-5 bg-riso-cream/80 rounded-t-xl border-2 border-b-0 border-riso-walnut/8" />
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-[45%] h-3 bg-riso-walnut/15 rounded-t-lg" />
      </div>

      <!-- Soil layer -->
      <div class="absolute bottom-3 left-3 right-3 h-1/5 bg-gradient-to-t from-riso-walnut/20 to-riso-walnut/5 rounded-b-[1.8rem]" />

      <!-- Back row: slots 0, 1 (BACKGROUND) -->
      <div class="absolute top-[26%] left-1/2 -translate-x-1/2 flex gap-3">
        <TerrariumSlot
          v-for="slotId in [0, 1]"
          :key="slotId"
          :slot-id="slotId"
          :item="getPlacedItem(slotId)"
          size="lg"
          :editable="editable"
          @click="$emit('slotClick', slotId)"
        />
      </div>

      <!-- Front row: slots 2, 3, 4 (FOREGROUND + FIGURE) -->
      <div class="absolute top-[52%] left-1/2 -translate-x-1/2 flex gap-3">
        <TerrariumSlot
          v-for="slotId in [2, 3, 4]"
          :key="slotId"
          :slot-id="slotId"
          :item="getPlacedItem(slotId)"
          :size="slotId === 3 ? 'figure' : 'md'"
          :editable="editable"
          @click="$emit('slotClick', slotId)"
        />
      </div>

      <!-- Glass reflection -->
      <div class="absolute top-6 left-6 w-8 h-20 bg-white/30 rounded-full rotate-12 blur-sm pointer-events-none" />
    </div>

    <!-- Heart button (right side) -->
    <button
      class="absolute -right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-riso-pink text-white rounded-full flex items-center justify-center text-xl riso-shadow-sm active:scale-90 transition-transform"
      @click="$emit('heartClick')"
    >
      <span>❤️</span>
    </button>

    <!-- Heart reward animations -->
    <TransitionGroup name="reward-float">
      <div
        v-for="anim in heartAnimations"
        :key="anim.id"
        class="absolute -right-6 top-[45%] text-sm font-bold text-riso-pink pointer-events-none"
      >
        +0.1 ⭐
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import type { PlacedItemDetail } from '@terraworld-it/openapi-frontend'

const props = defineProps<{
  placedItems: PlacedItemDetail[]
  editable: boolean
}>()

defineEmits<{
  slotClick: [slotId: number]
  heartClick: []
}>()

// Zoom
const zoom = ref(1)
function onWheel(e: WheelEvent) {
  zoom.value = Math.min(2, Math.max(0.5, zoom.value + (e.deltaY > 0 ? -0.1 : 0.1)))
}

// Get placed item by slot
function getPlacedItem(slotId: number): PlacedItemDetail | undefined {
  return props.placedItems.find(p => p.slotId === slotId)
}

// Heart click animation
const heartAnimations = ref<Array<{ id: number }>>([])
function addHeartAnimation() {
  const id = Date.now()
  heartAnimations.value.push({ id })
  setTimeout(() => {
    heartAnimations.value = heartAnimations.value.filter(a => a.id !== id)
  }, 600)
}

defineExpose({ addHeartAnimation })
</script>

<style scoped>
.reward-float-enter-active {
  transition: all 0.6s ease-out;
}
.reward-float-enter-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.reward-float-leave-to {
  opacity: 0;
  transform: translateY(-50px) scale(1.2);
}
</style>
