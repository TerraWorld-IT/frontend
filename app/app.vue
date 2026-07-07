<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// launchAutoHide: false (capacitor.config.ts) 이므로 앱이 직접 스플래시를 꺼야 한다.
// app.vue는 layout: false 페이지(예: auth/login)를 포함해 모든 페이지에서 공통으로
// 마운트되는 진짜 루트라 여기서 호출해야 첫 실행(미로그인) 시에도 스플래시가 사라진다.
// (layouts/default.vue 는 login 페이지가 layout:false 라 그 경로에서 마운트되지 않는다.)
const { hideSplash } = useNative()
onMounted(() => {
  void hideSplash()
})
</script>
