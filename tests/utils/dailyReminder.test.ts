import { describe, expect, it } from 'vitest'
import { defaultReminderState, isReminderTime, localReminderDate, parseReminderState, reminderSlots, REMINDER_DAYS, REMINDER_ID_START } from '~/utils/dailyReminder'

describe('기기 로컬 날짜별 단발 알림', () => {
  it('오늘 시각 전에는 14일, 지난 뒤에는 내일부터 13일을 예약한다', () => {
    const before = reminderSlots(new Date(2026, 9, 17, 20), '21:00', null)
    expect(before).toHaveLength(14)
    expect(before[0]!.at).toEqual(new Date(2026, 9, 17, 21))
    expect(reminderSlots(new Date(2026, 9, 17, 21), '21:00', null)).toHaveLength(13)
  })

  it('오늘 기록한 경우 오늘 몫을 제외한다', () => {
    const slots = reminderSlots(new Date(2026, 9, 17, 10), '21:00', '2026-10-17')
    expect(slots).toHaveLength(13)
    expect(localReminderDate(slots[0]!.at)).toBe('2026-10-18')
  })

  it('월말·윤년·연말과 여러 시각에서 예약 불변조건을 지킨다', () => {
    // 의존성 추가 없이 달력 경계와 유효 시각 전 영역을 결정적으로 순회한다.
    for (const date of [new Date(2024, 1, 28, 12), new Date(2026, 11, 31, 12), new Date(2026, 2, 7, 12), new Date(2026, 9, 31, 12)]) {
      for (let minute = 0; minute < 1440; minute++) {
        const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
        const today = localReminderDate(date)
        const slots = reminderSlots(date, time, today)
        expect(slots).toHaveLength(13)
        expect(new Set(slots.map(slot => localReminderDate(slot.at))).size).toBe(slots.length)
        for (const slot of slots) {
          expect(slot.at.getTime()).toBeGreaterThan(date.getTime())
          // 존재하지 않는 시각은 기기 달력이 다음 유효 시각으로 보정할 수 있다.
          if (slot.at.getTimezoneOffset() === date.getTimezoneOffset()) {
            expect(slot.at.getHours() * 60 + slot.at.getMinutes()).toBe(minute)
          }
          expect(localReminderDate(slot.at)).not.toBe(today)
          expect(slot.id).toBeGreaterThanOrEqual(REMINDER_ID_START)
          expect(slot.id).toBeLessThan(REMINDER_ID_START + REMINDER_DAYS)
        }
        expect(localReminderDate(date)).toBe(today)
      }
    }
  }, 30000)

  it.each(['', '9:00', '24:00', '21:60', '12:00:00', null, 2100])('유효하지 않은 시각 %s를 거절한다', (time) => {
    expect(isReminderTime(time)).toBe(false)
    expect(reminderSlots(new Date(), String(time), null)).toEqual([])
  })

  it('사용자 상태를 검증하고 없으면 기본값으로 시작한다', () => {
    expect(parseReminderState(null)).toEqual(defaultReminderState())
    const value = { enabled: true, time: '08:30', lastRecordDate: '2026-10-17', prompted: true }
    expect(parseReminderState(JSON.stringify(value))).toEqual(value)
    for (const raw of ['null', '{}', '{broken', JSON.stringify({ ...value, time: '25:00' }), JSON.stringify({ ...value, lastRecordDate: 123 })]) {
      expect(parseReminderState(raw)).toEqual(defaultReminderState())
    }
  })
})
