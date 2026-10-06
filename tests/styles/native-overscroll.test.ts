import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 네이티브 앱 전용 overscroll 규칙 회귀 검사 (폰 QA: 기록하기·키우기 등 세로 스와이프 전면 무반응).
// overflow:hidden/auto 요소는 넘치지 않아도 스크롤 컨테이너라, 모든 요소에 contain 을 걸면 제스처가
// 그 위에서 붙잡혀 바깥 스크롤러(문서)로 전달되지 않는다. 웹/데스크톱에선 재현되지 않아 소스로 막는다.
const css = readFileSync('app/assets/css/tailwind.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('is-native-app overscroll-behavior', () => {
  it('전체 하위 요소(*)에 overscroll-behavior 를 걸지 않는다', () => {
    const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, selector, body]) => /\.is-native-app\s+\*/.test(selector!) && /overscroll-behavior/.test(body!))
    expect(blocks.map(([, selector]) => selector!.trim())).toEqual([])
  })

  it('독립 페이지 스크롤러에만 contain 을 건다', () => {
    expect(css).toMatch(/\.is-native-app\s+\.apjek-page-scroll\s*\{[^}]*overscroll-behavior:\s*contain/)
  })
})
