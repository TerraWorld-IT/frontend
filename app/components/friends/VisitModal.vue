<!--
  놀러가기 모달 — 친구 테라리움 실렌더 (아프젝 리스킨).
  - bespoke 오버레이 규약: role="dialog" aria-modal + useDialogFocusTrap(focus trap + ESC +
    배경 스크롤 잠금 합성) + Android 하드웨어 뒤로가기(useBackButtonStack) 등록.
  - 카드/CTA/칩은 아프젝 공용 컴포넌트 클래스(apjek-card/apjek-cta/apjek-chip) 사용.
  - 좋아요 토글은 페이지가 소유(단일 핸들러) — 여기서는 emit 만 한다.
-->
<template>
  <Teleport to="body">
    <Transition name="friend-visit">
      <div
        v-if="open"
        ref="rootEl"
        class="fixed inset-0 z-[9997] flex items-start justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="friend-visit-title"
      >
        <!-- 백드롭 -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')" />

        <!-- 카드 — CommonModal 과 동일한 safe centering(짧으면 중앙, 길면 상단부터 스크롤) -->
        <div
          class="relative apjek-card w-full max-w-sm rounded-[20px] p-5 my-auto overflow-y-auto"
          style="max-height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 32px)"
        >
          <!-- 헤더 -->
          <div class="flex items-start justify-between gap-3 mb-4">
            <h3 id="friend-visit-title" class="apjek-section-title text-[17px] leading-[24px]">
              {{ title }}
            </h3>
            <button
              type="button"
              class="group shrink-0 size-11 -m-[6px] flex items-center justify-center"
              :aria-label="$t('common.close')"
              @click="emit('close')"
            >
              <span class="size-8 rounded-full bg-apjek-bg flex items-center justify-center group-active:scale-95">
                <Icon name="lucide:x" class="w-4 h-4 text-apjek-text-sub" />
              </span>
            </button>
          </div>

          <!-- 본문: 실 테라리움 렌더 -->
          <div v-if="terrarium" class="space-y-3">
            <div class="rounded-[16px] overflow-hidden border border-apjek-border bg-apjek-bg">
              <FriendsTerrariumView :terrarium="terrarium" />
            </div>
            <p class="text-[13px] text-apjek-text-sub text-center">
              {{ $t('friends.visitItemCount', { n: terrarium.placedItems?.length ?? 0 }) }}
            </p>
          </div>

          <!-- 로딩 -->
          <div v-else class="py-8 flex flex-col items-center gap-2">
            <CommonLoading />
            <p class="text-[12px] text-apjek-text-faint">{{ $t('friends.visitLoading') }}</p>
          </div>

          <!-- 푸터: 좋아요 토글 + 닫기 CTA -->
          <div class="flex items-center gap-2.5 mt-4">
            <button
              v-if="friend"
              type="button"
              class="apjek-chip h-11 px-4 text-[13px] active:scale-95"
              :class="friend.liked ? 'apjek-chip-active' : ''"
              :disabled="liking"
              :aria-pressed="friend.liked ? 'true' : 'false'"
              @click="emit('toggleLike')"
            >
              <span aria-hidden="true" class="text-[15px] leading-none">{{ friend.liked ? '♥' : '♡' }}</span>
              {{ $t('friends.likeCount', { n: friend.likeCount }) }}
            </button>
            <button type="button" class="apjek-cta flex-1 h-11 text-[14px]" @click="emit('close')">
              {{ $t('common.close') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { TerrariumResponse } from '@terraworld-it/openapi-frontend'

// 페이지의 FriendItem 과 동일 shape — 목록 행 객체를 그대로 넘겨받아 반응성을 공유한다.
interface VisitFriend {
  userId: string
  nickname: string
  likeCount: number
  liked?: boolean
}

const props = defineProps<{
  open: boolean
  friend: VisitFriend | null
  terrarium: TerrariumResponse | null
  liking: boolean
}>()

const emit = defineEmits<{
  close: []
  toggleLike: []
}>()

const { t } = useI18n()

const title = computed<string>(() =>
  props.friend ? t('friends.visitTitle', { nickname: props.friend.nickname }) : '',
)

// focus trap + ESC 닫기 + 배경 스크롤 잠금 (useOverlayScrollLock 합성 포함)
const rootEl = ref<HTMLElement | null>(null)
useDialogFocusTrap(rootEl, toRef(props, 'open'), () => emit('close'))

// Android 하드웨어 뒤로가기 — 열려있는 동안은 이 모달부터 닫는다 (pages/index.vue 규약).
// 열린 채 라우트 이탈로 unmount 되면 close 분기가 안 돌아 stale handler 가 남으므로
// onBeforeUnmount 에서도 해제한다.
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
.friend-visit-enter-active { transition: all 0.2s ease-out; }
.friend-visit-leave-active { transition: all 0.15s ease-in; }
.friend-visit-enter-from, .friend-visit-leave-to { opacity: 0; }
.friend-visit-enter-from .relative { transform: scale(0.95); }
</style>
