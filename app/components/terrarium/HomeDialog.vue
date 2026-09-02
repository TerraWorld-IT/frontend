<!--
  홈 전용 중앙 다이얼로그 셸 (아프젝 v2 홈 팝업 공통 — 공유하기/초대코드/해금 팝업이 공유).
  - Figma 모달 규격 근사: 393 폭, r24 흰 카드, 헤더 [이모지 아이콘 + 제목] + 연파랑 원형 X.
  - bespoke 오버레이 규약: role="dialog" aria-modal + useDialogFocusTrap(focus trap + ESC +
    배경 스크롤 잠금) + Android 하드웨어 뒤로가기(useBackButtonStack). 상태는 부모가 소유(open prop).
  - CommonModal 은 confirm/cancel CTA 가 고정이라 버튼 없는 팝업·3상태 CTA 팝업에 맞지 않아 분리.
    app/components/common/** 은 다른 워크스트림이 리스킨 중이라 수정하지 않는다.
  등록명: TerrariumHomeDialog.
-->
<template>
  <Teleport to="body">
    <Transition name="home-dialog">
      <div
        v-if="open"
        ref="root"
        class="fixed inset-0 z-[9997]"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaLabel ?? title"
      >
        <div class="fixed inset-0 bg-black/40" @click="emit('close')" />
        <div class="fixed inset-x-4 top-1/2 -translate-y-1/2 mx-auto" :style="{ maxWidth: maxWidth }">
          <div class="rounded-3xl px-5 pt-5 pb-6 shadow-2xl flex flex-col max-h-[88dvh]" style="background: var(--color-apjek-surface)">
            <div class="flex items-center justify-between mb-4 shrink-0">
              <div class="flex items-center gap-2 min-w-0">
                <span v-if="icon" class="text-lg leading-none shrink-0" aria-hidden="true">{{ icon }}</span>
                <h3 class="font-bold text-[17px] text-apjek-text truncate">{{ title }}</h3>
              </div>
              <button
                type="button"
                class="size-11 -m-[6px] flex items-center justify-center shrink-0"
                aria-label="닫기"
                @click="emit('close')"
              >
                <span class="size-8 rounded-full flex items-center justify-center" style="background: var(--color-apjek-blue-soft)">
                  <Icon name="lucide:x" class="w-4 h-4" style="color: var(--color-apjek-blue)" />
                </span>
              </button>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <slot />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** 표시 여부 — 부모 소유. 닫기 요청은 close emit 로만. */
  open: boolean
  /** 헤더 제목 */
  title: string
  /** 헤더 앞 이모지 아이콘(선택) */
  icon?: string
  /** aria-label(기본 title) */
  ariaLabel?: string
  /** 카드 최대 폭 — Figma 393 기준 */
  maxWidth?: string
}>(), {
  icon: undefined,
  ariaLabel: undefined,
  maxWidth: '393px',
})

const emit = defineEmits<{ close: [] }>()

const root = ref<HTMLElement | null>(null)
useDialogFocusTrap(root, computed<boolean>(() => props.open), () => emit('close'))

// Android 하드웨어 뒤로가기 — 열려 있는 동안 라우트 back/앱 종료보다 먼저 close 요청.
// 열린 채 라우트 이탈로 unmount 되면 watch 의 close 분기가 안 돌아 stale handler 가 남으므로 명시 정리.
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
}, { immediate: true })
onBeforeUnmount(() => {
  unregisterBack?.()
  unregisterBack = null
})
</script>

<style scoped>
/* 중앙 다이얼로그 spring 근사 — 홈 index.vue 의 dialog 트랜지션과 동일 규약 */
.home-dialog-enter-active,
.home-dialog-leave-active { transition: opacity 0.25s ease; }
.home-dialog-enter-active > div:last-child,
.home-dialog-leave-active > div:last-child { transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1); }
.home-dialog-enter-from,
.home-dialog-leave-to { opacity: 0; }
.home-dialog-enter-from > div:last-child,
.home-dialog-leave-to > div:last-child { transform: translateY(20px) scale(0.92); }

@media (prefers-reduced-motion: reduce) {
  .home-dialog-enter-active,
  .home-dialog-leave-active,
  .home-dialog-enter-active > div:last-child,
  .home-dialog-leave-active > div:last-child { transition-duration: 0.01ms; }
}
</style>
