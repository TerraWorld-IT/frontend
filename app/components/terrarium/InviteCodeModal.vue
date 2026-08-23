<!--
  나의 초대코드 팝업 (아프젝 T10b — Figma "나의 초대코드 팝업" 393×481).
  헤더 "🔗 나의 초대코드" + X / "친구가 내 코드로 가입하면 보상을 받아요" / 보상 줄 / 💎 /
  연노랑(#f4f9c9) 코드 박스 "나의 초대코드 / TERRA - ABC123" / 버튼 2개 [🔗 코드 복사][공유 하기].
  보상 줄("나 : 루비 +30 , 친구 : 루비 +10")은 발급 응답 `InviteResponse.inviterRuby/inviteeRuby`(BE 설정값) 그대로.
  등록명: TerrariumInviteCodeModal.
-->
<template>
  <TerrariumHomeDialog :open="open" title="나의 초대코드" icon="🔗" aria-label="나의 초대코드" @close="emit('close')">
    <p class="text-center text-sm font-semibold text-apjek-text mb-1">친구가 내 코드로 가입하면 보상을 받아요</p>
    <!-- 보상 수치 — 초대자/수락자 비대칭(서버 설정값) -->
    <p class="text-center text-xs text-apjek-text-sub mb-3" data-testid="invite-reward">나 : 루비 +{{ inviterRuby }} , 친구 : 루비 +{{ inviteeRuby }}</p>
    <div class="text-center text-4xl mb-3" aria-hidden="true">💎</div>
    <div class="rounded-2xl py-5 px-4 text-center mb-4" style="background: #f4f9c9">
      <p class="text-[11px] font-medium mb-1" style="color: #8a8f66">나의 초대코드</p>
      <p class="text-2xl font-extrabold tracking-[0.06em]" style="color: #111111" data-testid="invite-code-display">{{ displayCode }}</p>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        data-testid="invite-copy"
        class="py-3 rounded-full text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
        style="background: var(--color-apjek-blue-soft); color: var(--color-apjek-blue-deep)"
        @click="emit('copy')"
      >
        <span aria-hidden="true">🔗</span>코드 복사
      </button>
      <button
        type="button"
        data-testid="invite-share"
        class="py-3 rounded-full text-sm font-bold flex items-center justify-center text-white transition-all active:scale-95"
        style="background: var(--color-apjek-cta)"
        @click="emit('share')"
      >
        공유 하기
      </button>
    </div>
  </TerrariumHomeDialog>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  /** 서버 발급 코드(원본). 표시만 `TERRA - {code}` 포맷 — 복사/입력은 원본 코드를 쓴다. */
  code: string
  /** 초대자(나) 보상 루비 — `InviteResponse.inviterRuby` */
  inviterRuby: number
  /** 수락자(친구) 보상 루비 — `InviteResponse.inviteeRuby` */
  inviteeRuby: number
}>()

const emit = defineEmits<{ close: [], copy: [], share: [] }>()

const displayCode = computed<string>(() => (props.code ? `TERRA - ${props.code}` : ''))
</script>
