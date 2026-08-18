<template>
  <div class="w-full rounded-[16px] border border-apjek-border bg-apjek-surface p-[16px]">
    <div class="flex items-center justify-between w-full mb-[4px]">
      <p class="text-[14px] font-bold text-apjek-text tracking-[-0.15px] min-w-0 truncate">
        {{ tracker.title }}
      </p>
      <div class="flex items-center gap-[8px] shrink-0">
        <span
          class="text-[11px]"
          :style="{ color: tracker.status === 'ACTIVE' ? 'var(--color-apjek-blue)' : 'var(--color-apjek-sun)' }"
        >
          {{ statusLabel(tracker.status) }}
        </span>
        <!-- 중단 — 2단계 인라인 확인 (별도 모달 없이 오탭 방지) -->
        <button
          v-if="tracker.status === 'ACTIVE' && !confirmingStop"
          type="button"
          class="text-[11px] text-apjek-text-faint underline transition active:scale-95"
          @click="confirmingStop = true"
        >
          중단
        </button>
        <template v-else-if="confirmingStop">
          <button
            type="button"
            class="text-[11px] font-semibold text-riso-poppy underline transition active:scale-95 disabled:opacity-50"
            :disabled="stopBusy"
            @click="onStop"
          >
            정말 중단
          </button>
          <button
            type="button"
            class="text-[11px] text-apjek-text-faint transition active:scale-95"
            :disabled="stopBusy"
            @click="confirmingStop = false"
          >
            취소
          </button>
        </template>
      </div>
    </div>

    <!-- 친구 연동 상태 — partnerActive 일 때만 2배가 실제 성립 (M2: 상시 "2배" 뱃지 오표시 교정)
         뱃지 팔레트: 진행중=반짝이 핑크 / 대기=연블루 (아프젝 토큰) -->
    <p v-if="tracker.friendLinked" class="w-full text-[12px] -mt-[2px] mb-[2px]">
      <span class="text-apjek-text-sub">{{ tracker.friendNickname ?? '친구' }}님과 함께</span>
      <span
        v-if="tracker.partnerActive"
        class="text-[10px] px-[6px] py-[2px] rounded-full ml-[4px] bg-apjek-sparkle/15 text-apjek-sparkle"
      >함께 진행 중 · 완주 보상 2배</span>
      <span
        v-else
        class="text-[10px] px-[6px] py-[2px] rounded-full ml-[4px] bg-apjek-blue-soft text-apjek-blue-deep"
      >친구 참여 대기 — 친구도 시작하면 2배</span>
    </p>

    <!-- 7일 원 — 아프젝 블루 채움 (frame-habit-create) -->
    <div class="flex items-center justify-center gap-[12px] pt-[16px] pb-[4px]">
      <div
        v-for="hd in HABIT_DAYS"
        :key="hd.day"
        class="flex flex-col items-center gap-[4px]"
      >
        <div
          class="size-[36px] rounded-full flex items-center justify-center text-[12px] font-bold"
          :style="dayStyle(hd.day)"
        >
          {{ hd.day <= tracker.currentStreakDays ? '✓' : hd.day }}
        </div>
        <span
          class="text-[9px] tracking-[0.167px]"
          :style="{ color: hd.day <= tracker.currentStreakDays ? 'var(--color-apjek-blue)' : 'var(--color-apjek-text-faint)' }"
        >
          {{ hd.points }}
        </span>
      </div>
    </div>

    <!-- 진행 바 — 블루 (frame-habit-create 하단 진행 표시) -->
    <div class="w-full pt-[16px] pb-[14px]">
      <div class="flex items-start justify-between mb-[6px]">
        <span class="text-[10px] tracking-[0.117px] text-apjek-blue">
          진행 {{ tracker.currentStreakDays }}/{{ tracker.cycleLengthDays }}일
        </span>
        <span class="text-[10px] tracking-[0.117px] text-apjek-blue">
          7일 달성 시 반짝이 획득
        </span>
      </div>
      <div class="h-[6px] w-full rounded-full overflow-hidden bg-apjek-blue-soft">
        <div
          class="h-full rounded-full transition-all duration-500 bg-apjek-blue"
          :style="{ width: `${Math.min(100, (tracker.currentStreakDays / tracker.cycleLengthDays) * 100)}%` }"
        />
      </div>
    </div>

    <!-- 체크인 버튼 — 아프젝 다크 CTA -->
    <button
      type="button"
      class="w-full h-[44px] rounded-full text-[14px] font-semibold transition active:scale-95"
      :class="checkedToday || tracker.status !== 'ACTIVE'
        ? 'bg-apjek-bg text-apjek-text-faint cursor-default'
        : 'bg-apjek-cta text-white'"
      :disabled="checkedToday || tracker.status !== 'ACTIVE' || busy"
      @click="$emit('checkin', tracker)"
    >
      {{ checkinLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { HabitTrackerResponse } from '@terraworld-it/openapi-frontend'

/**
 * 습관 트래커 카드 — 7일 원 + 진행 바 + 체크인 + 중단(2단계 확인).
 * 기록 페이지 습관 탭이 solo/친구별 N개 카드를 나열한다 (2026-07-21 n:n 재구성 —
 * 구 인라인 단일 뷰(record/index.vue find-first)의 추출·복수화).
 */
const props = defineProps<{
  tracker: HabitTrackerResponse
  /** 체크인 진행 중 여부 (페이지 전역 busy — 카드 간 공유) */
  busy?: boolean
}>()

const emit = defineEmits<{
  checkin: [tracker: HabitTrackerResponse]
  stop: [tracker: HabitTrackerResponse]
}>()

const confirmingStop = ref<boolean>(false)
const stopBusy = ref<boolean>(false)

function onStop() {
  stopBusy.value = true
  emit('stop', props.tracker)
  // 부모가 stop 성공 시 목록에서 카드를 제거한다 — 실패 시를 대비해 짧게 자체 해제.
  setTimeout(() => {
    stopBusy.value = false
    confirmingStop.value = false
  }, 1500)
}

const HABIT_DAYS: { day: number, points: string }[] = [
  { day: 1, points: '+10' },
  { day: 2, points: '+10' },
  { day: 3, points: '+30' },
  { day: 4, points: '+10' },
  { day: 5, points: '+10' },
  { day: 6, points: '+10' },
  { day: 7, points: '🎁' },
]

function todayStr(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000)
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`
}

const checkedToday = computed<boolean>(() =>
  !!props.tracker.lastCheckedDate && props.tracker.lastCheckedDate.slice(0, 10) === todayStr())

const checkinLabel = computed<string>(() => {
  if (props.tracker.status === 'COMPLETED') return '완료된 습관'
  if (props.tracker.status === 'BROKEN') return '중단된 습관'
  if (checkedToday.value) return '오늘 완료 ✓'
  return '오늘 체크인'
})

function statusLabel(s: HabitTrackerResponse['status']): string {
  return s === 'ACTIVE' ? '진행중' : s === 'COMPLETED' ? '완료' : '중단'
}

// 7일 원 상태별 스타일 — 아프젝 블루 팔레트 (체크=블루 채움 / 오늘=점선 블루 / 미래=연블루)
function dayStyle(day: number): Record<string, string> {
  const streak = props.tracker.currentStreakDays
  const isChecked = day <= streak
  const isCurrent = !isChecked && day === streak + 1
  if (isChecked) return { background: 'var(--color-apjek-blue)', color: 'white' }
  if (isCurrent) return { background: 'var(--color-apjek-blue-soft)', border: '2px dashed var(--color-apjek-blue)', color: 'var(--color-apjek-blue)' }
  return { background: 'var(--color-apjek-blue-soft)', border: '2px solid transparent', color: 'var(--color-apjek-blue-deep)' }
}
</script>
