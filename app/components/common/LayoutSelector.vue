<template>
  <div class="sticky top-14 z-30 bg-riso-cream/90 backdrop-blur-sm py-3 -mx-4 px-4 border-b border-riso-walnut/10">
    <div class="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
      <button
        v-for="(l, i) in layouts"
        :key="l.id"
        :class="[
          'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
          current === i
            ? 'bg-riso-navy text-white riso-shadow-sm'
            : 'bg-white/70 text-riso-dark/50 border border-riso-walnut/15'
        ]"
        @click="current = i"
      >
        {{ l.emoji }} {{ l.name }}
      </button>
    </div>
    <p class="text-[10px] text-riso-dark/30 mt-1.5 text-center">
      {{ currentLayout.desc }}
    </p>
  </div>
</template>

<script setup lang="ts">
const { layouts, current, currentLayout } = useLayoutVariant()
</script>
