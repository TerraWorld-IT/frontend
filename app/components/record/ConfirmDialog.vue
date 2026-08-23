<template>
  <Teleport to="body">
    <Transition name="rc-fade">
      <div v-if="open" class="fixed inset-0 z-[9998] flex items-center justify-center p-5">
        <!-- 백드롭 -->
        <div class="absolute inset-0 bg-black/40" @click="emit('close')" />

        <!-- 패널 — Figma 삭제/요청취소 팝업(393×230): 제목 + X, 안내 1줄, 검정 버튼 -->
        <div
          ref="rootEl"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          class="relative w-full max-w-[353px] rounded-[20px] bg-apjek-surface px-[20px] pt-[20px] pb-[20px]"
        >
          <div class="flex items-center justify-between mb-[10px]">
            <p class="text-[18px] font-bold text-apjek-text tracking-[-0.3px]">{{ title }}</p>
            <!-- X = 창 닫기 (댓글 #37) — 확인 동작이 아니다 -->
            <button
              type="button"
              class="w-7 h-7 rounded-full bg-apjek-bg flex items-center justify-center transition active:scale-95"
              aria-label="닫기"
              @click="emit('close')"
            >
              <Icon name="lucide:x" class="w-4 h-4 text-apjek-text-sub" />
            </button>
          </div>

          <p class="text-[14px] text-apjek-text-sub leading-[20px] mb-[20px]">{{ message }}</p>

          <button
            type="button"
            class="w-full h-[48px] rounded-full bg-apjek-cta text-white text-[14px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
            :disabled="busy"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 기록 탭 확인 팝업 (R9) — "기록 중단하기" / "요청 취소하기" 공용.
 * 상태는 부모 소유, 본 컴포넌트는 표시 전용. X·백드롭·ESC 는 close, 버튼만 confirm.
 */
const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmText: string
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const rootEl = ref<HTMLElement | null>(null)

// focus trap + 배경 스크롤 잠금 + ESC 닫기 (bespoke 오버레이 공통 규약 — CLAUDE.md §12)
useDialogFocusTrap(rootEl, computed<boolean>(() => props.open), () => emit('close'))
</script>

<style scoped>
/* 페이드 전환 — transform 미사용 (Tailwind v4 translate 합성 함정 회피, CLAUDE.md §12) */
.rc-fade-enter-active,
.rc-fade-leave-active {
  transition: opacity 0.2s ease;
}
.rc-fade-enter-from,
.rc-fade-leave-to {
  opacity: 0;
}
</style>
