<!--
  자유배치 권리(freePlacement entitlement) 안내 + 결제 플로우 placeholder.
  Phase 4 IAP/Play Billing 통합 전까지는 안내 페이지로 작동.
-->
<template>
  <div class="min-h-screen px-4 py-6 max-w-md mx-auto space-y-4">
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
      <p class="text-sm font-medium text-riso-dark">{{ $t('upgrade.paymentOptions') }}</p>
      <button
        type="button"
        class="w-full px-4 py-2 bg-riso-sage text-white rounded-md text-sm disabled:opacity-60"
        :disabled="loading"
        @click="onPurchase"
      >
        {{ loading ? $t('upgrade.processing') : $t('upgrade.buyButton') }}
      </button>
      <p class="text-xs text-riso-dark/50">
        {{ $t('upgrade.paymentNote') }}
      </p>
    </div>

    <NuxtLink to="/profile" class="block text-sm text-riso-dark/60 hover:underline">
      {{ $t('upgrade.backToProfile') }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { startPurchase, loading } = usePayment()
const toast = useToast()
const { t } = useI18n()

async function onPurchase() {
  // 상품 ID 단일 SoT = 백엔드 mapProductIdToEntitlementKey (free_placement_unlock → free_placement).
  // (기존 'free-placement' 하이픈은 백엔드 매핑과 불일치 — 2026-06-04 fix)
  const ok = await startPurchase('free_placement_unlock')
  if (ok) toast.success(t('upgrade.purchaseSuccess'))
  else toast.info(t('upgrade.purchasePhase4'))
}
</script>
