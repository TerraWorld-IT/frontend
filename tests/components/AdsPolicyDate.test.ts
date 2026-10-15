import { describe, expect, it } from 'vitest'
import { isAdsPolicyEffective } from '~/components/legal/adsPolicy'
import { isAdsPolicyEffective as sharedIsAdsPolicyEffective } from '#shared/utils/adsPolicyEffective'

describe('시행 시각 입력의 불변조건', () => {
  it('클라이언트는 서버와 같은 순수 함수를 재수출한다', () => {
    expect(isAdsPolicyEffective).toBe(sharedIsAdsPolicyEffective)
  })
  it('같은 순간의 UTC·KST 표현은 모든 월의 시작과 윤년 경계에서도 같은 결과를 낸다', () => {
    for (let year = 2024; year <= 2032; year++) {
      for (let month = 0; month < 12; month++) {
        const boundary = Date.UTC(year, month, 1)
        const utc = new Date(boundary).toISOString().replace('.000Z', 'Z')
        const kst = new Date(boundary + 9 * 60 * 60 * 1000).toISOString().replace('.000Z', '+09:00')
        for (const offset of [-86_400_000, -1, 0, 1, 86_400_000]) {
          expect(isAdsPolicyEffective(utc, boundary + offset)).toBe(offset >= 0)
          expect(isAdsPolicyEffective(kst, boundary + offset)).toBe(offset >= 0)
        }
      }
    }
  })

  it.each([undefined, null, 0, false, {}, '', 'garbage', '2026-11-13', '2026-11-13T00:00:00',
    '2026-02-29T00:00:00+09:00', '2026-02-30T00:00:00Z', '2026-04-31T00:00:00Z',
    '2026-11-13T24:00:00Z', '2026-11-13T00:00:00+99:00'])('잘못된 설정 %j는 미래 시계에서도 허용하지 않는다', (value) => {
    expect(isAdsPolicyEffective(value, Date.UTC(2099, 0, 1))).toBe(false)
  })
})
