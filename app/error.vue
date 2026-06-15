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

// statusCode 가 명시된 경우만 분기. client 렌더 에러는 statusCode 가 없어 화면엔 500 으로
// 표시하되 "서버 에러"로 분류하지 않는다 — Retry(reload) 버튼을 숨겨 동일 렌더 에러 reload 루프를 피함.
const rawStatus = computed<number | undefined>(() => props.error?.statusCode)
const statusCode = computed<number>(() => rawStatus.value ?? 500)
const isNotFound = computed<boolean>(() => rawStatus.value === 404)
const isServerError = computed<boolean>(() => rawStatus.value !== undefined && rawStatus.value >= 500)

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
  // 명시적 5xx(일시적 서버/SSR 실패)에서만 노출되는 버튼. 현재 라우트를 hard-reload 해
  // 실패한 SSR/data fetch 를 재실행한다. client 전용(SSR 중 버튼 비활성).
  // 곧바로 reload 하므로 clearError() 는 no-op → 생략.
  if (import.meta.client) {
    window.location.reload()
  }
}
</script>
