<template>
  <div class="py-6 space-y-5">
    <!-- Mode Toggle -->
    <div class="flex justify-between items-center">
      <h2 class="font-bold text-riso-dark">My Terrarium</h2>
      <div class="flex gap-1.5 bg-white/70 rounded-full p-0.5 border border-riso-walnut/10">
        <button
          v-for="m in jarModes"
          :key="m.key"
          :class="[
            'px-3 py-1 rounded-full text-xs font-medium transition-all',
            jarMode === m.key ? 'bg-riso-navy text-white riso-shadow-sm' : 'text-riso-dark/40',
          ]"
          @click="jarMode = m.key"
        >
          {{ m.label }}
        </button>
      </div>
    </div>

    <!-- Glass Jar Canvas -->
    <div class="relative aspect-square bg-gradient-to-b from-riso-cream via-white to-riso-cream/60 rounded-[2.5rem] border-2 border-riso-walnut/10 overflow-hidden riso-shadow">
      <!-- Jar outline -->
      <div class="absolute inset-3 rounded-[2rem] border-2 border-riso-walnut/8">
        <!-- Jar neck -->
        <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-2/5 h-5 bg-riso-cream/80 rounded-t-xl border-2 border-b-0 border-riso-walnut/8" />
        <!-- Jar lid -->
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-[45%] h-3 bg-riso-walnut/15 rounded-t-lg" />
      </div>

      <!-- Soil layer -->
      <div class="absolute bottom-3 left-3 right-3 h-1/5 bg-gradient-to-t from-riso-walnut/20 to-riso-walnut/5 rounded-b-[1.8rem]" />

      <!-- Placed items inside jar -->
      <div
        v-for="(item, idx) in placedItems"
        :key="idx"
        class="absolute transition-all duration-300"
        :style="{ left: item.x + '%', top: item.y + '%', transform: `rotate(${item.rotation}deg)` }"
      >
        <div class="w-10 h-10 flex items-center justify-center text-2xl drop-shadow-sm animate-pulse-slow">
          {{ item.icon }}
        </div>
      </div>

      <!-- Glass reflection -->
      <div class="absolute top-6 left-6 w-8 h-20 bg-white/30 rounded-full rotate-12 blur-sm" />

      <!-- Edit mode overlay -->
      <div
        v-if="jarMode === 'edit'"
        class="absolute inset-0 bg-riso-navy/5 flex items-center justify-center"
      >
        <p class="text-xs text-riso-dark/30 bg-white/80 px-4 py-1.5 rounded-full border border-riso-walnut/10">
          Tap to place items
        </p>
      </div>
    </div>

    <!-- Edit mode: Horizontal item palette -->
    <div v-if="jarMode === 'edit'" class="space-y-3">
      <p class="text-xs text-riso-dark/30 font-medium">Inventory</p>
      <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <div
          v-for="item in sampleItems"
          :key="item.name"
          class="text-center shrink-0"
        >
          <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-2xl border-2 border-transparent hover:border-riso-green/50 active:scale-95 transition-all riso-shadow-sm">
            {{ item.icon }}
          </div>
          <p class="text-[10px] mt-1.5 text-riso-dark/60 font-medium">{{ item.name }}</p>
          <p class="text-[10px] text-riso-dark/25">x{{ item.qty }}</p>
        </div>
      </div>

      <!-- Background selector -->
      <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <div
          v-for="bg in backgrounds"
          :key="bg.name"
          :class="[
            'shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all',
            bg.active
              ? 'bg-riso-green/10 border-2 border-riso-green/40 text-riso-dark'
              : bg.locked
                ? 'bg-gray-50 border border-gray-200 text-riso-dark/30'
                : 'bg-white border border-riso-walnut/10 text-riso-dark/60'
          ]"
        >
          <span class="text-lg">{{ bg.icon }}</span>
          <span>{{ bg.name }}</span>
          <span v-if="bg.locked" class="text-[10px] bg-riso-walnut/10 px-1.5 py-0.5 rounded-full">Lv.{{ bg.level }}</span>
        </div>
      </div>
    </div>

    <!-- View mode: Stats & Share -->
    <div v-else class="flex gap-3">
      <div class="flex-1 bg-white rounded-2xl p-3 border border-riso-walnut/10 text-center riso-shadow-sm">
        <p class="text-xs text-riso-dark/30">Items</p>
        <p class="font-bold text-lg text-riso-dark">{{ placedItems.length }}</p>
      </div>
      <div class="flex-1 bg-white rounded-2xl p-3 border border-riso-walnut/10 text-center riso-shadow-sm">
        <p class="text-xs text-riso-dark/30">Background</p>
        <p class="font-bold text-sm text-riso-dark">{{ activeBackground.name }}</p>
      </div>
      <button class="flex-1 bg-riso-pink text-white rounded-2xl p-3 font-bold text-sm riso-shadow-sm active:scale-95 transition-transform">
        Share
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// === Jar state ===
const jarMode = ref<'view' | 'edit'>('view')
const jarModes = [
  { key: 'view' as const, label: 'View' },
  { key: 'edit' as const, label: 'Edit' },
]

// === Mock data (will be replaced by API data) ===
const sampleItems = [
  { name: '작은 풀', icon: '🌿', qty: 2 },
  { name: '버섯', icon: '🍄', qty: 1 },
  { name: '돌멩이', icon: '🪨', qty: 3 },
  { name: '해바라기', icon: '🌻', qty: 1 },
  { name: '튤립', icon: '🌷', qty: 2 },
]

const backgrounds = [
  { name: '기본 유리병', icon: '🫧', active: true, locked: false, level: 0 },
  { name: '둥근 어항', icon: '🐠', active: false, locked: true, level: 5 },
  { name: '큰 화분', icon: '🪴', active: false, locked: true, level: 10 },
]

const placedItems = [
  { icon: '🌿', x: 28, y: 38, rotation: -5 },
  { icon: '🍄', x: 55, y: 52, rotation: 3 },
  { icon: '🪨', x: 40, y: 68, rotation: 0 },
  { icon: '🌱', x: 65, y: 72, rotation: -2 },
]

const activeBackground = computed(() => backgrounds.find(b => b.active) ?? backgrounds[0])
</script>
