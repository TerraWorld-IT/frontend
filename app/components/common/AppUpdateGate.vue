<!--
  강제 업데이트 게이트. 원격 URL Capacitor 셸에서 웹 배포가 스토어 릴리스보다 앞서므로,
  네이티브 셸 버전이 NUXT_PUBLIC_MIN_APP_VERSION 미만이면 전면 오버레이로 업데이트를 유도한다.
  - 네이티브 앱에서만 동작(웹 방문자 무영향). minAppVersion 빈 값이면 게이트 비활성.
  - 마운트 + 앱 resume 시 재확인(스토어에서 업데이트 후 돌아오면 게이트 해제).
  - app.vue 루트에 마운트 — layout:false 페이지에서도 덮어야 함.
  로직은 useAppUpdate 컴포저블이 소유(버전 파싱/비교/스토어 열기).
-->
<template>
  <Transition name="update-gate">
    <div
      v-if="updateRequired"
      class="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-5 px-8 text-center bg-riso-cream"
      style="padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px)"
      role="alertdialog"
      aria-modal="true"
      aria-label="앱 업데이트 필요"
    >
      <div class="text-5xl">🌱</div>
      <div class="space-y-2">
        <h2 class="text-lg font-bold text-riso-dark">새 버전이 나왔어요</h2>
        <p class="text-sm text-riso-dark/70 leading-relaxed">
          원활한 이용을 위해 최신 버전으로 업데이트해 주세요.<br>
          업데이트 후 앱으로 돌아오면 계속 이용할 수 있어요.
        </p>
      </div>
      <button
        type="button"
        class="w-full max-w-xs h-12 rounded-2xl font-semibold text-white active:scale-95 transition-transform"
        style="background: linear-gradient(135deg, #7b9e6b, #5f8a54)"
        @click="openStore"
      >
        업데이트 하러 가기
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { updateRequired, check, openStore, isNative } = useAppUpdate()

// 전체 화면을 덮는 차단 게이트지만, 뒤 콘텐츠가 스크롤되지 않도록 잠근다(일관성 + 안전).
useOverlayScrollLock(updateRequired)

let removeResumeListener: (() => void) | null = null

onMounted(async () => {
  if (!import.meta.client || !isNative) return
  await check()
  // 스토어에서 업데이트 후 앱으로 복귀하면 재검사해 게이트를 해제한다.
  const { App } = await import('@capacitor/app')
  const handle = await App.addListener('resume', () => { void check() })
  removeResumeListener = () => { void handle.remove() }
})

onBeforeUnmount(() => {
  removeResumeListener?.()
  removeResumeListener = null
})
</script>

<style scoped>
.update-gate-enter-active,
.update-gate-leave-active { transition: opacity 0.2s ease; }
.update-gate-enter-from,
.update-gate-leave-to { opacity: 0; }
</style>
