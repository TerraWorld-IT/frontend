import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { RecordResponse } from '@terraworld-it/openapi-frontend'
import RecordCard from '~/components/record/RecordCard.vue'

// 최근 기록 카드 날짜·시각 — 날짜는 recordedDate(YYYY-MM-DD) 그대로, 시각은 createdAt 에서.
// `new Date('YYYY-MM-DD')` 의 UTC 자정 해석으로 KST 에서 "09:00" 이 찍히던 회귀를 막는다.
function record(overrides: Partial<RecordResponse> = {}): RecordResponse {
  return {
    id: 1,
    categoryId: 1,
    categoryName: '독서',
    categoryEmoji: '📖',
    dailyType: 'DIARY',
    memo: '오늘의 일기',
    recordedDate: '2026-08-23',
    createdAt: new Date(2026, 7, 23, 19, 4, 3).toISOString(),
    ...overrides,
  } as RecordResponse
}

describe('RecordCard 날짜 표기', () => {
  it('날짜는 recordedDate, 시각은 createdAt 로컬 시각을 쓴다', async () => {
    const wrapper = await mountSuspended(RecordCard, { props: { record: record() } })
    expect(wrapper.text()).toContain('2026.08.23 19:04')
    expect(wrapper.text()).not.toContain('09:00')
  })

  it('recordedDate 와 createdAt 의 날짜가 다르면 recordedDate 를 우선한다', async () => {
    const wrapper = await mountSuspended(RecordCard, { props: { record: record({ recordedDate: '2026-08-24' }) } })
    expect(wrapper.text()).toContain('2026.08.24 19:04')
  })

  it('createdAt 이 비정상이면 날짜만 보여 준다', async () => {
    const wrapper = await mountSuspended(RecordCard, { props: { record: record({ createdAt: 'not-a-date' }) } })
    expect(wrapper.text()).toContain('2026.08.23')
    expect(wrapper.text()).not.toMatch(/\d{2}:\d{2}/)
  })
})
