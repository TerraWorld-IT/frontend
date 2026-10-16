import { afterAll, describe, expect, it, vi } from 'vitest'

// 실제 설정 파일을 불러와 라우트 규칙을 검사한다.
vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
const { default: config } = await import('../../nuxt.config')
afterAll(() => vi.unstubAllGlobals())

describe('법률 페이지 캐시 정책', () => {
  it('문서 CSP가 GA4 스크립트와 수집 연결을 허용한다', () => {
    const csp = config.routeRules!['/**']!.headers!['Content-Security-Policy'] as string
    const directives = Object.fromEntries(csp.split('; ').map(part => {
      const [name, ...sources] = part.split(' ')
      return [name, sources]
    }))
    expect(directives['script-src']).toContain('https://*.googletagmanager.com')
    expect(directives['connect-src']).toEqual(expect.arrayContaining([
      'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com',
    ]))
    expect(config.gtag!.initMode).toBe('manual')
    expect(config.gtag!.config).toMatchObject({ allow_google_signals: false, allow_ad_personalization_signals: false })
    expect(config.gtag!.config).not.toHaveProperty('user_id')
  })

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
