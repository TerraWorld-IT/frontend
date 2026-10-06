import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 회귀 가드 — iOS WebKit 에서 회원가입 생년월일 date input 이 카드 밖으로 넘치고
 * 다른 입력보다 높아지던 결함(TestFlight 실기기).
 *
 * happy-dom 은 WebKit 의 date input 고유 최소 너비·네이티브 외형을 렌더링하지 않으므로
 * 실제 넘침은 단위 테스트로 재현할 수 없다. 그래서 input 마크업과 scoped CSS 소스를 직접 검사한다.
 */
// vitest 는 프로젝트 루트(frontend/)를 cwd 로 실행한다.
const src = readFileSync(resolve(process.cwd(), 'app/pages/auth/login.vue'), 'utf-8')
const style = src.match(/<style scoped>([\s\S]*?)<\/style>/)?.[1] ?? ''

function block(selector: RegExp): string {
  return style.match(new RegExp(`${selector.source}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

describe('회원가입 생년월일 date input 레이아웃', () => {
  it('생년월일 input 은 유일한 date input 이고 다른 입력과 같은 tw-field 클래스를 쓴다', () => {
    const input = src.match(/<input\s[^>]*id="auth-birthDate"[^>]*>/)?.[0] ?? ''
    expect(input).toMatch(/type="date"/)
    expect(input).toMatch(/class="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all tw-field"/)
    expect(src.match(/type="(date|time|datetime-local|month|week)"/g)).toHaveLength(1)
  })

  it('date tw-field 는 네이티브 외형을 끄고 부모 너비를 넘지 않는다', () => {
    const rule = block(/\.tw-field\[type='date'\]/)
    expect(rule).toMatch(/-webkit-appearance\s*:\s*none/)
    expect(rule).toMatch(/(^|[^-])appearance\s*:\s*none/)
    expect(rule).toMatch(/display\s*:\s*block/)
    expect(rule).toMatch(/box-sizing\s*:\s*border-box/)
    expect(rule).toMatch(/min-width\s*:\s*0/)
  })

  it('빈 값이어도 text-sm + py-3 + 보더 높이로 고정해 다른 tw-field 와 같다', () => {
    const rule = block(/\.tw-field\[type='date'\]/)
    expect(rule).toMatch(/height\s*:\s*calc\(1\.25rem \+ 1\.5rem \+ 3px\)/)
    expect(rule).toMatch(/line-height\s*:\s*1\.25rem/)
    // 높이 계산의 전제: 공통 보더 1.5px
    expect(block(/\.tw-field/)).toMatch(/border\s*:\s*1\.5px solid/)
  })

  it('WebKit 날짜 값은 왼쪽 정렬·여백 없이 그린다', () => {
    const rule = block(/\.tw-field\[type='date'\]::-webkit-date-and-time-value/)
    expect(rule).toMatch(/text-align\s*:\s*left/)
    expect(rule).toMatch(/margin\s*:\s*0/)
  })
})
