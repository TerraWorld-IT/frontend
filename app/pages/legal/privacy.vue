<template>
  <main class="min-h-screen bg-riso-cream px-5 py-8">
    <div class="mx-auto max-w-xl space-y-4 text-riso-dark">
      <header class="space-y-1">
        <h1 class="text-lg font-bold">개인정보 처리방침</h1>
        <p class="text-xs text-riso-dark/50">
          현재 초안입니다. 정식 시행본은 출시 시 게시되며, 시행일·사업자 정보는 그때 명시됩니다.
        </p>
      </header>

      <section class="space-y-3 text-sm leading-relaxed">
        <div>
          <h2 class="font-semibold mb-1">1. 무엇을, 왜 수집하나요?</h2>
          <ul class="list-disc pl-5 space-y-1 text-riso-dark/80">
            <li>가입·로그인: 이메일, 비밀번호(단방향 암호화 저장), 닉네임, 생년월일(만 14세 미만 가입 차단 확인용)</li>
            <li>서비스 이용: 활동 기록, 가상 재화, 테라리움 꾸미기, 친구 관계</li>
            <li>선택: 사진, 푸시 알림 토큰, 광고 식별자, 이용 분석(GA4)</li>
            <li>결제: 영수증 정보(카드 정보는 Apple·Google 결제 시스템이 처리하며 회사는 보관하지 않음)</li>
          </ul>
        </div>
        <div>
          <h2 class="font-semibold mb-1">2. 필수와 선택을 구분합니다</h2>
          <p class="text-riso-dark/80">
            필수 항목(이메일·비밀번호·닉네임·생년월일·활동 기록)에 동의하지 않으면 가입·서비스 이용이 어렵습니다.
            선택 항목(사진·푸시·광고 식별자·분석·마케팅)은 동의하지 않아도 가입할 수 있으며, 해당 기능만 제한됩니다.
          </p>
        </div>
        <div>
          <h2 class="font-semibold mb-1">3. 얼마나 보관하나요?</h2>
          <p class="text-riso-dark/80">
            회원 탈퇴 시 계정·활동 정보는 즉시 삭제합니다. 다만 결제·청약철회 기록은 전자상거래법에 따라 일정 기간(결제 5년, 청약철회 3년) 보관 후 파기합니다.
            재해복구용 백업은 복구 목적 외로 쓰지 않고 최대 30일 내 자동 파기됩니다.
          </p>
        </div>
        <div>
          <h2 class="font-semibold mb-1">4. 만 14세 미만은 가입할 수 없습니다</h2>
          <p class="text-riso-dark/80">개인정보보호법에 따라 만 14세 미만의 가입을 받지 않습니다.</p>
        </div>
        <div>
          <h2 class="font-semibold mb-1">5. 위치정보는 수집하지 않습니다</h2>
          <p class="text-riso-dark/80">현재 위치정보를 수집하지 않습니다. 향후 도입 시 별도 동의를 받습니다.</p>
        </div>
        <div>
          <h2 class="font-semibold mb-1">6. 권리 행사·문의</h2>
          <p class="text-riso-dark/80">
            열람·정정·삭제·처리정지·동의 철회는 앱 내 설정 또는 privacy@terraworld.app 으로 요청할 수 있습니다.
            광고·분석 추적은 단말 OS 설정으로도 거부할 수 있습니다.
          </p>
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
