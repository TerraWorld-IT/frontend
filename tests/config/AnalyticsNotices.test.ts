import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('GA4 추가 공고', () => {
  it('공지 1·2·3 원문 바이트는 HEAD와 같고 4번만 추가한다', () => {
    const current = readFileSync('public/notices.json')
    const head = execFileSync('git', ['show', 'HEAD:public/notices.json'])
    // 현재 공지는 중첩 객체가 없으므로 객체 단위 바이트를 그대로 대조한다.
    const entries = (buffer: Buffer) => [...buffer.toString('utf8').matchAll(/\{[^{}]*\}/g)]
      .map(match => ({ id: JSON.parse(match[0]).id, bytes: Buffer.from(match[0]) }))
    const actual = entries(current)
    const before = entries(head)
    for (const id of [1, 2, 3]) {
      expect(actual.find(entry => entry.id === id)!.bytes.equals(before.find(entry => entry.id === id)!.bytes)).toBe(true)
    }
    expect(actual.map(entry => entry.id)).toEqual([4, 3, 2, 1])
    const notice = JSON.parse(current.toString('utf8'))[0]
    expect(notice.date).toBe('2026-10-16')
    expect(notice.body).toContain('개정본에 동의하고 가입한 회원')
    expect(notice.body).toContain('간주 동의를 적용하지 않습니다')
  })
})
