<template>
  <!-- 응원 바텀시트 (R3b, Figma 393×552) — 구 중앙 모달(CheerPopup) 대체 -->
  <CommonBottomSheet :open="open" ariaLabel="응원 메시지 보내기" @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-2 px-5 py-3 border-b border-apjek-border shrink-0 mr-9">
        <Icon name="lucide:mail" class="w-[18px] h-[18px] text-apjek-text" />
        <span class="font-bold text-[16px] text-apjek-text">응원하기</span>
      </div>
    </template>

    <div class="px-5 pt-4 pb-2 flex flex-col gap-[14px]">
      <p class="text-[14px] text-apjek-text leading-[20px] font-semibold">
        친구의 기록을 응원해요!
      </p>
      <p class="text-[13px] text-apjek-text-sub leading-[18px] -mt-[8px]">
        소중한 응원하기 메세지가 친구에게 알림으로 전달돼요
      </p>

      <textarea
        v-model="message"
        rows="5"
        maxlength="100"
        placeholder="메시지를 입력하세요"
        class="w-full rounded-[12px] p-[14px] text-[14px] resize-none outline-none focus:ring-2 focus:ring-apjek-blue/30 bg-apjek-bg text-apjek-text"
      />
      <div class="text-right text-[11px] text-apjek-text-faint -mt-[8px]">{{ message.length }}/100</div>

      <button
        type="button"
        class="w-full h-[48px] rounded-full bg-apjek-cta text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
        :disabled="busy || message.trim().length === 0"
        @click="onSubmit"
      >
        응원 전달하기
        <Icon name="lucide:mail" class="w-4 h-4" />
      </button>
    </div>
  </CommonBottomSheet>
</template>

<script setup lang="ts">
/**
 * 습관 응원 시트 (R3b) — 친구 미기록 상태의 연동 습관에서 응원 메시지(1~100자)를 입력받아
 * 부모에 위임한다. API 호출·토스트(성공 "{닉네임} 에게 응원 메세지 전달 성공!" / 429 안내)는
 * 부모(record 페이지) 책임 — 시트는 표시 전용.
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

const message = ref<string>('')

// 열 때마다 입력 초기화 — 이전 대상에게 쓰던 메시지 잔존 방지
watch(() => props.open, (open) => {
  if (open) message.value = ''
})

function onSubmit() {
  const text = message.value.trim()
  if (text.length === 0 || text.length > 100 || props.busy) return
  void dismissKeyboard()
  emit('submit', text)
}
</script>
