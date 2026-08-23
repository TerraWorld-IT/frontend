import { describe, it, expect } from 'vitest'
import { deriveHabitView, habitRewardSparkle, isCheckedToday, type HabitTrackerV2 } from '~/utils/habitState'

// 트래커 카드 표시 상태 도출 — 스펙(partnerStatus) 우선, 부재 시 현행 필드 폴리필.
function tracker(over: Partial<HabitTrackerV2> = {}): HabitTrackerV2 {
  return {
    id: 1,
    title: '수영 강습',
    currentStreakDays: 0,
    cycleLengthDays: 7,
    completedCycles: 0,
    status: 'ACTIVE',
    lastCheckedDate: null,
    friendLinked: false,
    ...over,
  }
}

describe('deriveHabitView', () => {
  const today = '2026-08-23'

  it('solo 는 완주 마커가 없으면 항상 active', () => {
    expect(deriveHabitView(tracker(), { cycleDone: false, todayKey: today })).toBe('active')
    expect(deriveHabitView(tracker({ currentStreakDays: 3 }), { cycleDone: false, todayKey: today })).toBe('active')
  })

  it('완주 마커 또는 COMPLETED 는 cycleDone 이 최우선', () => {
    expect(deriveHabitView(tracker(), { cycleDone: true, todayKey: today })).toBe('cycleDone')
    expect(deriveHabitView(tracker({ status: 'COMPLETED', friendLinked: true, partnerActive: false }), { cycleDone: false, todayKey: today })).toBe('cycleDone')
  })

  it('친구 폴리필 — 내 기록 0 이고 상대 미참여면 pending, 내 기록이 있으면 partnerIdle', () => {
    const base = { friendLinked: true, partnerActive: false }
    expect(deriveHabitView(tracker(base), { cycleDone: false, todayKey: today })).toBe('pending')
    expect(deriveHabitView(tracker({ ...base, currentStreakDays: 1, lastCheckedDate: today }), { cycleDone: false, todayKey: today })).toBe('partnerIdle')
    // 완주 후 새 사이클(streak 0, completedCycles 1)은 요청 대기로 오판하지 않는다
    expect(deriveHabitView(tracker({ ...base, completedCycles: 1 }), { cycleDone: false, todayKey: today })).toBe('partnerIdle')
    expect(deriveHabitView(tracker({ friendLinked: true, partnerActive: true }), { cycleDone: false, todayKey: today })).toBe('active')
  })

  it('partnerStatus 가 오면 폴리필보다 우선한다', () => {
    expect(deriveHabitView(tracker({ friendLinked: true, partnerActive: true, partnerStatus: 'PENDING_SENT' }), { cycleDone: false, todayKey: today })).toBe('pending')
    expect(deriveHabitView(tracker({ friendLinked: true, partnerActive: false, partnerStatus: 'ACCEPTED' }), { cycleDone: false, todayKey: today })).toBe('partnerIdle')
    expect(deriveHabitView(tracker({ friendLinked: true, partnerActive: true, partnerStatus: 'ACCEPTED' }), { cycleDone: false, todayKey: today })).toBe('active')
  })
})

describe('보조 규칙', () => {
  it('오늘 체크 판정은 YYYY-MM-DD 접두로 비교', () => {
    expect(isCheckedToday({ lastCheckedDate: '2026-08-23T00:00:00' }, '2026-08-23')).toBe(true)
    expect(isCheckedToday({ lastCheckedDate: '2026-08-22' }, '2026-08-23')).toBe(false)
    expect(isCheckedToday({ lastCheckedDate: null }, '2026-08-23')).toBe(false)
  })

  it('보상 표시는 서버 rewardSparkle 우선, 없으면 solo 100 / friend 200', () => {
    expect(habitRewardSparkle(tracker())).toBe(100)
    expect(habitRewardSparkle(tracker({ friendLinked: true }))).toBe(200)
    expect(habitRewardSparkle(tracker({ rewardSparkle: 150 }))).toBe(150)
  })
})
