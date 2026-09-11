<!--
  모든 사용자에게 무료 기본 지급되는 자유배치 기능 안내.
-->
<template>
  <!-- 페이지별 픽셀 상수(114px) 대신 형제 페이지와 같이 min-h-full 로 스크롤러 높이를 따른다. -->
  <div class="min-h-full px-4 py-6 max-w-md mx-auto space-y-4">
    <h1 class="text-xl font-bold text-riso-dark">{{ $t('upgrade.freePlacementTitle') }}</h1>
    <p class="text-sm text-riso-dark/70">
      {{ $t('upgrade.freePlacementDesc') }}
    </p>
    <ul class="space-y-2 text-sm text-riso-dark/80">
      <li>• {{ $t('upgrade.feature1') }}</li>
      <li>• {{ $t('upgrade.feature2') }}</li>
      <li>• {{ $t('upgrade.feature3') }}</li>
    </ul>

    <div class="rounded-xl bg-riso-cream p-4 riso-shadow space-y-2">
      <p class="text-sm font-medium text-riso-dark">
        {{ $t('upgrade.freePlacementAlreadyAvailable') }}
      </p>
    </div>

    <NuxtLink to="/profile" class="block py-3 -my-3 text-sm text-riso-dark/60 hover:underline">
      {{ $t('upgrade.backToProfile') }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>
