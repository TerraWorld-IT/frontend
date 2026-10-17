import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { effectScope, nextTick, ref } from 'vue'
import { cancelDailyReminders, useDailyReminder } from '~/composables/useDailyReminder'
import { useAuth } from '~/composables/useAuth'
import { defaultReminderState, localReminderDate, REMINDER_DAYS, REMINDER_ID_START, REMINDER_STORAGE_PREFIX } from '~/utils/dailyReminder'

const mocks = vi.hoisted(() => ({
  native: false, platform: 'ios', available: true,
  requestPermissions: vi.fn(), cancel: vi.fn(), schedule: vi.fn(), info: vi.fn(), signOut: vi.fn(),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: {
  isNativePlatform: () => mocks.native, getPlatform: () => mocks.platform, isPluginAvailable: () => mocks.available,
} }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: mocks }))
vi.mock('~/lib/auth-client', () => ({ authClient: {
  signOut: mocks.signOut, useSession: () => ref({ data: null }), getSession: async () => ({ data: null }),
} }))
vi.mock('~/stores/user', () => ({ useUserStore: () => ({ reset: vi.fn() }) }))
vi.mock('~/stores/terrarium', () => ({ useTerrariumStore: () => ({ reset: vi.fn() }) }))
vi.mock('~/stores/homeSnapshot', () => ({ useHomeSnapshotStore: () => ({ reset: vi.fn() }) }))
mockNuxtImport('useToast', () => () => ({ info: mocks.info }))
mockNuxtImport('useNative', () => () => ({ clearPushToken: vi.fn(), isNative: false }))

const key = REMINDER_STORAGE_PREFIX + 'user-a'
const scopes: ReturnType<typeof effectScope>[] = []
function reminder(id: string | ReturnType<typeof ref<string>> = 'user-a') {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() => useDailyReminder(id))!
}
function seed(value = {}) {
  localStorage.setItem(key, JSON.stringify({ ...defaultReminderState(), ...value }))
}

beforeEach(async () => {
  await cancelDailyReminders()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 17, 12))
  localStorage.clear()
  mocks.native = true
  mocks.platform = 'ios'
  mocks.available = true
  mocks.requestPermissions.mockReset().mockResolvedValue({ display: 'granted' })
  mocks.schedule.mockReset().mockResolvedValue(undefined)
  mocks.cancel.mockReset().mockResolvedValue(undefined)
  mocks.info.mockClear()
  mocks.signOut.mockReset().mockResolvedValue({ error: null })
})
afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  localStorage.clear()
})

describe('매일 기록 알림', () => {
  it.each(['web', 'android', 'missing', 'non-native'])('%s에서는 플러그인 호출과 저장을 하지 않는다', async (platform) => {
    if (platform === 'missing') mocks.available = false
    else if (platform === 'non-native') mocks.native = false
    else mocks.platform = platform
    const value = reminder()
    expect(value.supported.value).toBe(false)
    expect(await value.update(true)).toBe(false)
    await value.refresh(true)
    await cancelDailyReminders()
    expect(value.claimPrompt()).toBe(false)
    expect(mocks.requestPermissions).not.toHaveBeenCalled()
    expect(mocks.cancel).not.toHaveBeenCalled()
    expect(mocks.schedule).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
  })

  it('사용자가 켤 때만 권한을 요청하고 단발 알림을 예약한다', async () => {
    const value = reminder()
    expect(await value.update(true)).toBe(true)
    expect(mocks.requestPermissions).toHaveBeenCalledOnce()
    const notifications = mocks.schedule.mock.calls[0]![0].notifications
    expect(notifications).toHaveLength(14)
    expect(notifications[0].schedule.at).toEqual(new Date(2026, 9, 17, 21))
    expect(notifications[0].schedule).not.toHaveProperty('every')
    expect(JSON.parse(localStorage.getItem(key)!).enabled).toBe(true)
    expect(await value.update(true, '08:30')).toBe(true)
    expect(mocks.requestPermissions).toHaveBeenCalledOnce()
    expect(reminder().state.value.time).toBe('08:30')
  })

  it('거부 시 켜짐 상태를 저장하지 않는다', async () => {
    mocks.requestPermissions.mockResolvedValue({ display: 'denied' })
    const value = reminder()
    expect(await value.update(true)).toBe(false)
    expect(value.state.value.enabled).toBe(false)
    expect(localStorage.getItem(key)).toBeNull()
    expect(mocks.schedule).not.toHaveBeenCalled()
    expect(mocks.info).toHaveBeenCalledOnce()
  })

  it('기록 후 오늘 알림을 제외하고 자체 id만 취소한다', async () => {
    seed({ enabled: true })
    const value = reminder()
    await value.refresh(true)
    const notifications = mocks.schedule.mock.calls[0]![0].notifications
    expect(notifications).toHaveLength(13)
    expect(notifications.every((item: { schedule: { at: Date } }) => localReminderDate(item.schedule.at) !== '2026-10-17')).toBe(true)
    expect(mocks.cancel).toHaveBeenCalledWith({ notifications: Array.from({ length: REMINDER_DAYS }, (_, index) => ({ id: REMINDER_ID_START + index })) })
    expect(reminder().state.value.lastRecordDate).toBe('2026-10-17')
  })

  it('깨진 저장값은 조용히 기본 상태로 복구하고 다시 켤 수 있다', async () => {
    localStorage.setItem(key, '{broken')
    const value = reminder()
    await expect(value.refresh()).resolves.toBeUndefined()
    expect(mocks.info).not.toHaveBeenCalled()
    expect(value.state.value).toEqual(defaultReminderState())
    expect(await value.update(true)).toBe(true)
    expect(JSON.parse(localStorage.getItem(key)!).enabled).toBe(true)
    expect(mocks.info).not.toHaveBeenCalled()
  })

  it('저장소 읽기 예외는 refresh에서 조용히 기본 상태로 처리한다', async () => {
    vi.stubGlobal('localStorage', { getItem() { throw new Error('denied') } })
    const value = reminder()
    await expect(value.refresh()).resolves.toBeUndefined()
    expect(mocks.info).not.toHaveBeenCalled()
    expect(value.state.value).toEqual(defaultReminderState())
  })

  it('끄기와 로그아웃은 자체 예약을 취소하고 로그아웃은 선호를 보존한다', async () => {
    seed({ enabled: true })
    const value = reminder()
    await cancelDailyReminders()
    expect(mocks.cancel).toHaveBeenCalledOnce()
    expect(JSON.parse(localStorage.getItem(key)!).enabled).toBe(true)
    expect(await value.update(false)).toBe(true)
    expect(value.state.value.enabled).toBe(false)
    expect(mocks.schedule).not.toHaveBeenCalled()
    expect(mocks.requestPermissions).not.toHaveBeenCalled()
  })

  it('실제 로그아웃 경로에서 인증 종료 전에 알림을 취소한다', async () => {
    seed({ enabled: true })
    mocks.signOut.mockImplementation(async () => {
      expect(mocks.cancel).toHaveBeenCalledOnce()
      return { error: null }
    })
    await useAuth().signOutAndClear()
    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(mocks.schedule).not.toHaveBeenCalled()
  })

  it('계정을 바꾸면 사용자별 시각·제안 이력을 다시 읽는다', async () => {
    seed({ enabled: true, time: '08:30', prompted: true })
    const userId = ref('user-a')
    const value = reminder(userId)
    expect(value.state.value.time).toBe('08:30')
    userId.value = 'user-b'
    await nextTick()
    expect(value.state.value).toEqual(defaultReminderState())
    expect(value.claimPrompt()).toBe(true)
    userId.value = 'user-a'
    await nextTick()
    expect(value.state.value.time).toBe('08:30')
    expect(value.claimPrompt()).toBe(false)
  })

  it('상태 쓰기 실패 시 예약을 되돌리고 기록 저장 보조 호출은 성공한다', async () => {
    const original = localStorage
    vi.stubGlobal('localStorage', {
      getItem: (name: string) => original.getItem(name),
      setItem() { throw new Error('storage full') },
    })
    const value = reminder()
    expect(await value.update(true)).toBe(false)
    expect(value.state.value.enabled).toBe(false)
    expect(mocks.cancel).toHaveBeenCalledTimes(2)
    await expect(value.refresh(true)).resolves.toBeUndefined()
    expect(value.claimPrompt()).toBe(false)
  })

  it.each(['schedule', 'cancel'] as const)('%s 실패 시 기존 저장값과 토글을 유지한다', async (method) => {
    seed({ enabled: true, time: '21:00' })
    mocks[method].mockRejectedValueOnce(new Error('native failure'))
    const value = reminder()
    expect(await value.update(true, '08:00')).toBe(false)
    expect(value.state.value.enabled).toBe(true)
    expect(value.state.value.time).toBe('21:00')
    expect(mocks.info).toHaveBeenCalledOnce()
  })

  it('예약 실패 시 새 켜짐을 저장하지 않는다', async () => {
    mocks.schedule.mockRejectedValueOnce(new Error('schedule failed'))
    const value = reminder()
    expect(await value.update(true)).toBe(false)
    expect(value.state.value.enabled).toBe(false)
    expect(mocks.info).toHaveBeenCalledOnce()
  })

  it('권한 대기 중 로그아웃하면 늦은 권한 응답으로 예약하지 않는다', async () => {
    let resolve!: (value: { display: string }) => void
    mocks.requestPermissions.mockReturnValue(new Promise((done) => { resolve = done }))
    const value = reminder()
    const enabled = value.update(true)
    await vi.waitFor(() => expect(mocks.requestPermissions).toHaveBeenCalledOnce())
    const logout = cancelDailyReminders()
    resolve({ display: 'granted' })
    expect(await enabled).toBe(false)
    await logout
    expect(mocks.schedule).not.toHaveBeenCalled()
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('사용자별 제안은 표시를 확보할 때 한 번만 저장한다', () => {
    const first = reminder()
    expect(first.claimPrompt()).toBe(true)
    expect(first.claimPrompt()).toBe(false)
    expect(reminder().claimPrompt()).toBe(false)
    expect(reminder('user-b').claimPrompt()).toBe(true)
    seed({ enabled: true })
    expect(reminder().claimPrompt()).toBe(false)
  })

  it('저장소 오류와 플러그인 예외는 보조 기능 밖으로 전파하지 않는다', async () => {
    vi.stubGlobal('localStorage', {
      getItem() { throw new Error('denied') },
      setItem() { throw new Error('denied') },
    })
    const value = reminder()
    await expect(value.refresh(true)).resolves.toBeUndefined()
    await expect(value.update(true)).resolves.toBe(false)
    expect(value.claimPrompt()).toBe(false)
    mocks.cancel.mockRejectedValue(new Error('cancel failed'))
    await expect(cancelDailyReminders()).resolves.toBeUndefined()
  })
})
