import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { HabitTrackerResponse } from '@terraworld-it/openapi-frontend'

// useHabits — SDK(useOpenApi) 를 통째로 모킹해 목록 갱신 규칙(append / in-place 교체 / 제거)과
// 409 코드 passthrough 를 검증한다. 상태는 서버 응답이 SoT 다.
const sdk = {
  listHabits: vi.fn(),
  createHabit: vi.fn(),
  checkInHabit: vi.fn(),
  stopHabit: vi.fn(),
  acceptHabit: vi.fn(),
  declineHabit: vi.fn(),
  completeHabit: vi.fn(),
  extendHabit: vi.fn(),
}
mockNuxtImport('useOpenApi', () => () => ({ sdk, client: {} }))

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
    partnerCheckedToday: false,
    ...over,
  }
}

function ok<T>(data: T, status = 200) {
  return { data, error: undefined, response: { status } }
}
function fail(status: number, code: string) {
  return { data: undefined, error: { code, message: code }, response: { status } }
}

async function loaded(items: HabitTrackerResponse[]) {
  const { useHabits } = await import('~/composables/useHabits')
  const habits = useHabits()
  sdk.listHabits.mockResolvedValueOnce(ok({ trackers: items }))
  await habits.load()
  return habits
}

describe('useHabits', () => {
  beforeEach(() => {
    for (const fn of Object.values(sdk)) fn.mockReset()
  })

  it('load — 성공 시 trackers 교체, 실패 시 loadError 만 세우고 목록은 유지', async () => {
    const habits = await loaded([tracker({ id: 1 }), tracker({ id: 2 })])
    expect(habits.trackers.value.map(t => t.id)).toEqual([1, 2])
    expect(habits.loaded.value).toBe(true)
    expect(habits.loadError.value).toBe(false)

    sdk.listHabits.mockResolvedValueOnce(fail(500, 'INTERNAL'))
    await habits.load()
    expect(habits.loadError.value).toBe(true)
    expect(habits.trackers.value.map(t => t.id)).toEqual([1, 2])
  })

  it('create — 성공 시 응답 트래커를 append, 409 HABIT_LIMIT_EXCEEDED 는 status/code 그대로 전달', async () => {
    const habits = await loaded([tracker({ id: 1 })])
    sdk.createHabit.mockResolvedValueOnce(ok(tracker({ id: 9, title: '독서' }), 201))
    const created = await habits.create('독서', null)
    expect(sdk.createHabit.mock.calls[0]![0].body).toEqual({ title: '독서', friendUserId: null })
    expect(created).toEqual({ data: expect.objectContaining({ id: 9 }), status: 201, code: null })
    expect(habits.trackers.value.map(t => t.id)).toEqual([1, 9])

    sdk.createHabit.mockResolvedValueOnce(fail(409, 'HABIT_LIMIT_EXCEEDED'))
    const dup = await habits.create('또 하나', 'friend-1')
    expect(dup).toEqual({ data: null, status: 409, code: 'HABIT_LIMIT_EXCEEDED' })
    expect(habits.trackers.value).toHaveLength(2)
  })

  it('checkIn — 응답 tracker 로 해당 항목만 in-place 교체(순서 유지), 409 HABIT_NOT_ACTIVE passthrough', async () => {
    const habits = await loaded([tracker({ id: 1 }), tracker({ id: 2 })])
    sdk.checkInHabit.mockResolvedValueOnce(ok({ tracker: tracker({ id: 2, currentStreakDays: 3 }), cycleCompleted: false }))
    const res = await habits.checkIn(2)
    expect(sdk.checkInHabit.mock.calls[0]![0].path).toEqual({ trackerId: 2 })
    expect(res.data?.tracker.currentStreakDays).toBe(3)
    expect(habits.trackers.value.map(t => [t.id, t.currentStreakDays])).toEqual([[1, 0], [2, 3]])

    sdk.checkInHabit.mockResolvedValueOnce(fail(409, 'HABIT_NOT_ACTIVE'))
    expect(await habits.checkIn(1)).toEqual({ data: null, status: 409, code: 'HABIT_NOT_ACTIVE' })
  })

  it('accept — 수락된 트래커로 교체 / decline — 목록에서 제거', async () => {
    const pending = tracker({ id: 5, status: 'PENDING', friendLinked: true, partnerStatus: 'PENDING_RECEIVED' })
    const habits = await loaded([tracker({ id: 1 }), pending])
    sdk.acceptHabit.mockResolvedValueOnce(ok(tracker({ id: 5, friendLinked: true, partnerStatus: 'ACCEPTED' })))
    await habits.accept(5)
    expect(habits.trackers.value.find(t => t.id === 5)?.partnerStatus).toBe('ACCEPTED')
    expect(habits.trackers.value).toHaveLength(2)

    sdk.declineHabit.mockResolvedValueOnce(ok(undefined, 204))
    const declined = await habits.decline(5)
    expect(declined).toEqual({ data: true, status: 204, code: null })
    expect(habits.trackers.value.map(t => t.id)).toEqual([1])

    // 실패하면 목록을 건드리지 않는다
    sdk.declineHabit.mockResolvedValueOnce(fail(404, 'HABIT_NOT_FOUND'))
    expect(await habits.decline(1)).toEqual({ data: null, status: 404, code: 'HABIT_NOT_FOUND' })
    expect(habits.trackers.value.map(t => t.id)).toEqual([1])
  })

  it('complete — 보상 수령 후 트래커 제거 / extend — 새 사이클 트래커로 교체(upsert)', async () => {
    const done = tracker({ id: 3, status: 'COMPLETED_UNCLAIMED', currentStreakDays: 7 })
    const habits = await loaded([tracker({ id: 1 }), done])
    sdk.completeHabit.mockResolvedValueOnce(ok({ tracker: tracker({ id: 3, status: 'COMPLETED' }), sparkleGranted: 100, alreadyClaimed: false }))
    const completed = await habits.complete(3)
    expect(completed.data?.sparkleGranted).toBe(100)
    expect(habits.trackers.value.map(t => t.id)).toEqual([1])

    const done2 = tracker({ id: 4, status: 'COMPLETED_UNCLAIMED', currentStreakDays: 7 })
    sdk.listHabits.mockResolvedValueOnce(ok({ trackers: [tracker({ id: 1 }), done2] }))
    await habits.load()
    sdk.extendHabit.mockResolvedValueOnce(ok({ tracker: tracker({ id: 4, currentStreakDays: 0, completedCycles: 1 }), sparkleGranted: 100, alreadyClaimed: false }))
    const extended = await habits.extend(4)
    expect(extended.data?.tracker.completedCycles).toBe(1)
    expect(habits.trackers.value.map(t => [t.id, t.currentStreakDays, t.completedCycles])).toEqual([[1, 0, 0], [4, 0, 1]])

    // 응답 트래커 id 가 바뀌어도(새 사이클 재생성) 기존 id 자리에 들어간다
    sdk.extendHabit.mockResolvedValueOnce(ok({ tracker: tracker({ id: 40, completedCycles: 2 }), sparkleGranted: 100, alreadyClaimed: false }))
    await habits.extend(4)
    expect(habits.trackers.value.map(t => t.id)).toEqual([1, 40])
  })

  it('stop — 성공 시 제거 + true, 실패/네트워크 예외는 false 로 정규화', async () => {
    const habits = await loaded([tracker({ id: 1 }), tracker({ id: 2 })])
    sdk.stopHabit.mockResolvedValueOnce(ok(undefined, 204))
    expect(await habits.stop(2)).toBe(true)
    expect(habits.trackers.value.map(t => t.id)).toEqual([1])

    sdk.stopHabit.mockRejectedValueOnce(new Error('network'))
    expect(await habits.stop(1)).toBe(false)
    expect(habits.trackers.value.map(t => t.id)).toEqual([1])
  })
})
