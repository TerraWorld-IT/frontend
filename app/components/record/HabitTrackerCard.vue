<template>
  <!-- 펼친 습관 카드 — Figma: 하단이 핑크 그라디언트 + 식물 실루엣(디자이너 "바탕_기록탭_습관기록") -->
  <div
    class="w-full rounded-[16px] border border-apjek-border bg-apjek-surface overflow-hidden"
    style="background: url(/bg/habit-card.webp) center bottom / 100% auto no-repeat var(--color-apjek-surface)"
  >
    <div class="p-[16px] pb-[8px]">
      <!-- 제목 + 우측 X (중단 / 요청 대기면 요청 취소 — R9, 댓글 #37) -->
      <div class="flex items-center justify-between w-full">
        <p class="text-[15px] font-bold text-apjek-text tracking-[-0.15px] min-w-0 truncate">
          {{ tracker.title }}
        </p>
        <button
          v-if="view !== 'cycleDone' && view !== 'pendingReceived'"
          type="button"
          class="w-7 h-7 rounded-full bg-apjek-bg flex items-center justify-center shrink-0 transition active:scale-95"
          :aria-label="view === 'pending' ? '요청 취소' : '기록 중단'"
          @click="view === 'pending' ? (cancelOpen = true) : (stopOpen = true)"
        >
          <Icon name="lucide:x" class="w-4 h-4 text-apjek-text-sub" />
        </button>
      </div>

      <p v-if="tracker.friendLinked" class="text-[12px] text-apjek-text-sub mt-[2px]">
        {{ tracker.friendNickname ?? '친구' }}님과 함께
      </p>
      <!-- 상대 중단(PARTNER_STOPPED) — 나는 계속 기록·완주 가능, 보상은 solo 값 -->
      <p v-if="partnerStopped" class="text-[12px] text-apjek-text-sub mt-[4px]" role="status">
        친구가 기록을 중단했어요 · 완주 보상은 {{ rewardSparkle }} 반짝이
      </p>

      <!-- 트래커 본체 — 요청 대기면 흐림 + 비활성 -->
      <div :class="view === 'pending' || view === 'pendingReceived' ? 'opacity-40 pointer-events-none select-none' : ''">
        <!-- 7일 원형 — 미체크 연파랑 외곽선+숫자 / 오늘 점선 / 체크 파랑 ✓. 원 클릭 = 오늘 체크인 (댓글 #29) -->
        <div class="flex items-center justify-between gap-[6px] pt-[16px] pb-[4px]">
          <button
            v-for="day in DAYS"
            :key="day"
            type="button"
            class="size-[38px] rounded-full flex items-center justify-center text-[13px] font-bold transition-all active:scale-95 disabled:cursor-default"
            :class="circleClass(day)"
            :disabled="!canCheckIn"
            :aria-label="dayAria(day)"
            @click="onCircleTap"
          >
            <Icon v-if="isDone(day)" name="lucide:check" class="w-4 h-4" />
            <template v-else>{{ day }}</template>
          </button>
        </div>

        <!-- 진행 텍스트 + 파랑 그라디언트 진행바 -->
        <div class="w-full pt-[14px] pb-[6px]">
          <div class="flex items-center justify-between mb-[6px]">
            <span class="text-[11px] tracking-[0.117px] text-apjek-blue-deep font-semibold">
              진행 {{ doneCount }}/{{ tracker.cycleLengthDays }}일
            </span>
            <span class="text-[11px] tracking-[0.117px] text-apjek-text-sub">
              7일 달성 시 반짝이+{{ rewardSparkle }} 획득
            </span>
          </div>
          <div class="h-[6px] w-full rounded-full overflow-hidden bg-apjek-blue-soft">
            <div
              class="h-full rounded-full transition-all duration-500"
              style="background: linear-gradient(90deg, var(--color-apjek-blue-deep), var(--color-apjek-dew))"
              :style="{ width: `${Math.min(100, (doneCount / tracker.cycleLengthDays) * 100)}%` }"
            />
          </div>
        </div>
      </div>

      <!-- 7/7 완료 — [기록 완료하기] [기록 1주일 연장 하기] (흰 외곽선, 세로) -->
      <div v-if="view === 'cycleDone'" class="flex flex-col gap-[8px] pt-[10px]">
        <button
          type="button"
          class="w-full h-[44px] rounded-full border border-apjek-text bg-apjek-surface text-[14px] font-semibold text-apjek-text transition-all active:scale-[0.98] disabled:opacity-50"
          :disabled="busy"
          @click="emit('complete', tracker)"
        >
          기록 완료하기
        </button>
        <button
          v-if="!tracker.friendLinked || partnerStopped"
          type="button"
          class="w-full h-[44px] rounded-full border border-apjek-text bg-apjek-surface text-[14px] font-semibold text-apjek-text transition-all active:scale-[0.98] disabled:opacity-50"
          :disabled="busy"
          @click="emit('extend', tracker)"
        >
          기록 1주일 연장 하기
        </button>
        <!-- 친구가 먼저 연장을 요청함(extendStatus=PENDING_RECEIVED) — [수락하기][거절하기] -->
        <div
          v-else-if="extendRequested"
          class="rounded-[14px] bg-apjek-cta text-white p-[14px] flex flex-col gap-[10px] mt-[4px]"
          role="group"
          aria-label="친구의 기록 연장 요청"
        >
          <div class="min-w-0">
            <p class="text-[13px] font-bold leading-[18px]">{{ tracker.friendNickname ?? '친구' }}님이 기록 연장을 요청했어요</p>
            <p class="text-[11px] leading-[16px] opacity-80 mt-[2px]">수락하면 함께 1주일 연장 · 새 기록 시작</p>
          </div>
          <div class="flex gap-[8px]">
            <button
              type="button"
              class="flex-1 h-[32px] rounded-full bg-white text-apjek-text text-[12px] font-semibold transition-all active:scale-95 disabled:opacity-50"
              :disabled="busy"
              aria-label="기록 연장 요청 수락하기"
              @click="emit('accept', tracker)"
            >
              수락하기
            </button>
            <button
              type="button"
              class="flex-1 h-[32px] rounded-full border border-white/70 text-white text-[12px] font-semibold transition-all active:scale-95 disabled:opacity-50"
              :disabled="busy"
              aria-label="기록 연장 요청 거절하기"
              @click="emit('decline', tracker)"
            >
              거절하기
            </button>
          </div>
        </div>
        <!-- 친구 연장 — 다크 카드 + [요청하기] (상대 수락 필요, 댓글 #56) -->
        <div v-else class="rounded-[14px] bg-apjek-cta text-white p-[14px] flex items-center gap-[12px] mt-[4px]">
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-bold leading-[18px]">친구와 함께 기록 연장하기</p>
            <p class="text-[11px] leading-[16px] opacity-80 mt-[2px]">친구가 수락하면 1주일 연장 · 새 기록 시작</p>
          </div>
          <button
            type="button"
            class="h-[32px] px-[14px] rounded-full bg-white text-apjek-text text-[12px] font-semibold shrink-0 transition-all active:scale-95 disabled:opacity-50"
            :disabled="busy"
            @click="emit('extend', tracker)"
          >
            요청하기
          </button>
        </div>
      </div>

      <!-- 친구 미기록 — 다크 카드 + [응원하기] (댓글 #36/#8) -->
      <div v-else-if="view === 'partnerIdle'" class="rounded-[14px] bg-apjek-cta text-white p-[14px] flex items-center gap-[12px] mt-[10px]">
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-bold leading-[18px]">아직 친구가 기록하지 않았어요</p>
          <p class="text-[11px] leading-[16px] opacity-80 mt-[2px]">친구에게 응원 메세지를 보내 볼까요?</p>
        </div>
        <button
          type="button"
          class="h-[32px] px-[14px] rounded-full bg-white text-apjek-text text-[12px] font-semibold shrink-0 transition-all active:scale-95"
          @click="emit('cheer', tracker)"
        >
          응원하기
        </button>
      </div>

      <!-- 요청 수신(partnerStatus=PENDING_RECEIVED) — 다크 카드 + [수락하기][거절하기] -->
      <div
        v-else-if="view === 'pendingReceived'"
        class="rounded-[14px] bg-apjek-cta text-white p-[14px] flex flex-col gap-[10px] mt-[10px]"
        role="group"
        aria-label="친구의 함께 기록 요청"
      >
        <div class="min-w-0">
          <p class="text-[13px] font-bold leading-[18px]">{{ tracker.friendNickname ?? '친구' }}님이 함께 기록을 요청했어요</p>
          <p class="text-[11px] leading-[16px] opacity-80 mt-[2px]">수락하면 1주일 동안 함께 기록해요 · 완주 시 반짝이 {{ rewardSparkle }}개</p>
        </div>
        <div class="flex gap-[8px]">
          <button
            type="button"
            class="flex-1 h-[32px] rounded-full bg-white text-apjek-text text-[12px] font-semibold transition-all active:scale-95 disabled:opacity-50"
            :disabled="busy"
            aria-label="함께 기록 요청 수락하기"
            @click="emit('accept', tracker)"
          >
            수락하기
          </button>
          <button
            type="button"
            class="flex-1 h-[32px] rounded-full border border-white/70 text-white text-[12px] font-semibold transition-all active:scale-95 disabled:opacity-50"
            :disabled="busy"
            aria-label="함께 기록 요청 거절하기"
            @click="emit('decline', tracker)"
          >
            거절하기
          </button>
        </div>
      </div>

      <!-- 요청 대기(내가 보낸 시작/연장 요청) — 다크 카드 + [취소하기] → 요청 취소 팝업 -->
      <div v-else-if="view === 'pending'" class="rounded-[14px] bg-apjek-cta text-white p-[14px] flex items-center gap-[12px] mt-[10px]">
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-bold leading-[18px]">아직 친구가 수락하지 않았어요</p>
          <p class="text-[11px] leading-[16px] opacity-80 mt-[2px]">
            {{ tracker.extendStatus === 'PENDING_SENT' ? '수락하면 연장된 기록이 시작돼요' : '수락하면 기록이 시작돼요' }}
          </p>
        </div>
        <button
          type="button"
          class="h-[32px] px-[14px] rounded-full bg-white text-apjek-text text-[12px] font-semibold shrink-0 transition-all active:scale-95"
          @click="cancelOpen = true"
        >
          취소하기
        </button>
      </div>
    </div>

    <!-- 하단 핑크 그라디언트 수풀 영역 — TODO(자산): 디자이너 일러스트로 교체(현재 CSS 그라디언트 플레이스홀더) -->
    <div
      class="h-[44px] w-full"
      style="background: linear-gradient(180deg, rgba(255,214,238,0) 0%, var(--color-apjek-sparkle-bg) 100%)"
      aria-hidden="true"
    />

    <!-- 중단 확인 팝업 — "기록 중단하기 / 중단한 기록은 복구할 수 없습니다." -->
    <RecordConfirmDialog
      :open="stopOpen"
      title="기록 중단하기"
      message="중단한 기록은 복구할 수 없습니다."
      confirm-text="기록 중단하기"
      :busy="busy"
      @close="stopOpen = false"
      @confirm="onStopConfirm"
    />

    <!-- 요청 취소 팝업 — "요청 취소하기 / 친구에게 요청이 함께 취소됩니다" -->
    <RecordConfirmDialog
      :open="cancelOpen"
      title="요청 취소하기"
      message="친구에게 요청이 함께 취소됩니다"
      confirm-text="중단하기"
      :busy="busy"
      @close="cancelOpen = false"
      @confirm="onCancelConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import type { HabitTrackerResponse } from '@terraworld-it/openapi-frontend'
import { habitRewardSparkle, hasExtendRequest, isCheckedToday, isPartnerStopped, type HabitView } from '~/utils/habitState'

/**
 * 습관 트래커 카드 (R7) — 제목 + X, 7일 원형(탭=체크인), 진행 텍스트/바, 상태별 하단 패널
 * (7/7 완료 · 친구 미기록 · 요청 대기 · 요청 수신), 핑크 그라디언트 수풀, 중단/요청취소 팝업(R9).
 * 표시 상태(view)는 부모가 `deriveHabitView` 로 계산해 내려준다. API 호출은 부모 책임.
 */
const props = defineProps<{
  tracker: HabitTrackerResponse
  view: HabitView
  /** 체크인/중단/완료 진행 중 여부 (페이지 전역 busy — 카드 간 공유) */
  busy?: boolean
}>()

const emit = defineEmits<{
  checkin: [tracker: HabitTrackerResponse]
  /** 기록 중단 (확인 팝업 통과) */
  stop: [tracker: HabitTrackerResponse]
  /** 요청 대기 중 요청 취소 (확인 팝업 통과) */
  cancelRequest: [tracker: HabitTrackerResponse]
  /** 친구 미기록 상태에서 응원 시트 열기 */
  cheer: [tracker: HabitTrackerResponse]
  /** 7/7 완료 후 기록 완료하기 */
  complete: [tracker: HabitTrackerResponse]
  /** 7/7 완료 후 1주일 연장 (친구면 연장 요청) */
  extend: [tracker: HabitTrackerResponse]
  /** 친구가 보낸 요청(시작/연장) 수락 */
  accept: [tracker: HabitTrackerResponse]
  /** 친구가 보낸 요청(시작/연장) 거절 */
  decline: [tracker: HabitTrackerResponse]
}>()

const DAYS: number[] = [1, 2, 3, 4, 5, 6, 7]

const stopOpen = ref<boolean>(false)
const cancelOpen = ref<boolean>(false)

const checkedToday = computed<boolean>(() => isCheckedToday(props.tracker))
const rewardSparkle = computed<number>(() => habitRewardSparkle(props.tracker))
const partnerStopped = computed<boolean>(() => isPartnerStopped(props.tracker))
const extendRequested = computed<boolean>(() => hasExtendRequest(props.tracker))

// 완주 대기(COMPLETED_UNCLAIMED) 뷰는 7/7 로 고정 표시한다.
const doneCount = computed<number>(() =>
  props.view === 'cycleDone' ? props.tracker.cycleLengthDays : props.tracker.currentStreakDays)

const canCheckIn = computed<boolean>(() =>
  (props.view === 'active' || props.view === 'partnerIdle')
  && props.tracker.status === 'ACTIVE'
  && !checkedToday.value
  && !props.busy)

function isDone(day: number): boolean {
  return day <= doneCount.value
}

// 오늘 체크인을 마쳤으면 "오늘" 점선 원은 없다 — 다음 원은 내일이지 오늘이 아니다.
function isToday(day: number): boolean {
  return props.view !== 'cycleDone' && !checkedToday.value && !isDone(day) && day === doneCount.value + 1
}

function circleClass(day: number): string {
  if (isDone(day)) return 'bg-apjek-blue text-white border-2 border-apjek-blue'
  if (isToday(day)) return 'border-2 border-dashed border-apjek-blue text-apjek-blue bg-apjek-surface'
  return 'border-2 border-apjek-blue-soft text-apjek-blue-deep bg-apjek-surface'
}

function dayAria(day: number): string {
  if (isDone(day)) return `${day}일차 완료`
  if (isToday(day)) return checkedToday.value ? `${day}일차 오늘 완료` : `${day}일차 오늘 체크인`
  return `${day}일차`
}

// 어느 원을 눌러도 "오늘 체크인" 한 번 — 과거/미래 날짜를 개별 토글하지 않는다 (댓글 #29).
function onCircleTap() {
  if (!canCheckIn.value) return
  emit('checkin', props.tracker)
}

function onStopConfirm() {
  stopOpen.value = false
  emit('stop', props.tracker)
}

function onCancelConfirm() {
  cancelOpen.value = false
  emit('cancelRequest', props.tracker)
}
</script>
