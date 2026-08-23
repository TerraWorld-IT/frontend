import type { HabitTrackerResponse } from '@terraworld-it/openapi-frontend'

/**
 * 습관 트래커 표시 상태 도출 (Figma R7 — 트래커 카드 상태 8종 중 FE 가 구분하는 4종).
 *
 * 새 상태 필드(partnerStatus / extendStatus / rewardSparkle / cycleCompletedAt)는
 * N-B5 스펙이 아직 머지되지 않아 SDK 타입에 없다. optional 확장 타입으로 자리만 두고,
 * 값이 없으면 현행 필드(friendLinked / partnerActive / currentStreakDays / completedCycles)로
 * 폴리필한다. 순수 함수라 단위 테스트가 규칙을 고정한다.
 */

// TODO(N-B5 스펙 머지 후): SDK HabitTrackerResponse 에 아래 필드가 생기면 이 확장 타입을 제거한다.
export type HabitPartnerStatus =
  | 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'PARTNER_STOPPED'
export type HabitExtendStatus = 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED'

export type HabitTrackerV2 = HabitTrackerResponse & {
  partnerStatus?: HabitPartnerStatus | null
  extendStatus?: HabitExtendStatus | null
  /** 완주 예정 보상(100 solo / 200 friend) — 없으면 HABIT_REWARD_SPARKLE 폴백 */
  rewardSparkle?: number | null
  cycleCompletedAt?: string | null
}

/** 표시용 보상 수치 폴백 — 계약 §5 (solo 100 / friend 200). 서버 값이 오면 그쪽이 우선. */
export const HABIT_REWARD_SPARKLE = { solo: 100, friend: 200 } as const

export type HabitView =
  /** 친구 요청 대기 — 트래커 흐림 + X 는 요청 취소 */
  | 'pending'
  /** 7/7 완료 — [기록 완료하기][기록 1주일 연장 하기] */
  | 'cycleDone'
  /** 친구가 아직 기록하지 않음 — 응원 카드 */
  | 'partnerIdle'
  /** 기본 진행 */
  | 'active'

/** KST 기준 오늘 날짜 키(YYYY-MM-DD) — 서버 lastCheckedDate 와 같은 규약 */
export function kstTodayKey(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000)
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`
}

export function isCheckedToday(tracker: Pick<HabitTrackerResponse, 'lastCheckedDate'>, todayKey: string = kstTodayKey()): boolean {
  return !!tracker.lastCheckedDate && tracker.lastCheckedDate.slice(0, 10) === todayKey
}

export function habitRewardSparkle(tracker: HabitTrackerV2): number {
  if (typeof tracker.rewardSparkle === 'number' && tracker.rewardSparkle > 0) return tracker.rewardSparkle
  return tracker.friendLinked ? HABIT_REWARD_SPARKLE.friend : HABIT_REWARD_SPARKLE.solo
}

/**
 * @param cycleDone 이번 사이클 완주 마커(useHabits 가 체크인 응답 cycleCompleted 로 기록).
 *   현행 백엔드는 7일째 체크인에서 streak 를 0 으로 되돌리고 ACTIVE 를 유지하므로
 *   서버 상태만으로는 "방금 완주"를 구분할 수 없다 — 마커가 그 간극을 메운다.
 */
export function deriveHabitView(
  tracker: HabitTrackerV2,
  opts: { cycleDone: boolean; todayKey?: string },
): HabitView {
  if (tracker.status === 'COMPLETED' || opts.cycleDone) return 'cycleDone'
  if (!tracker.friendLinked) return 'active'

  const partnerStatus = tracker.partnerStatus ?? null
  if (partnerStatus === 'PENDING_SENT') return 'pending'
  if (partnerStatus === 'ACCEPTED') return tracker.partnerActive === false ? 'partnerIdle' : 'active'

  // 폴리필 — partnerStatus 부재 시: 상대가 아직 같은 링크로 트래커를 만들지 않았고(partnerActive=false)
  // 내 기록도 전혀 없는 첫 사이클이면 "요청 대기", 내 기록이 있으면 "친구 미기록".
  if (tracker.partnerActive === false) {
    const untouched = tracker.currentStreakDays === 0
      && tracker.completedCycles === 0
      && !isCheckedToday(tracker, opts.todayKey)
    return untouched ? 'pending' : 'partnerIdle'
  }
  return 'active'
}
