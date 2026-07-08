<template>
  <CommonOfflineBanner />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// launchAutoHide: false (capacitor.config.ts) 이므로 앱이 직접 스플래시를 꺼야 한다.
// app.vue는 layout: false 페이지(예: auth/login)를 포함해 모든 페이지에서 공통으로
// 마운트되는 진짜 루트라 여기서 호출해야 첫 실행(미로그인) 시에도 스플래시가 사라진다.
// (layouts/default.vue 는 login 페이지가 layout:false 라 그 경로에서 마운트되지 않는다.)
const { hideSplash, isNative } = useNative()
onMounted(() => {
  void hideSplash()

  // 네이티브 앱에서만 "완전한 앱처럼" 동작하도록 스코프 — 이 프론트엔드는
  // 네이티브 앱 전용이 아니라 일반 PC/모바일 웹 방문자도 있는 실제 서비스라
  // (AdSense 웹 배너 존재) 핀치줌 금지/텍스트 선택 금지를 전역 적용하면 웹
  // 방문자의 접근성(WCAG 1.4.4 Resize Text)을 해친다. isNative 체크로 격리.
  if (isNative) {
    document.documentElement.classList.add('is-native-app')

    const viewport = document.querySelector('meta[name="viewport"]')
    if (viewport) {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no',
      )
    }
  }
})
</script>
