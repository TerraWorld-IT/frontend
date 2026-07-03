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
  trustedOrigins: [process.env.NUXT_PUBLIC_AUTH_BASE_URL || 'http://localhost:3000'],

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
      // SEC-015: strict in dev as well so a cross-site GET to
      // /api/auth/session cannot carry the session cookie.
      sameSite: 'strict',
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
