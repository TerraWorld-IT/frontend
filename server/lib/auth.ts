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
async function provisionDomainProfile(userId: string, email: string): Promise<void> {
  try {
    await $fetch(`${internalApiBaseUrl}/api/v1/internal/users/bootstrap`, {
      method: 'POST',
      headers: { 'X-Internal-Token': internalApiToken },
      body: { userId, email },
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

  emailAndPassword: {
    enabled: true,
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
        after: async (user) => {
          await provisionDomainProfile(user.id, user.email)
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
