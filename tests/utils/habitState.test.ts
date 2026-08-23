import { describe, it, expect } from 'vitest'
import type { HabitTrackerResponse } from '@terraworld-it/openapi-frontend'
import {
  deriveHabitView,
  habitRewardSparkle,
  hasExtendRequest,
  isCheckedToday,
  isPartnerStopped,
} from '~/utils/habitState'

// 트래커 카드 표시 상태 도출 — 서버 status / partnerStatus / extendStatus 가 SoT (아프젝 v2 R2).
function tracker(over: Partial<HabitTrackerResponse> = {}): HabitTrackerResponse {
  return {
    id: 1,
    title: '수영 강습',
    currentStreakDays: 0,
    cycleLengthDays: 7,
    completedCycles: 0,
    status: 'ACTIVE',
    lastCheckedDate: null,
    friendLinked: false,
    partnerStatus: 'NONE',
    extendStatus: 'NONE',
    rewardSparkle: 100,
    ...over,
  }
}

function pair(over: Partial<HabitTrackerResponse> = {}): HabitTrackerResponse {
  return tracker({ friendLinked: true, partnerStatus: 'ACCEPTED', partnerActive: true, rewardSparkle: 200, ...over })
}

describe('deriveHabitView', () => {
  it('solo ACTIVE 는 항상 active', () => {
    expect(deriveHabitView(tracker())).toBe('active')
    expect(deriveHabitView(tracker({ currentStreakDays: 3 }))).toBe('active')
  })

  it('COMPLETED_UNCLAIMED(7/7 완료, 보상 미수령) 는 cycleDone', () => {
    expect(deriveHabitView(tracker({ status: 'COMPLETED_UNCLAIMED' }))).toBe('cycleDone')
    expect(deriveHabitView(pair({ status: 'COMPLETED_UNCLAIMED' }))).toBe('cycleDone')
    // 연장 요청을 내가 받은 완주 트래커도 cycleDone 뷰 안에서 [수락][거절] 로 처리한다
    expect(deriveHabitView(pair({ status: 'COMPLETED_UNCLAIMED', extendStatus: 'PENDING_RECEIVED' }))).toBe('cycleDone')
  })

  it('내가 보낸 요청(시작/연장) 대기 = status PENDING → pending', () => {
    expect(deriveHabitView(pair({ status: 'PENDING', partnerStatus: 'PENDING_SENT', partnerActive: false }))).toBe('pending')
    expect(deriveHabitView(pair({ status: 'PENDING', extendStatus: 'PENDING_SENT' }))).toBe('pending')
  })

  it('친구가 보낸 요청 수신(partnerStatus PENDING_RECEIVED) 은 최우선 pendingReceived', () => {
    expect(deriveHabitView(pair({ status: 'PENDING', partnerStatus: 'PENDING_RECEIVED', partnerActive: false }))).toBe('pendingReceived')
  })

  it('ACCEPTED 인데 상대 미참여(partnerActive=false) 면 partnerIdle, 참여 중이면 active', () => {
    expect(deriveHabitView(pair({ partnerActive: false }))).toBe('partnerIdle')
    expect(deriveHabitView(pair())).toBe('active')
  })

  it('상대 중단(PARTNER_STOPPED) 은 기본 진행(active) — 안내는 카드가 별도 표시', () => {
    const t = pair({ partnerStatus: 'PARTNER_STOPPED', partnerActive: false, rewardSparkle: 100 })
    expect(deriveHabitView(t)).toBe('active')
    expect(isPartnerStopped(t)).toBe(true)
    expect(isPartnerStopped(pair())).toBe(false)
  })
})

describe('보조 규칙', () => {
  it('오늘 체크 판정은 YYYY-MM-DD 접두로 비교', () => {
    expect(isCheckedToday({ lastCheckedDate: '2026-08-23T00:00:00' }, '2026-08-23')).toBe(true)
    expect(isCheckedToday({ lastCheckedDate: '2026-08-22' }, '2026-08-23')).toBe(false)
    expect(isCheckedToday({ lastCheckedDate: null }, '2026-08-23')).toBe(false)
  })

  it('보상 표시는 서버 rewardSparkle 그대로 (solo 100 / pair 200 / 상대 중단 100)', () => {
    expect(habitRewardSparkle(tracker())).toBe(100)
    expect(habitRewardSparkle(pair())).toBe(200)
    expect(habitRewardSparkle(pair({ partnerStatus: 'PARTNER_STOPPED', rewardSparkle: 100 }))).toBe(100)
  })

  it('연장 요청 수신 여부는 extendStatus=PENDING_RECEIVED', () => {
    expect(hasExtendRequest(pair({ extendStatus: 'PENDING_RECEIVED' }))).toBe(true)
    expect(hasExtendRequest(pair({ extendStatus: 'PENDING_SENT' }))).toBe(false)
    expect(hasExtendRequest(tracker())).toBe(false)
  })
})
