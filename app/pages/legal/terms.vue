<template>
  <main class="min-h-screen bg-riso-cream px-5 py-8">
    <div class="mx-auto max-w-xl space-y-4 text-riso-dark">
      <header class="space-y-1">
        <h1 class="text-lg font-bold">이용약관</h1>
        <p class="text-xs text-riso-dark/50">
          현재 초안입니다. 정식 시행본은 출시 시 게시되며, 시행일·사업자 정보는 그때 명시됩니다.
        </p>
      </header>

      <section class="space-y-3 text-sm leading-relaxed">
        <div>
          <h2 class="font-semibold mb-1">1. 서비스 이용</h2>
          <p class="text-riso-dark/80">
            TerraWorld는 일상 기록을 통해 가상의 테라리움을 꾸미는 기록형 서비스입니다. 회원은 약관과 개인정보 처리방침에 동의한 뒤 서비스를 이용할 수 있습니다.
          </p>
        </div>
        <div>
          <h2 class="font-semibold mb-1">2. 가입 자격</h2>
          <p class="text-riso-dark/80">만 14세 이상만 가입할 수 있습니다. 타인의 정보를 도용해 가입할 수 없습니다.</p>
        </div>
        <div>
          <h2 class="font-semibold mb-1">3. 인앱결제·환불</h2>
          <p class="text-riso-dark/80">
            유료 상품은 Apple App Store / Google Play 결제 시스템을 통해 제공됩니다. 환불·청약철회는 관련 법령과 각 스토어 정책에 따르며,
            미성년자가 법정대리인 동의 없이 결제한 경우 취소를 요청할 수 있습니다. 환불 문의는 support@terraworld.app.
          </p>
        </div>
        <div>
          <h2 class="font-semibold mb-1">4. 회원 의무</h2>
          <p class="text-riso-dark/80">
            서비스를 부정 이용(자동화·부정 보상 획득·타인 권리 침해)하지 않아야 합니다. 위반 시 이용이 제한될 수 있습니다.
          </p>
        </div>
        <div>
          <h2 class="font-semibold mb-1">5. 개인정보·마케팅 동의는 별도입니다</h2>
          <p class="text-riso-dark/80">
            이용약관 동의가 개인정보 수집·이용이나 마케팅 수신 동의를 자동으로 포함하지 않습니다. 각 항목은 가입 시 따로 동의받습니다.
          </p>
        </div>
        <div>
          <h2 class="font-semibold mb-1">6. 탈퇴</h2>
          <p class="text-riso-dark/80">언제든 탈퇴할 수 있으며, 탈퇴 시 계정·활동 정보는 즉시 삭제됩니다(법령상 보존 의무 정보 제외).</p>
        </div>
      </section>

      <footer class="pt-2">
        <button
          type="button"
          class="text-xs text-riso-sage underline"
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

function goBack() {
  if (import.meta.client && window.history.length > 1) window.history.back()
  else navigateTo('/auth/login')
}
</script>
