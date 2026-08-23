import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { HabitTrackerResponse } from '@terraworld-it/openapi-frontend'
import HabitTrackerCard from '~/components/record/HabitTrackerCard.vue'
import { kstTodayKey } from '~/utils/habitState'

// 7일 원형의 "오늘" 점선 표시 — 오늘 체크인을 마치면 다음 원은 내일이지 오늘이 아니다.
function tracker(overrides: Partial<HabitTrackerResponse> = {}): HabitTrackerResponse {
  return {
    id: 1,
    title: '물 마시기',
    currentStreakDays: 1,
    cycleLengthDays: 7,
    completedCycles: 0,
    status: 'ACTIVE',
    lastCheckedDate: null,
    friendLinked: false,
    partnerStatus: 'NONE',
    extendStatus: 'NONE',
    rewardSparkle: 100,
    partnerCheckedToday: false,
    ...overrides,
  } as HabitTrackerResponse
}

function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return kstTodayKey(d)
}

describe('HabitTrackerCard 오늘 표시', () => {
  it('오늘 아직 체크인 전이면 다음 원이 "오늘 체크인" 이다', async () => {
    const wrapper = await mountSuspended(HabitTrackerCard, {
      props: { tracker: tracker({ lastCheckedDate: yesterdayKey() }), view: 'active' },
    })
    expect(wrapper.find('[aria-label="2일차 오늘 체크인"]').exists()).toBe(true)
  })

  it('오늘 체크인을 마쳤으면 "오늘" 원이 없고 다음 원은 그냥 다음 일차다', async () => {
    const wrapper = await mountSuspended(HabitTrackerCard, {
      props: { tracker: tracker({ lastCheckedDate: kstTodayKey() }), view: 'active' },
    })
    expect(wrapper.find('[aria-label="1일차 완료"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="2일차"]').exists()).toBe(true)
    expect(wrapper.findAll('[aria-label*="오늘"]').length).toBe(0)
  })
})
