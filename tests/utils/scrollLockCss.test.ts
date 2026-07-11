import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 회귀 가드 — 배경 스크롤 잠금 CSS 의 캐스케이드 정확성.
 *
 * `html.scroll-locked main { overflow: hidden }` 이 layers 안(예: @layer base)에 있으면
 * Tailwind 의 `.overflow-y-auto` 유틸리티(utilities 레이어, 선언 순서상 나중)에 덮여
 * **배경이 그대로 스크롤된다**(빌드·타입체크·테스트 다 통과해도 시각으로만 드러남 —
 * 실제로 프로덕션에서 이 방식으로 무력화됐었다). unlayered + !important 여야 한다.
 *
 * happy-dom 은 CSS 레이어 캐스케이드를 계산하지 않으므로 런타임 단위 테스트로는 이걸 못 잡는다.
 * 그래서 소스 CSS 를 직접 검사한다.
 */
// vitest 는 프로젝트 루트(frontend/)를 cwd 로 실행한다.
const CSS_PATH = resolve(process.cwd(), 'app/assets/css/tailwind.css')
const css = readFileSync(CSS_PATH, 'utf-8')

/** `@layer <name> { ... }` 블록들의 [start, end) 범위. */
function layerRanges(src: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  const re = /@layer\s+[\w-]+\s*\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    let depth = 1
    let i = m.index + m[0].length
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') depth--
    }
    ranges.push([m.index, i])
  }
  return ranges
}

function isInsideAnyLayer(pos: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([s, e]) => pos > s && pos < e)
}

describe('scroll-lock CSS 캐스케이드', () => {
  const ranges = layerRanges(css)

  it('html.scroll-locked main 규칙이 존재한다', () => {
    expect(css).toMatch(/html\.scroll-locked\s+main\s*\{/)
  })

  it('스크롤 잠금 규칙은 @layer 밖(unlayered)에 있다 — 그래야 utilities 레이어를 이긴다', () => {
    const mainRule = css.search(/html\.scroll-locked\s+main\s*\{/)
    const bodyRule = css.search(/html\.scroll-locked\s*,\s*\n?\s*html\.scroll-locked\s+body\s*\{/)
    expect(mainRule).toBeGreaterThan(-1)
    expect(bodyRule).toBeGreaterThan(-1)
    expect(isInsideAnyLayer(mainRule, ranges)).toBe(false)
    expect(isInsideAnyLayer(bodyRule, ranges)).toBe(false)
  })

  it('overflow 잠금은 !important 로 못박는다', () => {
    const block = css.match(/html\.scroll-locked\s+main\s*\{[^}]*\}/)?.[0] ?? ''
    expect(block).toMatch(/overflow\s*:\s*hidden\s*!important/)
    const bodyBlock = css.match(/html\.scroll-locked\s*,[^{]*\{[^}]*\}/)?.[0] ?? ''
    expect(bodyBlock).toMatch(/overflow\s*:\s*hidden\s*!important/)
  })
})
