import { describe, expect, it } from 'vitest'
import { maskEmail } from '#shared/utils/maskEmail'

describe('maskEmail', () => {
  it('로컬/도메인 앞 2글자만 남기고 TLD 는 보존한다', () => {
    expect(maskEmail('jaeseok@gmail.com')).toBe('ja***@gm***.com')
  })

  it('짧은(1글자) 로컬/도메인도 안전하게 마스킹한다', () => {
    expect(maskEmail('a@b.com')).toBe('a***@b***.com')
  })

  it('서브도메인/멀티 TLD 는 마지막 점을 TLD 경계로 본다', () => {
    expect(maskEmail('user@mail.co.kr')).toBe('us***@ma***.kr')
  })

  it('점 없는 도메인도 처리한다', () => {
    expect(maskEmail('bob@localhost')).toBe('bo***@lo***')
  })

  it('전체 이메일을 절대 그대로 노출하지 않는다', () => {
    const masked = maskEmail('secretuser@privatemail.com')
    expect(masked).not.toContain('secretuser')
    expect(masked).not.toContain('privatemail')
    expect(masked).toContain('***')
  })

  it('@ 가 없거나 비정상 입력은 완전 마스킹한다', () => {
    expect(maskEmail('notanemail')).toBe('***')
    expect(maskEmail('@nolocal.com')).toBe('***')
    expect(maskEmail('')).toBe('***')
  })
})
