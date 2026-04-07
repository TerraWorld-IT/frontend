<template>
  <div class="flex items-center justify-center" :class="containerClass">
    <!-- Spinner -->
    <div v-if="variant === 'spinner'" class="relative">
      <div class="w-8 h-8 rounded-full border-2 border-riso-sage/20 border-t-riso-sage animate-spin" />
    </div>

    <!-- Skeleton -->
    <div v-else-if="variant === 'skeleton'" class="w-full space-y-3">
      <div class="h-4 bg-riso-walnut/8 rounded-lg animate-pulse" :style="{ width: '75%' }" />
      <div class="h-4 bg-riso-walnut/8 rounded-lg animate-pulse" :style="{ width: '50%' }" />
      <div class="h-4 bg-riso-walnut/8 rounded-lg animate-pulse" :style="{ width: '60%' }" />
    </div>

    <!-- Dots -->
    <div v-else class="flex gap-1.5">
      <div v-for="i in 3" :key="i" class="w-2 h-2 rounded-full bg-riso-sage animate-float" :style="{ animationDelay: `${i * 0.2}s` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'spinner' | 'skeleton' | 'dots'
  containerClass?: string
}>(), {
  variant: 'spinner',
  containerClass: 'py-8',
})
</script>
