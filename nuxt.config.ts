import tailwindcss from '@tailwindcss/vite'

/**
 * SEC-029: build CSP `connect-src` from environment so dev/staging/prod
 * can each have their own backend/auth origins without editing this file.
 * Multiple URLs joined with whitespace per CSP grammar.
 */
function buildConnectSrc(): string {
  const sources = new Set<string>(["'self'"])
  const apiBase = process.env.NUXT_PUBLIC_API_BASE_URL
  const authBase = process.env.NUXT_PUBLIC_AUTH_BASE_URL
  if (apiBase) sources.add(new URL(apiBase).origin)
  if (authBase) sources.add(new URL(authBase).origin)
  // Fallback for builds with no env (CI smoke, lint).
  if (sources.size === 1) {
    sources.add('http://localhost:8080')
    sources.add('http://localhost:3000')
  }
  return Array.from(sources).join(' ')
}

function buildSecurityHeaders(): Record<string, string> {
  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // SEC-006: prevent shared caches (CDN, nginx proxy_cache) from
    // serving SSR payloads that may contain authenticated user data.
    // Static asset routes opt back into long caching below.
    'Cache-Control': 'private, no-store',
    // SEC-016 / SEC-029: strict CSP. `unsafe-inline` on style-src is
    // necessary for Tailwind/Vue dev builds; drop it in prod once
    // hash/nonce-based inline styles become feasible.
    'Content-Security-Policy': [
      "default-src 'self'",
      // Google AdSense (PC 웹 배너) 스크립트 도메인 허용
      "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.googlesyndication.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src ${buildConnectSrc()}`,
      // AdSense iframe 광고 슬롯 허용
      "frame-src 'self' https://googleads.g.doubleclick.net https://*.googlesyndication.com https://www.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
    ...(process.env.NODE_ENV === 'production'
      ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }
      : {}),
  }
}

function buildRouteRules() {
  return {
    // SEC-017: admin pages are rendered CSR-only so SSR payloads never
    // contain role-gated data. The `admin` middleware then runs on the
    // client and redirects non-admin visitors before any protected data
    // is fetched. Trade-off: ~100ms blank shell flash on cold load.
    '/admin/**': { ssr: false },
    // SEC-030: long-cache static assets. Bundle hashes invalidate
    // automatically, so immutable is safe. These routes never carry
    // user-specific data so private/no-store would be wasteful.
    '/_nuxt/**': {
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    },
    '/favicon.ico': {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    },
    '/**': { headers: buildSecurityHeaders() },
  }
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/fonts',
    'nuxt-gtag',
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n',
    // UltraPlan v3 I-REVERT-002 (2026-05-18) — 사용자 결정 #3: i18n 유지 + 다국어 본격 도입
    // ADR-005 (Accepted) supersedes ADR-003 (i18n REMOVE). 단계적 ko→en→ja 도입.
  ],

  i18n: {
    locales: [
      { code: 'ko', language: 'ko-KR', file: 'ko.json', name: '한국어' },
      { code: 'en', language: 'en-US', file: 'en.json', name: 'English' },
    ],
    defaultLocale: 'ko',
    langDir: 'locales/',
    strategy: 'no_prefix',
  },

  vite: {
    plugins: [tailwindcss()],
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    },
    // Windows + Vite 7 의 알려진 issue 회피: Vite WS-only listener 가 main HTTP port 를
    // 점유해 IPv4 path 의 모든 request 가 426 Upgrade Required 응답. hmr port 를 명시
    // 분리해 main port 의 HTTP 응답을 정상화. dev 환경 한정 영향 (production build 무관).
    server: {
      hmr: {
        port: 24678,
      },
    },
  },

  css: ['~/assets/css/tailwind.css'],

  app: {
    head: {
      // UltraPlan UX-001 — WCAG 2.1 SC 3.1.1 (Language of Page).
      // ADR-003 (i18n REMOVE) 후 단일 한국어 정책 — screen reader 가 한국어 TTS 사용하도록
      // <html lang="ko"> 명시 강제. dir="ltr" 도 함께 명시 (RTL 미지원).
      htmlAttrs: {
        lang: 'ko',
        dir: 'ltr',
      },
      title: 'TerraWorld',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: '일상을 기록하고, 나만의 테라리움을 꾸며보세요' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1',
      authBaseUrl: process.env.NUXT_PUBLIC_AUTH_BASE_URL || 'http://localhost:3000',
      gaId: process.env.NUXT_PUBLIC_GA_ID || '',
      // AdSense (PC 웹 배너 전용)
      adsenseClient: process.env.NUXT_PUBLIC_ADSENSE_CLIENT || '',
      adsenseSlot: process.env.NUXT_PUBLIC_ADSENSE_SLOT || '',
      // AdMob (Android 모바일 앱). dev 빌드는 Capacitor 설정의 testing 모드로 자동 우회.
      admobRewardedAdId: process.env.NUXT_PUBLIC_ADMOB_REWARDED_AD_ID || '',
    },
  },

  pinia: {
    storesDirs: ['./app/stores'],
  },

  fonts: {
    families: [
      { name: 'Pretendard', provider: 'local' },
    ],
  },

  gtag: {
    id: process.env.NUXT_PUBLIC_GA_ID || '',
    enabled: process.env.NODE_ENV === 'production',
    // Runtime access: useRuntimeConfig().public.gaId
  },

  colorMode: {
    preference: 'light',
    fallback: 'light',
  },

  typescript: {
    strict: true,
    // UltraPlan M3 — noUncheckedIndexedAccess.
    // 잠재 unsafe index 접근 (array[i] / record[key]) 을 type level 에서 차단.
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true,
      },
    },
  },

  routeRules: buildRouteRules(),

  // The generated openapi client ships as raw .ts and must be transpiled by Nuxt.
  build: {
    transpile: ['@terraworld-it/openapi-frontend'],
  },
})
