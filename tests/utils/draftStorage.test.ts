import { afterEach, describe, expect, it, vi } from 'vitest'
import { readDraft, writeDraft, clearDraft } from '~/utils/draftStorage'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('초안 저장소', () => {
  it('직렬화 왕복, 사용자별 분리, 같은 이탈 초안 중복 쓰기 방지와 삭제', () => {
    const set = vi.spyOn(localStorage, 'setItem')
    writeDraft('draft.user-a', { text: '초안' })
    writeDraft('draft.user-a', { text: '초안' })
    expect(set).toHaveBeenCalledTimes(1)
    expect(readDraft('draft.user-a')).toEqual({ text: '초안' })
    expect(readDraft('draft.user-b')).toBeNull()
    clearDraft('draft.user-a')
    expect(readDraft('draft.user-a')).toBeNull()
  })

  it('잘못된 JSON은 무시하고 빈 문자열 초안은 복원한다', () => {
    localStorage.setItem('draft', '{broken')
    expect(readDraft('draft')).toBeNull()
    writeDraft('draft', '')
    expect(readDraft('draft')).toBe('')
  })

  it('저장소 차단과 용량 초과가 읽기·이탈·성공 삭제를 막지 않는다', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('접근 차단') })
    expect(readDraft('draft')).toBeNull()
    expect(() => writeDraft('draft', '초안')).not.toThrow()
    vi.restoreAllMocks()
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('용량 초과') })
    expect(() => writeDraft('draft', '초안')).not.toThrow()
    vi.spyOn(localStorage, 'removeItem').mockImplementation(() => { throw new Error('접근 차단') })
    expect(() => clearDraft('draft')).not.toThrow()
  })
})
