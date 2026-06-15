<template>
  <div class="min-h-screen bg-riso-cream flex items-center justify-center px-4 riso-grain">
    <div class="text-center max-w-sm">
      <div class="text-6xl mb-4">{{ emoji }}</div>
      <h1 class="text-2xl font-bold text-riso-dark mb-2">
        {{ title }}
      </h1>
      <p class="text-sm text-riso-dark/60 mb-6">
        {{ description }}
      </p>
      <div class="flex flex-col gap-2 items-center">
        <button
          v-if="isServerError"
          class="px-6 py-3 bg-riso-poppy text-white font-semibold rounded-xl riso-shadow-sm hover:brightness-110 transition"
          @click="handleRetry"
        >
          {{ $t('error.retry') }}
        </button>
        <button
          class="px-6 py-3 font-semibold rounded-xl riso-shadow-sm hover:brightness-110 transition"
          :class="isServerError ? 'bg-white text-riso-dark border border-riso-walnut/15' : 'bg-riso-sage text-white'"
          @click="handleGoHome"
        >
          {{ $t('error.goHome') }}
        </button>
        <p class="text-xs text-riso-dark/30 mt-2">
          {{ statusCode }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()

const statusCode = computed<number>(() => props.error?.statusCode ?? 500)
const isNotFound = computed<boolean>(() => statusCode.value === 404)
const isServerError = computed<boolean>(() => statusCode.value >= 500)

const emoji = computed<string>(() => {
  if (isNotFound.value) return '🔍'
  if (isServerError.value) return '🌧️'
  return '🫧'
})

const title = computed<string>(() => {
  if (isNotFound.value) return t('error.notFoundTitle')
  if (isServerError.value) return t('error.serverErrorTitle')
  return t('error.unexpectedTitle')
})

const description = computed<string>(() => {
  if (isNotFound.value) return t('error.notFoundDesc')
  if (isServerError.value) return t('error.serverErrorDesc')
  return props.error?.message || t('error.retryLater')
})

function handleGoHome() {
  clearError({ redirect: '/' })
}

function handleRetry() {
  // Clear the error overlay, then hard-reload the current route so the failed
  // SSR/data fetch runs again. Reload is client-only (the button is never
  // interactive during SSR); clearError keeps the SPA state consistent first.
  clearError()
  if (import.meta.client) {
    window.location.reload()
  }
}
</script>
