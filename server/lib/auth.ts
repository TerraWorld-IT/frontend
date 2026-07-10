import { betterAuth } from 'better-auth'
import { jwt, bearer } from 'better-auth/plugins'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('[auth] DATABASE_URL is required — set it in .env or environment variables')
}

const secret = process.env.BETTER_AUTH_SECRET
if (!secret) {
  throw new Error('[auth] BETTER_AUTH_SECRET is required — set it in .env or environment variables')
}

const rawInternalApiToken = process.env.INTERNAL_API_TOKEN
if (!rawInternalApiToken) {
  throw new Error('[auth] INTERNAL_API_TOKEN is required — set it in .env or environment variables')
}
// SEC-031: detect placeholder values that slip through .env.example copy/paste.
// The Spring side has the same length minimum.
if (rawInternalApiToken.length < 16 || rawInternalApiToken.startsWith('replace-')) {
  // eslint-disable-next-line no-console
  console.warn(
    '[auth] INTERNAL_API_TOKEN looks like a placeholder. Generate one with `openssl rand -hex 32` '
    + 'and set the same value on the Spring side.',
  )
}
const internalApiToken: string = rawInternalApiToken

const internalApiBaseUrl = process.env.INTERNAL_API_BASE_URL ?? 'http://localhost:8080'

const authBaseUrl = process.env.NUXT_PUBLIC_AUTH_BASE_URL || 'http://localhost:3000'

/**
 * SEC-A: e2e 스크린샷 스위트는 `signUpAndLogin` 을 80회 호출하는데 better-auth 의
 * `/sign-up*` 기본 룰이 10초 3회라 limiter 가 켜진 채로는 전 스위트가 429 로 죽는다.
 * e2e 프로필에서만 끄되, 이 완화 스위치가 실배포로 새어나가면 로그인 무차별 대입 방어가
 * 통째로 사라지므로 https 대상에서는 부팅을 거부한다 (fail-closed).
 */
const isE2EProfile = process.env.DEPLOY_PROFILE === 'e2e'
if (isE2EProfile && authBaseUrl.startsWith('https://')) {
  throw new Error(
    '[auth] DEPLOY_PROFILE=e2e disables auth rate limiting and must never run against an https '
    + `deployment (NUXT_PUBLIC_AUTH_BASE_URL=${authBaseUrl})`,
  )
}

/**
 * Shared pg Pool — used by both better-auth's storage adapter (auth schema)
 * and the `definePayload` hook that reads `public.users.role` to embed the
 * role claim into JWTs. Reusing a single pool keeps connection overhead
 * bounded in Nitro's long-lived process.
 *
 * Pool sizing: default max=10 is acceptable while dev traffic is low.
 * Production will revisit when load testing is scheduled.
 */
const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

/**
 * Call Spring's internal bootstrap endpoint on signup so the domain
 * profile (public.users + UserTokens + Terrarium) exists atomically
 * with the auth identity. The filter-side JIT in
 * `JwtAuthenticationFilter` remains as a fallback for the rare case
 * where this call fails.
 *
 * SEC-003: we never send `role` here — Spring always creates profiles
 * as USER. Admin promotion is a separate manual operation.
 */
async function provisionDomainProfile(userId: string, email: string, nickname?: string): Promise<void> {
  try {
    await $fetch(`${internalApiBaseUrl}/api/v1/internal/users/bootstrap`, {
      method: 'POST',
      headers: { 'X-Internal-Token': internalApiToken },
      // 가입 시 입력한 닉네임(better-auth user.name)을 Spring 도메인 프로필에 반영.
      body: { userId, email, nickname },
      retry: 2,
      retryDelay: 250,
      timeout: 5_000,
    })
  }
  catch (e) {
    // Do not block signup on transient failures — filter fallback
    // will provision on the user's next authenticated API request.
    // Dev visibility only; stripped in prod by vite esbuild drop.
    // eslint-disable-next-line no-console
    console.error('[auth] Spring bootstrap failed for', userId, e)
  }
}

export const auth = betterAuth({
  database: pool,

  secret,

  // 감사 finding: trustedOrigins 미설정 시 baseURL default 에만 의존 → 브라우저 요청(Sec-Fetch 헤더)이
  // origin-check(forceValidate)를 거치며 서빙 origin 이 baseURL 과 다르면 signup/login 403.
  // 서빙 origin 을 env 로 명시 신뢰 (기본 localhost:3000). 실 배포는 NUXT_PUBLIC_AUTH_BASE_URL 로 도메인 주입.
  trustedOrigins: [authBaseUrl],

  // SEC-A: `rateLimit` 미지정 시 better-auth 는 `isProduction`(= process.env.NODE_ENV === 'production')
  // 으로 폴백한다. 그런데 better-auth 는 `.output/server/node_modules/` 로 외부화되어 verbatim 복사되므로
  // 그 NODE_ENV 는 *런타임* 에 읽히고, 런타임 이미지는 NODE_ENV 를 설정하지 않는다(Dockerfile / deploy
  // compose 모두 미설정) → 실배포에서 sign-in 무차별 대입 방어가 꺼져 있었다. 라이브 프로브에서 4연속
  // 로그인 실패에도 429 미발생 (2026-07-09). (대조: 이 파일의 `secure: NODE_ENV === 'production'` 는
  // 1차 소스라 nitro 가 빌드 타임에 `true` 로 인라인한다 — 같은 표현식인데 한쪽만 살아남는다.)
  // 보안 컨트롤을 ambient env 에 맡기지 않고 명시한다. /sign-in·/sign-up 의 10초 3회 특수 룰은
  // better-auth 기본값이 적용되므로 window/max/customRules 는 불필요하다.
  // storage 기본값은 memory — 프론트 컨테이너 단일 replica 전제. replica 를 늘리면 카운터가
  // per-replica 가 되어 실효 한도가 replica 배로 느슨해지므로 secondaryStorage 로 옮겨야 한다.
  rateLimit: {
    enabled: !isE2EProfile,
  },

  emailAndPassword: {
    enabled: true,
  },

  /**
   * LEGAL-001 additionalFields 등록 (e2e cycle 2026-05-18 발견).
   *
   * better-auth 의 default user schema 는 standard fields (id/name/email/...) 만 받음.
   * client 가 `signUp.email({ ..., birthDate })` 추가 field 보내도 default 는 strip
   * — e2e 검증 시 server hook 의 birthDate read 가 매번 undefined → 422 "birthDate is
   * required" 응답 → 만 14세 이상 사용자도 가입 불가.
   *
   * `input: true` — client signup payload 에서 받음. `required: true` — DB schema 에
   * NOT NULL column 강제 (002_better_auth_user_birthDate.sql migration 동반).
   *
   * 저장된 birthDate 는 만 14세 미만 차단 검증 목적으로만 사용 (privacy.md §2.1
   * 목적 한정). privacy.md §8 retention policy 준수 (가입 후 N년 후 hash 변환).
   */
  user: {
    additionalFields: {
      birthDate: {
        type: 'string',
        required: true,
        input: true,
      },
      // P1-3 (PIPA 제15조): 분리 동의 이력 — signup payload 로 전달돼 user row 에 기록.
      // required: false (기존 row backfill 안전). 필수 동의 강제는 create.before 에서.
      // (003_consent_fields.sql 마이그레이션 동반 — auth.user 컬럼 추가)
      agreeTerms: { type: 'boolean', required: false, input: true },
      agreePrivacy: { type: 'boolean', required: false, input: true },
      marketingConsent: { type: 'boolean', required: false, input: true },
      analyticsConsent: { type: 'boolean', required: false, input: true },
      adConsent: { type: 'boolean', required: false, input: true },
      photoConsent: { type: 'boolean', required: false, input: true },
      pushConsent: { type: 'boolean', required: false, input: true },
      consentVersion: { type: 'string', required: false, input: true },
      consentedAt: { type: 'string', required: false, input: true },
    },
  },

  /**
   * Social login (Tier 3 scaffold — disabled by default, enabled by env vars).
   * Phase 4 통합 절차:
   *   1) Google Cloud Console / Kakao Developers 에서 OAuth Client ID/Secret 발급
   *   2) `.env` 에 `AUTH_GOOGLE_CLIENT_ID` / `AUTH_GOOGLE_CLIENT_SECRET` 설정
   *      또는 `AUTH_KAKAO_CLIENT_ID` / `AUTH_KAKAO_CLIENT_SECRET` 설정
   *   3) Redirect URI 등록: `${BASE_URL}/api/auth/callback/{google|kakao}`
   * 두 환경변수 모두 미설정 시 socialProviders 객체는 빈 상태로 유지되어
   * 기존 email/password 흐름에 영향을 주지 않는다.
   */
  socialProviders: {
    ...(process.env.AUTH_GOOGLE_CLIENT_ID && process.env.AUTH_GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.AUTH_GOOGLE_CLIENT_ID,
            clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.AUTH_KAKAO_CLIENT_ID && process.env.AUTH_KAKAO_CLIENT_SECRET
      ? {
          kakao: {
            clientId: process.env.AUTH_KAKAO_CLIENT_ID,
            clientSecret: process.env.AUTH_KAKAO_CLIENT_SECRET,
          },
        }
      : {}),
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (cookie)
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min cache
    },
  },

  advanced: {
    cookiePrefix: 'tw',
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // SEC-015 는 원래 'strict' 였다. 되돌린 이유와 그래도 안전한 이유를 남긴다.
      //
      // 증상: Capacitor 원격 URL 셸에서 앱을 완전히 껐다 켜면 7일 세션이 살아 있는데도
      // 곧바로 로그인 화면이 떴다. WebView 의 **첫** top-level 네비게이션은 앱(about:blank)이
      // 개시하므로 cross-site 로 판정될 수 있고, 그러면 Strict 쿠키가 실리지 않는다.
      // `middleware/auth.ts` 의 SSR 분기는 쿠키가 없으면 즉시 리다이렉트하므로 클라이언트
      // 코드가 돌기도 전에 로그아웃처럼 보인다. (같은 파일 아래 bearer 플러그인 주석이
      // "clients that cannot use cookies (Capacitor WebView on iOS)" 라고 이미 경고하고 있다.)
      //
      // 'lax' 는 better-auth 자체 기본값이기도 하다(`dist/cookies/index.mjs`). Strict→Lax 의
      // 실제 델타는 **cross-site top-level GET 네비게이션 한 가지뿐**이다 —
      // `<img>`/`<script>`/`<iframe>`/fetch/XHR 에는 Lax 쿠키가 애초에 실리지 않는다.
      // 그 한 가지 델타가 안전한 이유(보안 리뷰로 라우트 전수 확인):
      //   - 상태를 바꾸는 GET 은 `/verify-email` 과 `/delete-user/callback` 뿐인데 둘 다
      //     추측 불가능한 서명 토큰을 요구하고, 후자는 `user.deleteUser` 미설정이라 404 다.
      //   - 데이터를 주는 GET(`/get-session`, `/token`, `/list-sessions`)은 top-level 이동으로
      //     열려도 same-origin policy 상 공격자가 응답을 읽을 수 없다.
      //   - Spring `/api/v1/*` 는 이 쿠키로 인증하지 않는다(Authorization: Bearer RS256).
      //     따라서 이 쿠키의 CSRF 표면은 `/api/auth/*` 로 한정된다.
      //   - POST 는 Lax 가 여전히 cross-site 로 보내지 않는다.
      // 주의: better-auth 의 origin 검사(`origin-check.mjs`)는 GET/HEAD/OPTIONS 에서 조기
      // 반환하므로 **GET 방어가 아니다**. POST 만 보호한다 — GET 델타의 근거로 인용하지 말 것.
      //
      // 남는 위험(수용): 공격 사이트가 피해자를 `/api/auth/get-session` 으로 top-level
      // 이동시키면 Lax 쿠키가 실리고, `updateAge`(1일)를 지난 세션은 그 GET 이 만료를 갱신한다
      // (`session.mjs`). 즉 **세션 수명 강제 연장**이 가능하다. 응답 본문은 same-origin policy
      // 로 못 읽으므로 정보 노출은 없다. 콜드 스타트 로그인 유지와 맞바꾼 값이다.
      // 향후 `user.deleteUser.enabled` 를 켜거나 토큰 없는 상태변경 GET 을 추가하면 재검토.
      sameSite: 'lax',
    },
  },

  /**
   * SEC-003: keep domain provisioning out of the Spring filter path.
   * better-auth fires `databaseHooks.user.create.after` synchronously
   * inside the sign-up transaction, so by the time the client receives
   * its session cookie the Spring profile already exists.
   */
  databaseHooks: {
    user: {
      create: {
        /**
         * LEGAL-001 fix (Codex audit HIGH, 2026-05-18):
         * 만 14세 미만 가입 차단 (개인정보보호법 — 만 14세 미만 아동의 개인정보).
         * privacy.md §8 의 선언과 정합 — birthDate 가 추가 field 로 signup form 에서 전달.
         *
         * birthDate 형식: ISO YYYY-MM-DD (frontend 의 signup form 에서 검증 + 본 hook 에서 재검증).
         * 만 14세 = 오늘 - 14년 미만 시 reject.
         *
         * 본 hook 은 sign-up transaction 내 동기 실행 — throw 시 transaction rollback +
         * client 가 가입 거절 응답 받음.
         */
        before: async (user) => {
          const birthDate = (user as { birthDate?: string }).birthDate
          if (!birthDate) {
            throw new Error('birthDate is required (만 14세 미만 차단 — 개인정보보호법)')
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
            throw new Error('invalid birthDate format (expected ISO YYYY-MM-DD)')
          }
          // M6 (code-review): 나이 비교를 `new Date(birthDate)`(UTC parse) vs local cutoff 의
          // timezone 불일치(±1일 오판) 대신 YYYY-MM-DD 문자열 사전식 비교(=달력일 비교)로 수행.
          const today = new Date()
          const cutoff = `${today.getFullYear() - 14}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          if (birthDate > cutoff) {
            throw new Error('만 14세 미만은 가입할 수 없습니다 (개인정보보호법)')
          }
          // P1-3 (PIPA 제15조): 필수 동의(이용약관·개인정보 수집·이용) 서버측 최종 검증.
          // client(login.vue)가 1차 차단하나, UI 우회(직접 signup API 호출) 시에도 가입 거절.
          //
          // ⚠️ H5 (code-review): 본 게이트는 email/password 가입(consent 필드 전달)을 전제한다.
          //   socialProviders(google/kakao, 현재 env-gated 비활성) 활성화 시 OAuth 가입은
          //   agreeTerms 를 전달하지 않아 본 hook 에서 거절된다(fail-closed — 미동의 가입 차단).
          //   소셜 로그인 도입 시 OAuth 콜백/온보딩에서 분리 동의를 먼저 수집해 user 에 심어야 한다.
          const consentUser = user as { agreeTerms?: boolean; agreePrivacy?: boolean }
          if (consentUser.agreeTerms !== true || consentUser.agreePrivacy !== true) {
            throw new Error('필수 약관 및 개인정보 수집·이용 동의가 필요합니다')
          }
          // better-auth `before` hook signature: Promise<boolean | void | { data: Optional<User> & Record<string, any> }>.
          // 통과 시 `return true` (passthrough) — user 객체 수정 없음, transaction 진행.
          // 거절 시 위 throw — transaction rollback + client 가 가입 거절 응답 받음.
          return true
        },
        after: async (user) => {
          // user.name = 가입 폼의 닉네임(signUp payload name). Spring 도메인 프로필 nickname 으로 전달.
          await provisionDomainProfile(user.id, user.email, user.name)
        },
      },
    },
  },

  plugins: [
    /**
     * JWT plugin — mints RS256 JWTs that the Spring Boot backend validates
     * via JWKS. Keys are generated automatically on first run and stored in
     * `auth.jwks` (encrypted). The `/api/auth/jwks` endpoint is exposed for
     * downstream verifiers (Spring fetches this on startup and caches).
     *
     * Claims:
     *   - iss   : "terraworld"     (enforced by Spring)
     *   - aud   : "terraworld-api" (enforced by Spring)
     *   - exp   : 5 minutes (SEC-010 — short TTL limits role stickiness
     *             after ADMIN→USER demotion; frontend refreshes aggressively)
     *   - sub   : better-auth user id (CUID) — Spring uses as public.users.id
     *   - email : from auth.user.email
     *   - role  : pulled from public.users.role (USER/ADMIN), defaults to USER
     *             when the domain profile has not been materialized yet
     *
     * ARCH-003: `definePayload` is the ONLY place the frontend reads from
     * `public.*`. Columns allowed here are strictly { role }. Adding any
     * new column (email, nickname, currency, etc.) requires a design
     * review — this hook runs on every JWT mint and must stay cheap.
     */
    jwt({
      jwks: {
        keyPairConfig: {
          alg: 'RS256',
          modulusLength: 2048,
        },
      },
      jwt: {
        issuer: 'terraworld',
        audience: 'terraworld-api',
        expirationTime: '5m',
        definePayload: async ({ user }) => {
          // Allow-listed column: `role` only. See ARCH-003.
          const { rows } = await pool.query<{ role: string }>(
            'SELECT role FROM public.users WHERE id = $1',
            [user.id],
          )
          const role = rows[0]?.role
          return {
            email: user.email,
            role: role === 'ADMIN' || role === 'USER' ? role : 'USER',
          }
        },
      },
    }),

    /**
     * Bearer plugin — accepts `Authorization: Bearer <session-token>` for
     * clients that cannot use cookies (Capacitor WebView on iOS, native
     * fetch calls, tests). Works alongside the default cookie auth.
     */
    bearer(),
  ],
})
