import type { HabitTrackerResponse } from '@terraworld-it/openapi-frontend'

/**
 * 습관 트래커 표시 상태 도출 (Figma R7 — 트래커 카드 상태 중 FE 가 구분하는 5종).
 *
 * 서버 상태(status / partnerStatus / extendStatus)가 SoT 다 — 아프젝 v2 계약(rev2 R2).
 * 순수 함수라 단위 테스트가 규칙을 고정한다.
 */

/** 생성 시트 안내 문구용 보상 수치 — 계약 §5 (solo 100 / friend 200). 트래커가 생기면 서버 rewardSparkle 이 우선. */
export const HABIT_REWARD_SPARKLE = { solo: 100, friend: 200 } as const

export type HabitView =
  /** 내가 보낸 친구 요청(시작/연장) 대기 — 트래커 흐림 + X 는 요청 취소 */
  | 'pending'
  /** 친구가 보낸 함께 기록 요청을 내가 받음 — [수락하기][거절하기] */
  | 'pendingReceived'
  /** 7/7 완료(보상 미수령) — [기록 완료하기][기록 1주일 연장 하기] */
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

/** 완주 시 지급(예정) 반짝이 — 서버 rewardSparkle (solo 100 / pair 200 / 상대 중단 100). */
export function habitRewardSparkle(tracker: Pick<HabitTrackerResponse, 'rewardSparkle'>): number {
  return tracker.rewardSparkle
}

/** 상대가 진행 중 중단 — 나는 계속 기록·완주 가능, 보상은 solo 값. */
export function isPartnerStopped(tracker: Pick<HabitTrackerResponse, 'partnerStatus'>): boolean {
  return tracker.partnerStatus === 'PARTNER_STOPPED'
}

/** 상대가 보낸 연장 요청을 내가 수락/거절해야 하는 상태. */
export function hasExtendRequest(tracker: Pick<HabitTrackerResponse, 'extendStatus'>): boolean {
  return tracker.extendStatus === 'PENDING_RECEIVED'
}

/**
 * 카드 표시 상태 — 우선순위: 수신 요청 > 완주 대기 > 내 요청 대기 > 친구 미기록 > 진행.
 * 연장 요청 수신(extendStatus=PENDING_RECEIVED)은 보통 내 트래커도 완주 상태라 cycleDone 뷰 안에서
 * [수락][거절] 행으로 처리한다(`hasExtendRequest`).
 */
export function deriveHabitView(
  tracker: Pick<HabitTrackerResponse, 'status' | 'friendLinked' | 'partnerStatus' | 'partnerActive'>,
): HabitView {
  if (tracker.partnerStatus === 'PENDING_RECEIVED') return 'pendingReceived'
  if (tracker.status === 'COMPLETED_UNCLAIMED' || tracker.status === 'COMPLETED') return 'cycleDone'
  if (tracker.status === 'PENDING') return 'pending'
  if (tracker.friendLinked && tracker.partnerStatus === 'ACCEPTED' && tracker.partnerActive === false) return 'partnerIdle'
  return 'active'
}
