<template>
  <div class="min-h-screen bg-riso-cream flex items-center justify-center px-4 riso-grain">
    <div class="text-center max-w-sm">
      <div class="text-6xl mb-4">{{ isNotFound ? '🔍' : '🫧' }}</div>
      <h1 class="text-2xl font-bold text-riso-dark mb-2">
        {{ isNotFound ? $t('error.notFoundTitle') : $t('error.unexpectedTitle') }}
      </h1>
      <p class="text-sm text-riso-dark/60 mb-6">
        {{ isNotFound ? $t('error.notFoundDesc') : error?.message || $t('error.retryLater') }}
      </p>
      <div class="flex flex-col gap-2 items-center">
        <button
          class="px-6 py-3 bg-riso-sage text-white font-semibold rounded-xl riso-shadow-sm hover:brightness-110 transition"
          @click="handleError"
        >
          {{ $t('error.goHome') }}
        </button>
        <p class="text-xs text-riso-dark/30 mt-2">
          {{ error?.statusCode || 500 }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const isNotFound = computed(() => props.error?.statusCode === 404)

function handleError() {
  clearError({ redirect: '/' })
}
</script>
