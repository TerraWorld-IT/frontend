<template>
  <div
    class="flex items-center justify-center"
    :class="containerClass"
    role="status"
    aria-live="polite"
    aria-busy="true"
    :aria-label="resolvedAriaLabel"
  >
    <!--
      UltraPlan code-review UX-005 — WCAG 2.1 SC 4.1.3 (Status Messages) + 1.3.1 (Info and Relationships).
      role="status" + aria-live="polite" + aria-busy="true" 로 screen reader 가 "로딩 중" 인지.
      aria-label 로 시각 외 사용자에게 한국어 안내.
      주의: 이 주석/문서는 반드시 root div 안에 둘 것 — 템플릿 최상단 주석은
      multi-root 로 인식돼 wrapper.attributes() 가 깨진다 (Loading.test.ts a11y).
    -->
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

    <!-- screen reader 전용 텍스트 (시각 사용자 hidden) -->
    <span class="sr-only">{{ $t('common.loading') }}</span>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const props = withDefaults(defineProps<{
  variant?: 'spinner' | 'skeleton' | 'dots'
  containerClass?: string
  ariaLabel?: string
}>(), {
  variant: 'spinner',
  containerClass: 'py-8',
  ariaLabel: undefined,
})

const resolvedAriaLabel = computed<string>(() => props.ariaLabel ?? t('common.loading'))
</script>
