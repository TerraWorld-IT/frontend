import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, type EffectScope } from 'vue'
import { BLOCKS_STORAGE_PREFIX, useUserBlocks as useUserBlocksRaw } from '~/composables/useUserBlocks'

// 로그인 회원 전환을 흉내 내려고 user store 의 me 를 반응형으로 바꿔 끼운다.
const state = vi.hoisted(() => ({ store: null as null | { me: { userId: string } | null } }))
vi.mock('~/stores/user', async () => {
  const { reactive } = await import('vue')
  state.store = reactive({ me: { userId: 'user-a' } as { userId: string } | null })
  return { useUserStore: () => state.store }
})

// 컴포넌트 밖에서 부르므로 테스트마다 effect scope 로 감싸 회원 감시를 정리한다.
let scope: EffectScope
function useUserBlocks() {
  return scope.run(() => useUserBlocksRaw())!
}

function login(userId: string | null) {
  state.store!.me = userId ? { userId } : null
}

beforeEach(() => {
  scope = effectScope()
  clearNuxtState('tw-user-blocks')
  localStorage.clear()
  login('user-a')
})
afterEach(() => {
  scope.stop()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('useUserBlocks', () => {
  it('차단하면 목록에 추가·저장되고 해제하면 지워진다', () => {
    const blocks = useUserBlocks()
    expect(blocks.block({ userId: 'friend-1', nickname: '친구1' })).toEqual({ added: true, saved: true })
    expect(blocks.isBlocked('friend-1')).toBe(true)
    expect(blocks.blockedUsers.value.map(b => b.userId)).toEqual(['friend-1'])
    expect(JSON.parse(localStorage.getItem(`${BLOCKS_STORAGE_PREFIX}user-a`)!)).toMatchObject([{ userId: 'friend-1', nickname: '친구1' }])

    // 같은 회원을 다시 차단해도 중복되지 않는다.
    expect(blocks.block({ userId: 'friend-1', nickname: '친구1' })).toEqual({ added: false, saved: true })
    expect(blocks.blockedUsers.value).toHaveLength(1)

    expect(blocks.unblock('friend-1')).toBe(true)
    expect(blocks.isBlocked('friend-1')).toBe(false)
    expect(localStorage.getItem(`${BLOCKS_STORAGE_PREFIX}user-a`)).toBeNull()
  })

  it('filterBlocked 는 차단한 회원만 빼고 원본 원소를 그대로 돌려준다', () => {
    const blocks = useUserBlocks()
    const rows = [{ userId: 'f1', nickname: 'A' }, { userId: 'f2', nickname: 'B' }, { userId: 'f3', nickname: 'C' }]
    blocks.block({ userId: 'f2', nickname: 'B' })
    const visible = blocks.filterBlocked(rows)
    expect(visible.map(r => r.userId)).toEqual(['f1', 'f3'])
    expect(visible[0]).toBe(rows[0])
  })

  it('한 화면에서 차단하면 같은 상태를 쓰는 다른 화면에도 즉시 반영된다', () => {
    const screenA = useUserBlocks()
    const screenB = useUserBlocks()
    screenA.block({ userId: 'f1', nickname: 'A' })
    expect(screenB.isBlocked('f1')).toBe(true)
  })

  it('로그인 회원별로 목록을 분리하고 저장된 목록을 다시 읽는다', async () => {
    const blocks = useUserBlocks()
    blocks.block({ userId: 'f1', nickname: 'A' })

    login('user-b')
    await nextTick()
    expect(blocks.isBlocked('f1')).toBe(false)
    blocks.block({ userId: 'f2', nickname: 'B' })
    expect(JSON.parse(localStorage.getItem(`${BLOCKS_STORAGE_PREFIX}user-b`)!)).toMatchObject([{ userId: 'f2' }])

    // 메모리 상태를 비워도 기기 저장소에서 회원별 목록을 복원한다(앱 재실행).
    clearNuxtState('tw-user-blocks')
    login('user-a')
    const reopened = useUserBlocks()
    expect(reopened.blockedUsers.value.map(b => b.userId)).toEqual(['f1'])
  })

  it('로그인 회원을 모르거나 자기 자신이면 차단하지 않는다', () => {
    const blocks = useUserBlocks()
    expect(blocks.block({ userId: 'user-a', nickname: '나' })).toEqual({ added: false, saved: false })
    login(null)
    expect(blocks.block({ userId: 'f1', nickname: 'A' })).toEqual({ added: false, saved: false })
    expect(blocks.blockedUsers.value).toEqual([])
    expect(blocks.unblock('f1')).toBe(false)
  })

  it('잘못된 JSON·형식이 어긋난 항목은 버린다', () => {
    localStorage.setItem(`${BLOCKS_STORAGE_PREFIX}user-a`, '{broken')
    expect(useUserBlocks().blockedUsers.value).toEqual([])

    clearNuxtState('tw-user-blocks')
    localStorage.setItem(`${BLOCKS_STORAGE_PREFIX}user-a`, JSON.stringify([
      { userId: 'ok', nickname: 'A', blockedAt: '2026-10-03T00:00:00.000Z' },
      { userId: 123, nickname: 'B', blockedAt: 'x' },
      null,
      { userId: '', nickname: 'C', blockedAt: 'x' },
    ]))
    expect(useUserBlocks().blockedUsers.value.map(b => b.userId)).toEqual(['ok'])
  })

  it('저장소 접근이 막혀도 예외 없이 이번 실행 동안은 숨기고 저장 실패를 알린다', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('접근 차단') })
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('용량 초과') })
    vi.spyOn(localStorage, 'removeItem').mockImplementation(() => { throw new Error('접근 차단') })
    const blocks = useUserBlocks()
    expect(blocks.blockedUsers.value).toEqual([])
    expect(blocks.block({ userId: 'f1', nickname: 'A' })).toEqual({ added: true, saved: false })
    expect(blocks.isBlocked('f1')).toBe(true)
    expect(blocks.unblock('f1')).toBe(false)
    expect(blocks.isBlocked('f1')).toBe(false)
  })
})
