<template>
  <Transition name="cheer-fade">
    <div v-if="open" class="fixed inset-0 z-[9998] flex items-center justify-center p-5">
      <!-- 백드롭 -->
      <div class="absolute inset-0 bg-black/40" @click="emit('close')" />

      <!-- 패널 — 아프젝 화이트 카드 (fig-record 응원 팝업) -->
      <div
        ref="rootEl"
        role="dialog"
        aria-modal="true"
        aria-label="응원 메시지 보내기"
        class="relative w-full max-w-[340px] rounded-[20px] bg-apjek-surface p-[20px]"
      >
        <div class="flex items-center justify-between mb-[8px]">
          <p class="text-[16px] font-bold text-apjek-text">응원하기</p>
          <button
            type="button"
            class="w-7 h-7 rounded-full bg-apjek-bg flex items-center justify-center transition active:scale-95"
            aria-label="닫기"
            @click="emit('close')"
          >
            <Icon name="lucide:x" class="w-4 h-4 text-apjek-text-sub" />
          </button>
        </div>

        <p class="text-[13px] text-apjek-text-sub leading-[18px] mb-[12px]">
          {{ friendNickname }}님이 아직 함께 기록하기 전이에요.<br>
          응원 메시지를 보내 함께 시작해봐요!
        </p>

        <textarea
          v-model="message"
          rows="3"
          maxlength="100"
          placeholder="메시지를 입력해주세요 (1~100자)"
          class="w-full rounded-[12px] p-[12px] text-[14px] resize-none outline-none focus:ring-2 focus:ring-apjek-blue/30 bg-apjek-bg text-apjek-text"
        />
        <div class="text-right text-[11px] text-apjek-text-faint mt-[4px]">{{ message.length }}/100</div>

        <button
          type="button"
          class="w-full h-12 rounded-full mt-[8px] bg-apjek-cta text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
          :disabled="busy || message.trim().length === 0"
          @click="onSubmit"
        >
          응원 전달하기 💌
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * 습관 응원 팝업 (R3-FE) — 친구 참여 대기 상태의 연동 습관에서 응원 메시지(1~100자)를
 * 입력받아 부모에 위임한다. API 호출·토스트는 부모(record 페이지) 책임 — 팝업은 표시 전용.
 */
const props = defineProps<{
  open: boolean
  friendNickname: string
  /** 전송 진행 중 여부 (부모의 cheerHabit 호출 busy) */
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [message: string]
}>()

const rootEl = ref<HTMLElement | null>(null)
const message = ref<string>('')

// focus trap + 배경 스크롤 잠금 + ESC 닫기 (bespoke 오버레이 공통 규약 — CLAUDE.md §12)
useDialogFocusTrap(rootEl, computed<boolean>(() => props.open), () => emit('close'))

// 열 때마다 입력 초기화 — 이전 대상에게 쓰던 메시지 잔존 방지
watch(() => props.open, (open) => {
  if (open) message.value = ''
})

function onSubmit() {
  const text = message.value.trim()
  if (text.length === 0 || text.length > 100 || props.busy) return
  emit('submit', text)
}
</script>

<style scoped>
/* 페이드 전환 — transform 미사용 (Tailwind v4 translate 합성 함정 회피, CLAUDE.md §12) */
.cheer-fade-enter-active,
.cheer-fade-leave-active {
  transition: opacity 0.2s ease;
}
.cheer-fade-enter-from,
.cheer-fade-leave-to {
  opacity: 0;
}
</style>
