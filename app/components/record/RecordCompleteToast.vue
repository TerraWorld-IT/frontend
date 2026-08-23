<template>
  <Teleport to="body">
    <Transition name="rct">
      <!-- 기록 완료 카드 토스트 (R4, Figma 393×88) — 토큰 아이콘 + "○○토큰 n개 획득!" +
           "완료한 기록을 캘린더에서 확인하세요." 탭 시 /calendar 이동 (댓글 #24).
           z-[9999]: 시트/다이얼로그(9997~9998) 위, AppUpdateGate(10000) 아래 — 공용 Toast 와 동일 밴드.
           TODO(C4 머지 후): useToast 가 {title, description, icon, variant:'card'} 를 지원하면
           본 컴포넌트를 그 API 호출로 대체한다. -->
      <div
        v-if="open"
        class="fixed left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4"
        style="top: calc(64px + env(safe-area-inset-top, 0px))"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div class="relative">
          <!-- 완료 파티클 (N-C1) — 1.2초 후 제거 -->
          <!-- 파일명이 디렉토리명(record)으로 시작하면 auto-import 명은 prefix 중복을 접는다
               (RecordRecordCompleteBurst 아님 — CLAUDE.md §12 함정) -->
          <RecordCompleteBurst v-if="burstVisible" />
          <button
            type="button"
            class="relative w-full rounded-[8px] border border-apjek-text bg-apjek-surface px-[14px] py-[12px] flex items-center gap-[12px] text-left transition-all active:scale-[0.98]"
            @click="onTap"
          >
            <div
              class="size-[40px] rounded-full shrink-0 flex items-center justify-center text-[20px]"
              :style="{ background: tokenStyle.bg }"
              aria-hidden="true"
            >
              {{ tokenStyle.emoji }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[15px] font-bold text-apjek-text leading-[20px] truncate">{{ headline }}</p>
              <p class="text-[12px] text-apjek-text-sub leading-[16px] mt-[2px]">
                완료한 기록을 <span class="font-bold text-apjek-text">캘린더</span>에서 확인하세요.
              </p>
            </div>
            <Icon name="lucide:chevron-right" class="w-4 h-4 text-apjek-text-faint shrink-0" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 일상 기록 완료 토스트. 표시/숨김은 부모가 소유(open), 탭 또는 자동 만료(3.5s)에 close 를 요청한다.
 * 보상 수치는 서버 reward.categoryTokens — 0/누락이면 수치 없이 "○○토큰 획득!" 로 표기해
 * 실지급과 다른 숫자를 남기지 않는다.
 */
export type DailyTokenKind = 'dew' | 'sun' | 'bolt' | 'wind'

const props = defineProps<{
  open: boolean
  kind: DailyTokenKind
  /** 서버가 지급한 토큰 수 (0/null 이면 수치 생략) */
  count: number | null
}>()

const emit = defineEmits<{ close: [] }>()

const TOKEN_STYLE: Record<DailyTokenKind, { name: string; emoji: string; bg: string }> = {
  dew: { name: '이슬', emoji: '💧', bg: 'var(--color-apjek-dew-bg)' },
  sun: { name: '햇살', emoji: '☀️', bg: 'var(--color-apjek-sun-bg)' },
  bolt: { name: '번개', emoji: '⚡', bg: 'var(--color-apjek-bolt-bg)' },
  wind: { name: '바람', emoji: '🌀', bg: 'var(--color-apjek-wind-bg)' },
}

const tokenStyle = computed<{ name: string; emoji: string; bg: string }>(() => TOKEN_STYLE[props.kind])

const headline = computed<string>(() => {
  const n = props.count
  return typeof n === 'number' && n > 0
    ? `${tokenStyle.value.name}토큰 ${n}개 획득!`
    : `${tokenStyle.value.name}토큰 획득!`
})

const burstVisible = ref<boolean>(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null
let burstTimer: ReturnType<typeof setTimeout> | null = null

function clearTimers() {
  if (hideTimer) clearTimeout(hideTimer)
  if (burstTimer) clearTimeout(burstTimer)
  hideTimer = null
  burstTimer = null
}

watch(() => props.open, (open) => {
  clearTimers()
  if (!open || !import.meta.client) {
    burstVisible.value = false
    return
  }
  burstVisible.value = true
  burstTimer = setTimeout(() => { burstVisible.value = false }, 1200)
  hideTimer = setTimeout(() => emit('close'), 3500)
})

onBeforeUnmount(clearTimers)

function onTap() {
  emit('close')
  navigateTo('/calendar')
}
</script>

<style scoped>
/* 등장/퇴장 — Y 이동만 (Tailwind v4 의 -translate-x-1/2 는 개별 translate 속성이라 transform 에
   X 를 넣으면 이중 적용된다. CLAUDE.md §12) */
.rct-enter-active { transition: opacity 0.25s ease-out; }
.rct-leave-active { transition: opacity 0.2s ease-in; }
.rct-enter-from,
.rct-leave-to { opacity: 0; }
</style>
