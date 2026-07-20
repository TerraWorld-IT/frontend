<!--
  공용 바텀시트 — 2026-07-20 통일 정책(audit C2): 시트마다 radius/배경/백드롭/핸들/닫기/
  max-height/모션이 제각각이던 것을 단일 규약으로 통일한다. 모든 시트는 통일된 기본
  높이(baseHeight)로 뜨고, 더 필요하면 사용자 액션(핸들 드래그/탭)으로 확대(expandedHeight)한다.

  내장 처리 (사용처에서 중복 등록 금지):
  - focus trap + 배경 스크롤 잠금 + ESC 닫기 → useDialogFocusTrap
  - Android 하드웨어 뒤로가기 → useBackButtonStack (열린 채 라우트 이탈 시 stale handler
    방지를 위해 onBeforeUnmount 정리 포함 — index.vue registerOverlayBackClose 패턴)
  - 콘텐츠 하단 safe-area 여백 (홈 인디케이터 가림 방지 — audit C7-1)

  트랜지션 함정 (frontend/CLAUDE.md): Tailwind v4 의 `-translate-x-1/2` 는 개별 `translate`
  속성이라 transform 에 X 축을 넣으면 이중 적용된다. 수평 중앙은 `inset-x-0 mx-auto` 로 잡고
  패널 enter-from/leave-to 는 `transform: translateY(100%)` 만 사용한다.
-->
<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="open"
        ref="root"
        class="fixed inset-0 z-[9997]"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaLabel"
      >
        <div class="sheet-backdrop fixed inset-0 bg-black/40" @click="emit('close')" />
        <div
          class="sheet-panel fixed bottom-0 inset-x-0 w-full max-w-md mx-auto rounded-t-3xl shadow-2xl flex flex-col"
          :style="{
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            maxHeight: expanded ? expandedHeight : baseHeight,
          }"
        >
          <!-- 핸들 바 — expandable 이면 드래그(위 40px 확대 / 아래 40px 축소·닫기) + 탭 토글 -->
          <button
            v-if="expandable"
            type="button"
            class="w-full flex justify-center items-center shrink-0 cursor-grab"
            style="height: 28px; touch-action: none"
            aria-label="시트 확대/축소"
            @pointerdown="onHandlePointerDown"
            @click="onHandleClick"
          >
            <span class="w-12 h-1 rounded-full bg-gray-200" />
          </button>
          <div v-else class="w-full flex justify-center items-center shrink-0" style="height: 28px">
            <span class="w-12 h-1 rounded-full bg-gray-200" />
          </div>

          <!-- 닫기 X -->
          <button
            v-if="showClose"
            type="button"
            class="absolute top-3 right-4 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
            aria-label="닫기"
            @click="emit('close')"
          >
            <Icon name="lucide:x" class="w-4 h-4 text-gray-500" />
          </button>

          <!-- 고정 헤더 (옵션) — 스크롤 영역 밖에 남아 콘텐츠 스크롤 시에도 고정된다 -->
          <slot name="header" />

          <!-- 콘텐츠 — 단일 스크롤 영역. 하단 safe-area 여백은 여기서 일괄 처리(audit C7-1) -->
          <div
            class="flex-1 min-h-0 overflow-y-auto"
            style="padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px))"
          >
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** 시트 표시 여부 — 상태는 부모가 소유한다. 닫기 요청은 close emit 로만 전달. */
  open: boolean
  ariaLabel: string
  /** 핸들 드래그/탭으로 expandedHeight 까지 확대 가능 여부 */
  expandable?: boolean
  /** 기본 max-height (짧은 콘텐츠는 자연 높이, 긴 콘텐츠는 이 값으로 캡) */
  baseHeight?: string
  /** 확대 시 max-height */
  expandedHeight?: string
  showClose?: boolean
}>(), {
  expandable: true,
  baseHeight: '62dvh',
  expandedHeight: 'calc(100dvh - 98px - 20px)',
  showClose: true,
})

const emit = defineEmits<{ close: [] }>()

const expanded = ref<boolean>(false)

// focus trap + 배경 스크롤 잠금 + ESC 닫기 — 한 곳에서 일괄 처리.
const root = ref<HTMLElement | null>(null)
useDialogFocusTrap(root, computed<boolean>(() => props.open), () => emit('close'))

// Android 하드웨어 뒤로가기 — 열려있는 동안 라우트 back/앱종료보다 먼저 close 를 요청한다.
const { pushBackHandler } = useBackButtonStack()
let unregisterBackHandler: (() => void) | null = null
watch(() => props.open, (open) => {
  if (open) {
    unregisterBackHandler = pushBackHandler(() => emit('close'))
  }
  else {
    unregisterBackHandler?.()
    unregisterBackHandler = null
    // 닫히면 다음 오픈은 항상 기본 높이에서 시작.
    expanded.value = false
  }
}, { immediate: true })
// 열린 채 라우트 이탈로 unmount 되면 watch 의 close 분기가 안 돌아 stale handler 가
// 스택에 영구히 남는다 — 명시 정리.
onBeforeUnmount(() => {
  unregisterBackHandler?.()
  unregisterBackHandler = null
})

// 핸들 제스처 — dy ≤ -40 확대 / dy ≥ +40 (확대 상태면 축소, 기본 상태면 닫기).
// 드래그로 동작이 소비되면 뒤따르는 native click 1회를 무시해 탭 토글과 이중 발동을 막는다.
let dragConsumed = false

function onHandlePointerDown(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  const startY = e.clientY
  dragConsumed = false

  function onMove(ev: PointerEvent) {
    const dy = ev.clientY - startY
    if (dy <= -40) {
      expanded.value = true
      dragConsumed = true
      cleanup()
    }
    else if (dy >= 40) {
      if (expanded.value) expanded.value = false
      else emit('close')
      dragConsumed = true
      cleanup()
    }
  }
  function cleanup() {
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', cleanup)
    el.removeEventListener('pointercancel', cleanup)
  }
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', cleanup)
  el.addEventListener('pointercancel', cleanup)
}

function onHandleClick() {
  if (dragConsumed) {
    dragConsumed = false
    return
  }
  expanded.value = !expanded.value
}
</script>

<style scoped>
/* Vue <Transition> 은 "루트" 엘리먼트의 computed transition 으로 종료를 판정한다 — 루트가
   자식(패널 0.32s/0.28s, 백드롭 0.25s)보다 짧으면 애니메이션이 잘리므로 루트가 최장
   duration 을 선언한다(실제 opacity 변화는 없고 timeout+1 fallback 이 종료를 보장). */
.sheet-enter-active { transition: opacity 0.32s ease; }
.sheet-leave-active { transition: opacity 0.28s ease-in; }

.sheet-enter-active .sheet-backdrop,
.sheet-leave-active .sheet-backdrop { transition: opacity 0.25s ease; }
.sheet-enter-from .sheet-backdrop,
.sheet-leave-to .sheet-backdrop { opacity: 0; }

/* Tailwind v4 함정 — 패널 transform 은 Y 축만 (수평 중앙은 inset-x-0 mx-auto). */
.sheet-enter-active .sheet-panel { transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1); }
.sheet-leave-active .sheet-panel { transition: transform 0.28s ease-in; }
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel { transform: translateY(100%); }

/* 확대/축소 max-height 트랜지션 — enter/leave 중에는 위의 더 구체적인 규칙이
   transition 을 transform 전용으로 덮어써 충돌하지 않는다. */
.sheet-panel { transition: max-height 0.3s ease; }

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active,
  .sheet-leave-active,
  .sheet-enter-active .sheet-backdrop,
  .sheet-leave-active .sheet-backdrop,
  .sheet-enter-active .sheet-panel,
  .sheet-leave-active .sheet-panel,
  .sheet-panel { transition-duration: 0.01ms; }
}
</style>
