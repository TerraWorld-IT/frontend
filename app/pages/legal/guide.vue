<template>
  <main class="min-h-dvh bg-riso-cream px-5" style="padding-left: calc(1.25rem + var(--sal)); padding-right: calc(1.25rem + var(--sar)); padding-top: calc(32px + var(--sat)); padding-bottom: calc(32px + var(--sab))">
    <div class="mx-auto max-w-xl space-y-4 text-riso-dark">
      <header class="space-y-1">
        <h1 class="text-lg font-bold">이용 안내</h1>
        <p class="text-xs text-riso-dark/50">기록으로 시작해 나만의 테라리움을 완성하는 방법을 안내해요.</p>
      </header>

      <section class="space-y-3 text-sm leading-relaxed">
        <div>
          <h2 class="font-semibold mb-1">1. 기록</h2>
          <p class="text-riso-dark/80">기록 탭에서 습관을 체크하거나 투두·일기·집중·거리 같은 오늘의 일상을 기록해요.</p>
        </div>
        <div>
          <h2 class="font-semibold mb-1">2. 보상</h2>
          <p class="text-riso-dark/80">기록 종류와 달성 결과에 따라 코인·활동 토큰·반짝이를 받아요.</p>
        </div>
        <div>
          <h2 class="font-semibold mb-1">3. 수집</h2>
          <p class="text-riso-dark/80">모은 재화로 상점에서 식물과 배경 같은 아이템을 구매해요.</p>
        </div>
        <div>
          <h2 class="font-semibold mb-1">4. 꾸미기</h2>
          <p class="text-riso-dark/80">홈의 관리 모드에서 보유 아이템과 정령을 배치하고 배경을 골라 나의 테라리움을 꾸며요.</p>
        </div>
        <div>
          <h2 class="font-semibold mb-1">5. 공유</h2>
          <p class="text-riso-dark/80">완성한 테라리움은 홈의 공유하기에서 이미지나 링크로 친구에게 보여줄 수 있어요.</p>
        </div>
      </section>

      <nav class="space-y-3 text-sm leading-relaxed" aria-label="법적 고지">
        <NuxtLink to="/legal/privacy" class="block text-riso-sage dark:text-riso-grass underline">개인정보 처리방침</NuxtLink>
        <NuxtLink to="/legal/terms" class="block text-riso-sage dark:text-riso-grass underline">이용약관</NuxtLink>
      </nav>

      <footer class="pt-2">
        <button
          type="button"
          class="relative after:absolute after:inset-x-0 after:top-1/2 after:-translate-y-1/2 after:min-h-11 after:h-full after:content-[''] after:min-w-11 text-xs text-riso-sage dark:text-riso-grass underline"
          @click="goBack"
        >
          닫기
        </button>
      </footer>
    </div>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

// 페이지 배경이 서피스가 아니므로 상·하단 스크림도 같은 색을 따르게 한다(노치 색 띠 제거).
useHead({ htmlAttrs: { style: '--apjek-scrim: var(--color-riso-cream)' } })

function goBack() {
  if (import.meta.client && window.history.length > 1) window.history.back()
  else navigateTo('/profile')
}
</script>
