import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { RankingResponse } from '@terraworld-it/openapi-frontend'
import RankingModal from '~/components/terrarium/RankingModal.vue'

// 랭킹 팝업 — 보유 아이템 수(type=items) 전체/친구 세그먼트, 내 순위 카드, 행 카피, 빈/실패 상태.
// SDK 는 useOpenApi 를 통째로 모킹해 getMonthlyRanking 호출 인자(type/scope)와 응답 렌더만 검증한다.
const getMonthlyRanking = vi.fn()
mockNuxtImport('useOpenApi', () => () => ({ sdk: { getMonthlyRanking }, client: {} }))

function response(overrides: Partial<RankingResponse> = {}): RankingResponse {
  return {
    type: 'items',
    scope: 'all',
    yearMonth: null,
    entries: [
      { rank: 1, userId: 'u1', nickname: '친구A', score: 80, isSelf: false },
      { rank: 2, userId: 'me', nickname: '테라 유저', score: 19, isSelf: true },
    ],
    myRank: 2,
    myScore: 19,
    ...overrides,
  }
}

async function flush(): Promise<void> {
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await nextTick()
}

describe('RankingModal', () => {
  beforeEach(() => {
    getMonthlyRanking.mockReset()
  })
  afterEach(() => {
    // Teleport 잔류 DOM + 스크롤 잠금 상태 초기화 (Modal.test 와 동일 격리 규약)
    document.body.innerHTML = ''
    document.documentElement.classList.remove('scroll-locked')
    document.documentElement.removeAttribute('data-scroll-lock-count')
  })

  it('열리면 type=items, scope=all 로 조회하고 내 순위 카드 + 행 카피를 그린다', async () => {
    getMonthlyRanking.mockResolvedValue({ data: response(), error: undefined })
    await mountSuspended(RankingModal, { props: { open: true, nickname: '닉네임폴백' } })
    await flush()

    expect(getMonthlyRanking).toHaveBeenCalledTimes(1)
    expect(getMonthlyRanking.mock.calls[0]![0].query).toMatchObject({ type: 'items', scope: 'all' })

    const body = document.body.textContent ?? ''
    // 내 순위 카드 — entries 의 본인(isSelf) 닉네임 우선
    expect(document.body.querySelector('[data-testid="ranking-my-rank"]')!.textContent).toBe('#2 테라 유저')
    expect(body).toContain('나의 보유 아이템 수 : 19')
    // 리스트 행 "#rank 닉네임 / 보유 아이템 수 : score"
    expect(document.body.querySelector('[data-testid="ranking-row-1"]')!.textContent).toContain('#1 친구A')
    expect(body).toContain('보유 아이템 수 : 80')
  })

  it('친구 랭킹 세그먼트 탭 → scope=friends 로 재조회, 빈 목록은 안내 문구', async () => {
    getMonthlyRanking
      .mockResolvedValueOnce({ data: response(), error: undefined })
      .mockResolvedValueOnce({ data: response({ scope: 'friends', entries: [], myRank: null, myScore: 0 }), error: undefined })
    await mountSuspended(RankingModal, { props: { open: true, nickname: '테라 유저' } })
    await flush()

    document.body.querySelector<HTMLButtonElement>('[data-testid="ranking-scope-friends"]')!.click()
    await flush()

    expect(getMonthlyRanking).toHaveBeenCalledTimes(2)
    expect(getMonthlyRanking.mock.calls[1]![0].query).toMatchObject({ type: 'items', scope: 'friends' })
    expect(document.body.querySelector('[data-testid="ranking-empty"]')).not.toBeNull()
    // myRank null → "순위 없음" + 닉네임 폴백(prop)
    expect(document.body.querySelector('[data-testid="ranking-my-rank"]')!.textContent).toBe('순위 없음 테라 유저')
  })

  it('조회 실패면 에러 상태 + 다시 시도 버튼', async () => {
    getMonthlyRanking.mockResolvedValue({ data: undefined, error: { code: 'INTERNAL', message: '서버 오류' } })
    await mountSuspended(RankingModal, { props: { open: true, nickname: '테라 유저' } })
    await flush()

    expect(document.body.querySelector('[data-testid="ranking-error"]')).not.toBeNull()
    expect(document.body.textContent).toContain('다시 시도')
  })
})
