import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { RankingResponse } from '@terraworld-it/openapi-frontend'
import RankingModal from '~/components/terrarium/RankingModal.vue'
import HabitCreateSheet from '~/components/record/HabitCreateSheet.vue'
import FriendsPage from '~/pages/friends/index.vue'
import { BLOCKS_STORAGE_PREFIX } from '~/composables/useUserBlocks'

// 차단(App Store 1.2) — 차단한 회원이 랭킹(전체·친구)·친구 목록·습관 친구 선택에서 숨겨지고,
// 신고·차단 시트로 차단하면 즉시 사라지며, 신고는 사유가 담긴 메일과 복사 안내를 보여 주는지 검증한다.
const mocks = vi.hoisted(() => ({
  getMonthlyRanking: vi.fn(),
  listFriends: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
mockNuxtImport('useOpenApi', () => () => ({ sdk: { getMonthlyRanking: mocks.getMonthlyRanking, listFriends: mocks.listFriends }, client: {} }))
mockNuxtImport('useToast', () => () => mocks.toast)
vi.mock('~/stores/user', () => ({
  useUserStore: () => ({ me: { userId: 'me-id', nickname: '나의닉' }, fetchMe: vi.fn().mockResolvedValue(undefined) }),
}))
vi.mock('~/lib/auth-client', async () => {
  const { ref } = await import('vue')
  return { authClient: { useSession: () => ref({ data: null }) } }
})

const ME = 'me-id'

function blockLocally(...ids: string[]) {
  localStorage.setItem(BLOCKS_STORAGE_PREFIX + ME, JSON.stringify(ids.map(userId => ({ userId, nickname: userId, blockedAt: '2026-10-03T00:00:00.000Z' }))))
}

function ranking(overrides: Partial<RankingResponse> = {}): RankingResponse {
  return {
    type: 'items',
    scope: 'all',
    yearMonth: null,
    entries: [
      { rank: 1, userId: 'u1', nickname: '친구A', score: 80, isSelf: false },
      { rank: 2, userId: ME, nickname: '나의닉', score: 19, isSelf: true },
      { rank: 3, userId: 'u3', nickname: '친구C', score: 5, isSelf: false },
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

function q<T extends Element = HTMLElement>(testId: string): T | null {
  return document.body.querySelector<T>(`[data-testid="${testId}"]`)
}

const wrappers: VueWrapper[] = []

beforeEach(() => {
  clearNuxtState('tw-user-blocks')
  localStorage.clear()
  vi.clearAllMocks()
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ''
  document.documentElement.classList.remove('scroll-locked')
  document.documentElement.removeAttribute('data-scroll-lock-count')
  localStorage.clear()
})

describe('랭킹 숨김·신고·차단', () => {
  it('차단한 회원 행은 전체·친구 랭킹 모두에서 숨기고 본인 행에는 신고·차단 메뉴가 없다', async () => {
    blockLocally('u1')
    mocks.getMonthlyRanking
      .mockResolvedValueOnce({ data: ranking(), error: undefined })
      .mockResolvedValueOnce({ data: ranking({ scope: 'friends' }), error: undefined })
    wrappers.push(await mountSuspended(RankingModal, { props: { open: true, nickname: '나의닉' } }))
    await flush()

    expect(q('ranking-row-1')).toBeNull()
    expect(q('ranking-row-3')).not.toBeNull()
    expect(q('ranking-report-block-2')).toBeNull() // 본인
    expect(q('ranking-report-block-3')).not.toBeNull()

    q<HTMLButtonElement>('ranking-scope-friends')!.click()
    await flush()
    expect(q('ranking-row-1')).toBeNull()
    expect(q('ranking-row-3')!.textContent).toContain('친구C')
  })

  it('행 메뉴에서 차단을 확인하면 목록에서 즉시 사라지고 저장된다', async () => {
    mocks.getMonthlyRanking.mockResolvedValue({ data: ranking(), error: undefined })
    wrappers.push(await mountSuspended(RankingModal, { props: { open: true, nickname: '나의닉' } }))
    await flush()

    q<HTMLButtonElement>('ranking-report-block-1')!.click()
    await flush()
    q<HTMLButtonElement>('report-block-block')!.click()
    await flush()
    expect(q('block-notice')!.textContent).toContain('상대방에게 알리지 않')
    q<HTMLButtonElement>('block-confirm')!.click()
    await flush()

    expect(q('ranking-row-1')).toBeNull()
    expect(q('ranking-row-3')).not.toBeNull()
    expect(mocks.toast.success).toHaveBeenCalled()
    // 전체 랭킹에서 차단하면 화면에 보이던 가린 표시만 저장한다(가려진 닉네임을 기기에 남기지 않음).
    expect(JSON.parse(localStorage.getItem(BLOCKS_STORAGE_PREFIX + ME)!)).toMatchObject([{ userId: 'u1', nickname: '친**' }])
  })

  it('신고는 사유를 고르면 신고 대상·사유·신고자·시각이 담긴 메일과 주소·본문 복사 안내를 보여 준다', async () => {
    mocks.getMonthlyRanking.mockResolvedValue({ data: ranking({ scope: 'friends' }), error: undefined })
    wrappers.push(await mountSuspended(RankingModal, { props: { open: true, nickname: '나의닉' } }))
    await flush()

    q<HTMLButtonElement>('ranking-report-block-1')!.click()
    await flush()
    q<HTMLButtonElement>('report-block-report')!.click()
    await flush()
    expect(q('report-send-mail')).toBeNull() // 사유 선택 전
    q<HTMLInputElement>('report-reason-abuse')!.click()
    await flush()

    const href = q<HTMLAnchorElement>('report-send-mail')!.getAttribute('href')!
    expect(href.startsWith('mailto:oharapass@gmail.com?')).toBe(true)
    const params = new URLSearchParams(href.slice(href.indexOf('?') + 1).replace(/\+/g, '%2B'))
    expect(params.get('subject')).toBe('[TerraWorld 신고] 친구A')
    const body = params.get('body')!
    expect(body).toContain('신고 대상 닉네임: 친구A')
    expect(body).toContain('신고 대상 회원 ID: u1')
    expect(body).toContain('신고 사유: 욕설·비하')
    expect(body).toContain('신고자 회원 ID: me-id')
    expect(body).toMatch(/신고 시각: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)

    expect(q<HTMLInputElement>('report-mail-address')!.value).toBe('oharapass@gmail.com')
    expect(q<HTMLTextAreaElement>('report-mail-body')!.value).toBe(body)
    // 신고만으로는 차단되지 않는다.
    expect(q('ranking-row-1')).not.toBeNull()
  })
})

describe('친구 목록 숨김', () => {
  it('차단한 친구는 목록과 인원 수에서 빠지고, 시트에서 차단하면 즉시 사라진다', async () => {
    blockLocally('f2')
    mocks.listFriends.mockResolvedValue({
      data: [
        { userId: 'f1', nickname: '친구1', likeCount: 0, liked: false },
        { userId: 'f2', nickname: '친구2', likeCount: 0, liked: false },
        { userId: 'f3', nickname: '친구3', likeCount: 0, liked: false },
      ],
      error: undefined,
    })
    const wrapper = await mountSuspended(FriendsPage)
    wrappers.push(wrapper)
    await flush()

    const names = () => wrapper.findAll('[data-testid="friends-row"]').map(row => row.find('p').text())
    expect(names()).toEqual(['친구1', '친구3'])
    expect(wrapper.text()).toContain('(2)')

    await wrapper.get('[data-testid="friends-report-block-f1"]').trigger('click')
    await flush()
    q<HTMLButtonElement>('report-block-block')!.click()
    await flush()
    q<HTMLButtonElement>('block-confirm')!.click()
    await flush()
    expect(names()).toEqual(['친구3'])
  })

  it('신고·차단 버튼 히트영역은 좌측이 버튼 간격을 넘지 않고 우측으로 넓혀 44px 이상을 유지한다', async () => {
    mocks.listFriends.mockResolvedValue({
      data: [{ userId: 'f1', nickname: '친구1', likeCount: 0, liked: false }],
      error: undefined,
    })
    const wrapper = await mountSuspended(FriendsPage)
    wrappers.push(wrapper)
    await flush()

    // 버튼 간격 gap-1.5(6px) + 테두리 1px — 좌측 7px 확장이 좋아요 버튼 외곽에 닿되 겹치지 않는 상한
    expect(wrapper.get('[data-testid="friends-row"] > div:last-child').classes()).toContain('gap-1.5')
    const classes = wrapper.get('[data-testid="friends-report-block-f1"]').classes()
    expect(classes).toEqual(expect.arrayContaining(['after:-left-[7px]', 'after:-right-[9px]', 'after:-inset-y-[8px]', 'px-2', 'py-1.5']))
    expect(classes).not.toContain('after:-inset-x-[8px]')
  })
})

describe('습관 친구 선택 숨김', () => {
  it('차단한 친구는 선택 후보에서 빠지고 초안에 남은 선택도 제출할 수 없다', async () => {
    blockLocally('friend-b')
    const wrapper = await mountSuspended(HabitCreateSheet, {
      props: { open: true, initialMode: 'friend', friends: [{ userId: 'friend-a', nickname: '친구 A' }, { userId: 'friend-b', nickname: '친구 B' }] },
      global: { stubs: { CommonBottomSheet: { template: '<section><slot/><slot name="footer"/></section>' } } },
    })
    wrappers.push(wrapper)
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    await wrapper.get('input').setValue('함께 독서')
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')

    expect(wrapper.text()).toContain('친구 A')
    expect(wrapper.text()).not.toContain('친구 B')
    expect(wrapper.findAll('button').filter(button => button.text() === '요청하기')).toHaveLength(1)
  })
})
