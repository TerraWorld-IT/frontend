import { afterAll, describe, expect, it, vi } from 'vitest'

// 실제 설정 파일을 불러와 라우트 규칙을 검사한다.
vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
const { default: config } = await import('../../nuxt.config')
afterAll(() => vi.unstubAllGlobals())

describe('법률 페이지 캐시 정책', () => {
  it.each(['/legal/privacy', '/legal/terms'])('%s는 시행 전 본문을 공유 캐시에 저장하지 않는다', (path) => {
    const rules = config.routeRules!
    for (const route of ['/**', '/legal/**', path]) {
      const rule = rules[route] ?? {}
      expect(rule).not.toHaveProperty('swr')
      expect(rule).not.toHaveProperty('cache')
      expect(rule.prerender).not.toBe(true)
    }
    const headers = {
      ...rules['/**']?.headers,
      ...rules['/legal/**']?.headers,
      ...rules[path]?.headers,
    }
    expect(headers['Cache-Control']).toBe('private, no-store')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'")
  })
})
