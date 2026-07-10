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
    // R7: /terrarium/free 는 홈(index.vue)의 자유배치(scale/flip/zIndex + {error} 처리)로 대체된 구 PoC.
    //   Figma(TW2)에도 별도 화면이 없어, 중복·divergent(필드 누락/fail-open save) 페이지를 홈으로 redirect.
    '/terrarium/free': { redirect: '/' },
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
    // P4-2: en.json 번역 완료(다국어 ready)이나 ADR-005 단계적 도입상 언어 전환 UI 는 Phase 5+.
    // 그 전까지 브라우저 언어 자동 감지를 끄고 전 사용자 ko 고정(미검수 영문 UX 조기 노출 방지).
    // Phase 5+ 언어 전환 도입 시 본 옵션 해제 + switcher 연결.
    detectBrowserLanguage: false,
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
      // 구형 Android WebView(Chrome <93, 예: Chrome 91) 는 ES2022 `Object.hasOwn`/
      // `Array.prototype.at` 을 지원하지 않는다. Nuxt 코어의 SSR payload 파서(devalue)와
      // Vue Router 가 앱 초기화 경로에서 이 둘을 사용해 TypeError 로 크래시 → 하이드레이션이
      // 영구히 완료되지 않고 빈 화면만 남는다(네트워크/콘솔 에러 없이 조용히 멈춤 — 실기기가
      // 아니면 원인 추적이 매우 어려움). Vite 는 이 프로젝트에서 legacy 빌드 타겟을 안 쓰므로,
      // 모듈 스크립트보다 먼저 동기 실행되는 head 인라인 스크립트로 최소 polyfill 을 주입한다.
      script: [
        {
          innerHTML: `
            if(typeof Object.hasOwn!=="function"){Object.hasOwn=function(o,p){return Object.prototype.hasOwnProperty.call(o,p)}}
            if(typeof Array.prototype.at!=="function"){Array.prototype.at=function(n){n=Math.trunc(n)||0;if(n<0)n+=this.length;return(n<0||n>=this.length)?undefined:this[n]}}
          `.trim(),
          tagPosition: 'head',
        },
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
      // 아이템 에셋 base (낙서장 req4/8). 로컬 `/items` 기본 → R2 CDN 은 env 로만 교체.
      // slug→`${assetBase}/${slug}.png` 규약이라 나중에 png 파일만 바꾸면 코드 변경 0.
      assetBase: process.env.NUXT_PUBLIC_ASSET_BASE || '/items',
      // 강제 업데이트 게이트(useAppUpdate). 원격 URL 셸이라 웹 배포가 스토어 릴리스보다 앞선다 —
      // 웹이 새 네이티브 능력에 의존하기 시작하는 배포에서 이 값을 올리면 구버전 셸이 업데이트 안내를 띄운다.
      // 빈 값 = 게이트 비활성(현재 기본). 스토어 URL 은 출시 후 실 값 주입(iOS 앱ID 확정 전까지 빈 값).
      minAppVersion: process.env.NUXT_PUBLIC_MIN_APP_VERSION || '',
      iosStoreUrl: process.env.NUXT_PUBLIC_IOS_STORE_URL || '',
      androidStoreUrl: process.env.NUXT_PUBLIC_ANDROID_STORE_URL || 'market://details?id=app.terraworld.mobile',
    },
  },

  pinia: {
    storesDirs: ['./app/stores'],
  },

  fonts: {
    // req1 (2026-07-02): TERRAWORLD2(Figma) 디자인 폰트 정확 이전.
    // 화면 본문/UI 는 Inter(라틴) + Noto Sans KR(한글). Pretendard 는 fallback 유지.
    families: [
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700], subsets: ['latin'] },
      { name: 'Noto Sans KR', provider: 'google', weights: [400, 500, 700], subsets: ['korean', 'latin'] },
      { name: 'Pretendard', provider: 'local' },
    ],
  },

  // @nuxt/icon 은 기본적으로 런타임에 `/api/_nuxt_icon/<collection>.json` 으로 아이콘을 받아온다.
  // 프로덕션 nginx 는 `/api/` 를 Spring 으로 프록시하므로 그 요청이 백엔드에 도달해 401 을 받고,
  // 클라이언트에서 처음 마운트되는 아이콘이 전부 빈 자리로 렌더된다(로컬 dev 는 nginx 가 없어 정상).
  // 원격 URL WebView 앱이 아이콘마다 네트워크를 왕복하는 구조 자체가 문제라, 실사용 아이콘을
  // 클라이언트 번들에 굽는다. localApiEndpoint 는 혹시 목록에서 누락된 아이콘이 생겨도 Spring 이
  // 아니라 Nuxt 로 가도록 하는 2차 방어선.
  icon: {
    localApiEndpoint: '/_nuxt_icon',
    serverBundle: { collections: ['lucide'] },
    clientBundle: {
      // scan 은 정적 `<Icon name="...">` 만 잡는다. `:name` 동적 바인딩(CurrencyDisplay, 아이템 편집
      // 버튼)은 아래 목록으로 명시해야 번들에 포함된다.
      scan: true,
      icons: [
        'lucide:arrow-left-right',
        'lucide:arrow-right',
        'lucide:book-open',
        'lucide:calendar',
        'lucide:camera',
        'lucide:check',
        'lucide:check-circle-2',
        'lucide:chevron-down',
        'lucide:chevron-left',
        'lucide:chevron-right',
        'lucide:chevron-up',
        'lucide:circle-dollar-sign',
        'lucide:edit-2',
        'lucide:footprints',
        'lucide:gem',
        'lucide:gift',
        'lucide:heart',
        'lucide:image-down',
        'lucide:link',
        'lucide:lock',
        'lucide:map-pin',
        'lucide:palette',
        'lucide:pencil',
        'lucide:play',
        'lucide:plus',
        'lucide:refresh-cw',
        'lucide:save',
        'lucide:share-2',
        'lucide:sparkles',
        'lucide:square',
        'lucide:star',
        'lucide:stop-circle',
        'lucide:trash-2',
        'lucide:trending-up',
        'lucide:trophy',
        'lucide:users',
        'lucide:wifi-off',
        'lucide:x',
        'lucide:zap',
      ],
    },
  },

  gtag: {
    id: process.env.NUXT_PUBLIC_GA_ID || '',
    enabled: process.env.NODE_ENV === 'production',
    // P2-2 (PIPA): GA4 는 '선택' 동의 항목 — 자동 로드 금지(opt-in 게이트).
    // initMode:'manual' 이면 gtag.js 스크립트를 부팅 시 주입하지 않음. analyticsConsent=true
    // 일 때만 plugins/analytics-consent.client.ts 가 useGtag().initialize() 호출.
    initMode: 'manual',
    // Runtime access: useRuntimeConfig().public.gaId
  },

  colorMode: {
    preference: 'light',
    fallback: 'light',
    // P4-4: html 클래스를 'dark'/'light' 로 (기본 classSuffix '-mode' 제거) — Tailwind v4
    // @custom-variant dark(.dark) 및 .dark CSS override 와 정합. useTimeAwareColorMode 의
    // 18:00~06:00 KST 자동 전환이 실제 다크 테마로 렌더된다.
    classSuffix: '',
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
