export const REMINDER_ID_START = 731000
export const REMINDER_DAYS = 14
export const REMINDER_STORAGE_PREFIX = 'tw:daily-reminder:'

export interface DailyReminderState {
  enabled: boolean
  time: string
  lastRecordDate: string | null
  prompted: boolean
}

export function defaultReminderState(): DailyReminderState {
  return { enabled: false, time: '21:00', lastRecordDate: null, prompted: false }
}

export function isReminderTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function localReminderDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function reminderSlots(now: Date, time: string, lastRecordDate: string | null): { id: number; at: Date }[] {
  if (!isReminderTime(time) || !Number.isFinite(now.getTime())) return []
  const [hours, minutes] = time.split(':').map(Number) as [number, number]
  const slots: { id: number; at: Date }[] = []
  for (let day = 0; day < REMINDER_DAYS; day++) {
    // 밀리초 덧셈 대신 기기 달력을 사용해 월말·윤년·일광 절약 시간 전환을 따른다.
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hours, minutes)
    if (at > now && localReminderDate(at) !== lastRecordDate) slots.push({ id: REMINDER_ID_START + day, at })
  }
  return slots
}

export function parseReminderState(raw: string | null): DailyReminderState {
  if (!raw) return defaultReminderState()
  try {
    const value = JSON.parse(raw) as DailyReminderState
    if (!value || typeof value.enabled !== 'boolean' || !isReminderTime(value.time)
      || typeof value.prompted !== 'boolean'
      || (value.lastRecordDate !== null && (typeof value.lastRecordDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.lastRecordDate)))) {
      return defaultReminderState()
    }
    return { enabled: value.enabled, time: value.time, lastRecordDate: value.lastRecordDate, prompted: value.prompted }
  }
  catch { return defaultReminderState() }
}
