<!--
  Modal A 의 한 축 (오늘 출석) — 홈 우측 상단에 항상 표시.
  - 미수령 시 버튼 클릭으로 +이슬 보상
  - 수령 후엔 streak 표시만
  - 7일 streak 마다 보너스 +20 이슬
-->
<template>
  <div
    v-if="state"
    class="bg-riso-cream/90 backdrop-blur rounded-xl px-3 py-2 riso-shadow-sm flex items-center gap-2"
  >
    <span class="text-xl" aria-hidden="true">📅</span>
    <div class="text-xs text-riso-dark leading-tight">
      <div class="font-semibold">{{ status }}</div>
      <div class="text-riso-dark/60">연속 {{ streak }}일</div>
    </div>
    <button
      v-if="!checkedIn"
      type="button"
      :disabled="loading"
      class="ml-1 px-2 py-1 text-xs bg-riso-sage text-white rounded-md disabled:opacity-60"
      @click="onCheckIn"
    >
      {{ loading ? '...' : `+${reward}` }}
    </button>
  </div>
</template>

<script setup lang="ts">
// 미인증 또는 fetch 실패 시 state 가 null → 위젯 자체가 렌더되지 않음 (조용한 fallback).
// 인증된 사용자에게만 표시되며, 401 등 오류는 useAttendance 의 error.value 에 격리되고
// 컴포넌트 외부로 노출되지 않는다 (홈 페이지의 다른 영역과 격리하기 위함).
const { state, loading, refresh, checkIn } = useAttendance()
const toast = useToast()

const checkedIn = computed(() => Boolean(state.value?.today))
const streak = computed(() => state.value?.streak ?? 0)
const reward = computed(() => state.value?.rewardBasicCoins ?? 5)
const status = computed(() => (checkedIn.value ? '오늘 출석 완료' : '출석하기'))

async function onCheckIn() {
  const result = await checkIn()
  if (result) {
    const bonus = result.reward.bonus ? ' (보너스!)' : ''
    toast.success(`이슬 +${result.reward.basicCoins}${bonus}`)
  }
}

onMounted(() => {
  void refresh()
})
</script>
