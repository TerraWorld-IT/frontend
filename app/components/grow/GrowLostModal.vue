<template>
  <!-- G4 기록 끊김 모달 (Figma 413×310 → 폭 393 근사). 우상단 X(댓글 #32: 재화·광고 강제 금지),
       버튼 2개 세로 — [💎 루비 N개 사용](루비 부족 시 연파랑 비활성) / [AD 광고 보상 사용](파랑 #A1CCDB).
       bespoke 오버레이 규약: role="dialog" aria-modal + useDialogFocusTrap + Android 뒤로가기 등록.
       공용 Modal 은 C4 리스킨 진행 중이라 의존하지 않는다. TODO(C4 머지 후): 공용 Modal 로 교체 검토. -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        ref="rootEl"
        class="fixed inset-0 z-[9997] flex items-center justify-center px-5 bg-[#1d3e63]/55 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grow-lost-title"
        @click.self="emit('close')"
      >
        <div class="relative w-full max-w-[393px] rounded-[24px] bg-apjek-surface px-[22px] pt-[26px] pb-[22px]">
          <!-- X — 창 닫기(닫으면 "내일 찾아와요" 상태) -->
          <button
            type="button"
            class="absolute top-[14px] right-[14px] w-8 h-8 rounded-full bg-apjek-blue-soft flex items-center justify-center active:scale-90 transition-transform"
            aria-label="닫기"
            @click="emit('close')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="text-apjek-blue-deep">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>

          <div class="flex items-start gap-[10px] pr-[36px]">
            <span class="text-[24px] leading-none mt-[2px]" aria-hidden="true">😢</span>
            <div class="min-w-0">
              <h3 id="grow-lost-title" class="text-[18px] font-bold text-apjek-text tracking-[-0.4px] leading-[26px]">
                기록이 끊겨서 정령이 떠났어요
              </h3>
              <p class="mt-[6px] text-[13px] text-apjek-text-sub tracking-[-0.2px] leading-[19px]">
                루비를 사용하여 정령을 다시 불러 올 수 있어요
              </p>
            </div>
          </div>

          <div class="mt-[22px] flex flex-col gap-[10px]">
            <!-- 루비 사용 — 부족 시 연파랑 비활성 -->
            <button
              type="button"
              class="h-[48px] rounded-full text-[14px] font-semibold inline-flex items-center justify-center gap-[6px] transition-all active:scale-[0.98]"
              :class="canUseRuby ? 'bg-apjek-cta text-white' : 'bg-apjek-blue-soft text-apjek-blue-deep/70 cursor-not-allowed'"
              :disabled="!canUseRuby || busy"
              @click="emit('revive', 'RUBY')"
            >
              <Icon name="lucide:gem" class="w-4 h-4" />
              루비 {{ rubyCost }}개 사용
              <span v-if="!canUseRuby" class="text-[12px] font-medium opacity-80">· 루비가 부족해요</span>
            </button>
            <!-- 광고 보상 사용 — 파랑 #A1CCDB -->
            <button
              type="button"
              class="h-[48px] rounded-full text-[14px] font-semibold inline-flex items-center justify-center gap-[8px] text-[#163a4a] transition-all active:scale-[0.98] disabled:opacity-60"
              style="background: #A1CCDB"
              :disabled="busy"
              @click="emit('revive', 'AD')"
            >
              <span class="px-[6px] h-[18px] rounded-[4px] bg-[#163a4a] text-white text-[10px] font-bold inline-flex items-center">AD</span>
              광고 보상 사용
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  /** 보유 루비 */
  ruby: number
  /** 복귀 비용(서버 reviveRubyCost, 기본 10) */
  rubyCost: number
  /** 복귀 요청 진행 중 */
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  /** 복귀 수단 선택 — 계약 §6 POST /growth/{speciesCode}/revive {method} */
  revive: [method: 'RUBY' | 'AD']
}>()

const canUseRuby = computed<boolean>(() => props.ruby >= props.rubyCost)

// focus trap + ESC + 배경 스크롤 잠금 (공용 프리미티브 합성)
const rootEl = ref<HTMLElement | null>(null)
useDialogFocusTrap(rootEl, toRef(props, 'open'), () => emit('close'))

// Android 하드웨어 뒤로가기 — 열려 있는 동안은 이 모달부터 닫는다.
const { pushBackHandler } = useBackButtonStack()
let unregisterBack: (() => void) | null = null
watch(() => props.open, (open) => {
  if (open) {
    unregisterBack = pushBackHandler(() => emit('close'))
  }
  else {
    unregisterBack?.()
    unregisterBack = null
  }
})
onBeforeUnmount(() => {
  unregisterBack?.()
  unregisterBack = null
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
