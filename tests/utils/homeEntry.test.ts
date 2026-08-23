import { describe, it, expect } from 'vitest'
import { hasHomeEntryQuery, parseHomeEntryQuery, stripHomeEntryQuery } from '~/utils/homeEntry'

// 홈 진입 쿼리(관리 모드 딥링크) 해석 — 키우기 30일 완료 카드 "관리 모드 바로가기" 계약(댓글 #53).
describe('parseHomeEntryQuery', () => {
  it('?mode=manage&tab=spirit → 관리 모드 + 정령 탭', () => {
    expect(parseHomeEntryQuery({ mode: 'manage', tab: 'spirit' })).toEqual({ mode: 'manage', tab: 'spirits' })
    expect(parseHomeEntryQuery({ mode: 'manage', tab: 'spirits' })).toEqual({ mode: 'manage', tab: 'spirits' })
  })

  it('?mode=manage 단독 → 관리 모드, 탭은 null(호출부 기본 탭)', () => {
    expect(parseHomeEntryQuery({ mode: 'manage' })).toEqual({ mode: 'manage', tab: null })
  })

  it('미지원 탭 값은 null 로 떨어지고 배열 쿼리는 첫 값을 쓴다', () => {
    expect(parseHomeEntryQuery({ mode: 'manage', tab: 'nope' })).toEqual({ mode: 'manage', tab: null })
    expect(parseHomeEntryQuery({ mode: ['manage'], tab: ['background', 'spirit'] })).toEqual({ mode: 'manage', tab: 'backgrounds' })
    expect(parseHomeEntryQuery({ mode: 'manage', tab: 'ITEMS' })).toEqual({ mode: 'manage', tab: 'items' })
  })

  it('mode 가 manage 가 아니면 tab 이 있어도 진입 없음', () => {
    expect(parseHomeEntryQuery({})).toEqual({ mode: null, tab: null })
    expect(parseHomeEntryQuery({ tab: 'spirit' })).toEqual({ mode: null, tab: null })
    expect(parseHomeEntryQuery({ mode: 'healing' })).toEqual({ mode: null, tab: null })
  })
})

describe('쿼리 소비/정리', () => {
  it('hasHomeEntryQuery 는 mode 또는 tab 이 있을 때만 true', () => {
    expect(hasHomeEntryQuery({})).toBe(false)
    expect(hasHomeEntryQuery({ foo: '1' })).toBe(false)
    expect(hasHomeEntryQuery({ mode: 'x' })).toBe(true)
    expect(hasHomeEntryQuery({ tab: 'spirit' })).toBe(true)
  })

  it('stripHomeEntryQuery 는 mode/tab 만 빼고 나머지를 보존하며 원본을 변형하지 않는다', () => {
    const query = { mode: 'manage', tab: 'spirit', ref: 'share' }
    expect(stripHomeEntryQuery(query)).toEqual({ ref: 'share' })
    expect(query).toEqual({ mode: 'manage', tab: 'spirit', ref: 'share' })
  })
})
