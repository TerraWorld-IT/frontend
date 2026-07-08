<!--
  네트워크 오프라인 안내 배너. plugins/openapi.ts 의 인터셉터는 의도적으로 generic 에러
  토스트를 띄우지 않는다(코드리뷰 2026-06-15 — call-site 별 구체적 토스트와 중복 방지).
  이 배너는 그 규칙과 무관한 별도 신호(브라우저 connectivity 상태)라 인터셉터를 건드리지 않고
  전역 표시만 담당한다. app.vue 루트에 마운트 — layout:false 페이지(로그인 등)에서도 보여야 함.
-->
<template>
  <Transition name="offline-banner">
    <div
      v-if="isOffline"
      class="fixed left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-riso-dark text-white text-xs font-medium py-2 px-4"
      style="top: env(safe-area-inset-top, 0px)"
      role="status"
      aria-live="polite"
    >
      <Icon name="lucide:wifi-off" class="w-3.5 h-3.5" />
      {{ $t('common.offline') }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
const isOffline = ref<boolean>(false)

function onOnline() { isOffline.value = false }
function onOffline() { isOffline.value = true }

onMounted(() => {
  if (!import.meta.client) return
  isOffline.value = !navigator.onLine
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})
onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>

<style scoped>
.offline-banner-enter-active,
.offline-banner-leave-active { transition: transform 0.25s ease, opacity 0.25s ease; }
.offline-banner-enter-from,
.offline-banner-leave-to { transform: translateY(-100%); opacity: 0; }
</style>
