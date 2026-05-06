<!--
  자유배치 권리(freePlacement entitlement) 안내 + 결제 플로우 placeholder.
  Phase 4 IAP/Play Billing 통합 전까지는 안내 페이지로 작동.
-->
<template>
  <div class="min-h-screen px-4 py-6 max-w-md mx-auto space-y-4">
    <h1 class="text-xl font-bold text-riso-dark">자유배치 권리</h1>
    <p class="text-sm text-riso-dark/70">
      슬롯 제약 없이 임의 좌표에 아이템을 배치할 수 있는 유료 권리입니다.
    </p>
    <ul class="space-y-2 text-sm text-riso-dark/80">
      <li>• 5슬롯 그리드 → 임의 좌표 자유 배치</li>
      <li>• 회전 / 크기 조절 핸들 (planned)</li>
      <li>• 진화 단계 'CUSTOM' 잠금 해제</li>
    </ul>

    <div class="rounded-xl bg-riso-cream p-4 riso-shadow space-y-2">
      <p class="text-sm font-medium text-riso-dark">결제 옵션 (예정)</p>
      <button
        type="button"
        class="w-full px-4 py-2 bg-riso-sage text-white rounded-md text-sm disabled:opacity-60"
        :disabled="loading"
        @click="onPurchase"
      >
        {{ loading ? '처리 중...' : '구매하기 (₩1,900)' }}
      </button>
      <p class="text-xs text-riso-dark/50">
        ※ Phase 4 (Play Billing / iOS IAP) 통합 후 활성화. 현재는 결제 플로우 미구현.
      </p>
    </div>

    <NuxtLink to="/profile" class="block text-sm text-riso-dark/60 hover:underline">
      ← 프로필로 돌아가기
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { startPurchase, loading } = usePayment()
const toast = useToast()

async function onPurchase() {
  const ok = await startPurchase('free-placement')
  if (ok) toast.success('구매 완료 — 자유배치가 활성화되었습니다')
  else toast.info('결제 모듈은 Phase 4 에 통합됩니다')
}
</script>
