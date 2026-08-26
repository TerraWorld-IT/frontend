import { describe, it, expect } from 'vitest'
import { tokenIconSrc, TOKEN_ICON_SRC, TOKEN_ICON_MINI_SRC } from '~/utils/currency'

// 토큰 아이콘 — 24px 이하는 미니(글로우 원), 25px 부터 타일형. 두 매핑 모두 7화폐를 빠짐없이 가진다.
describe('tokenIconSrc', () => {
  it('24px 경계에서 미니/타일이 갈린다', () => {
    expect(tokenIconSrc('DEW', 24)).toBe('/icons/token/mini/dew.png')
    expect(tokenIconSrc('DEW', 25)).toBe('/icons/token/dew.png')
    expect(tokenIconSrc('COIN', 14)).toBe(TOKEN_ICON_MINI_SRC.COIN)
    expect(tokenIconSrc('RUBY', 40)).toBe(TOKEN_ICON_SRC.RUBY)
  })

  it('7화폐 전부 미니·타일 경로가 있다', () => {
    const codes = ['COIN', 'RUBY', 'SPARKLE', 'DEW', 'SUN', 'BOLT', 'WIND'] as const
    for (const code of codes) {
      expect(TOKEN_ICON_SRC[code]).toMatch(/^\/icons\/token\/[a-z]+\.png$/)
      expect(TOKEN_ICON_MINI_SRC[code]).toMatch(/^\/icons\/token\/mini\/[a-z]+\.png$/)
    }
  })
})
