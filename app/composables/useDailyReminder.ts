import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { defaultReminderState, isReminderTime, localReminderDate, parseReminderState, reminderSlots, REMINDER_DAYS, REMINDER_ID_START, REMINDER_STORAGE_PREFIX, type DailyReminderState } from '~/utils/dailyReminder'

let operations: Promise<unknown> = Promise.resolve()
let sessionEpoch = 0

export function supportsDailyReminder(): boolean {
  try {
    return import.meta.client && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('LocalNotifications')
  }
  catch { return false }
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = operations.then(operation)
  operations = result.catch(() => {})
  return result
}

async function cancelOwnedReminders(): Promise<void> {
  await LocalNotifications.cancel({ notifications: Array.from({ length: REMINDER_DAYS }, (_, index) => ({ id: REMINDER_ID_START + index })) })
}

// 로그아웃 중 권한 응답이 예약을 되살리지 않도록 대기열에 넣기 전에 세대를 갱신한다.
export async function cancelDailyReminders(): Promise<void> {
  sessionEpoch++
  if (!supportsDailyReminder()) return
  await enqueue(cancelOwnedReminders).catch(() => {})
}

export function useDailyReminder(userId: MaybeRefOrGetter<string | null | undefined>) {
  const { $i18n } = useNuxtApp()
  const toast = useToast()
  const state = ref<DailyReminderState>(defaultReminderState())
  const busy = ref<boolean>(false)
  const supported = computed<boolean>(() => supportsDailyReminder() && !!toValue(userId))

  function read(id: string): DailyReminderState {
    try { return parseReminderState(localStorage.getItem(REMINDER_STORAGE_PREFIX + id)) }
    catch { return defaultReminderState() }
  }

  function write(id: string, value: DailyReminderState) {
    localStorage.setItem(REMINDER_STORAGE_PREFIX + id, JSON.stringify(value))
    if (toValue(userId) === id) state.value = value
  }

  function reload() {
    state.value = defaultReminderState()
    if (!supported.value) return
    try { state.value = read(toValue(userId)!) }
    catch { /* 저장소 접근 실패는 화면에 영향을 주지 않는다. */ }
  }

  watch(() => toValue(userId), reload, { immediate: true })

  async function schedule(value: DailyReminderState) {
    await cancelOwnedReminders()
    if (!value.enabled) return
    const notifications = reminderSlots(new Date(), value.time, value.lastRecordDate).map(slot => ({
      id: slot.id, title: $i18n.t('dailyReminder.notificationTitle'), body: $i18n.t('dailyReminder.notificationBody'), schedule: { at: slot.at },
    }))
    if (notifications.length) await LocalNotifications.schedule({ notifications })
  }

  async function update(enabled: boolean, time: string = state.value.time): Promise<boolean> {
    if (!supported.value || !isReminderTime(time) || busy.value) return false
    const id = toValue(userId)!
    const epoch = sessionEpoch
    busy.value = true
    try {
      return await enqueue(async () => {
        if (epoch !== sessionEpoch || toValue(userId) !== id) return false
        const previous = read(id)
        if (enabled && !previous.enabled) {
          const permission = await LocalNotifications.requestPermissions()
          if (epoch !== sessionEpoch || toValue(userId) !== id) return false
          if (permission.display !== 'granted') {
            toast.info($i18n.t('dailyReminder.permissionDenied'))
            return false
          }
        }
        const next = { ...previous, enabled, time }
        try {
          await schedule(next)
          if (epoch !== sessionEpoch || toValue(userId) !== id) {
            await cancelOwnedReminders()
            return false
          }
          write(id, next)
          return true
        }
        catch {
          // 실패한 변경은 저장하지 않고 기존 예약을 가능한 범위에서 복원한다.
          await schedule(previous).catch(() => {})
          throw new Error('Reminder update failed')
        }
      })
    }
    catch {
      toast.info($i18n.t('dailyReminder.updateFailed'))
      return false
    }
    finally {
      busy.value = false
      reload()
    }
  }

  async function refresh(recorded: boolean = false): Promise<void> {
    if (!supported.value) return
    const id = toValue(userId)!
    const epoch = sessionEpoch
    await enqueue(async () => {
      if (epoch !== sessionEpoch || toValue(userId) !== id) return
      const value = read(id)
      if (recorded) {
        value.lastRecordDate = localReminderDate(new Date())
        write(id, value)
      }
      if (value.enabled) await schedule(value)
      if (epoch !== sessionEpoch || toValue(userId) !== id) await cancelOwnedReminders()
      else state.value = value
    }).catch(() => {})
  }

  function claimPrompt(): boolean {
    if (!supported.value) return false
    try {
      const id = toValue(userId)!
      const value = read(id)
      if (value.enabled || value.prompted) return false
      write(id, { ...value, prompted: true })
      return true
    }
    catch { return false }
  }

  return { state, busy, supported, update, refresh, claimPrompt }
}
