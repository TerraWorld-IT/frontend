import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('[auth] DATABASE_URL is required — set it in .env or environment variables')
}

const secret = process.env.BETTER_AUTH_SECRET
if (!secret) {
  throw new Error('[auth] BETTER_AUTH_SECRET is required — set it in .env or environment variables')
}

export const auth = betterAuth({
  database: new Pool({ connectionString }),

  secret,

  emailAndPassword: {
    enabled: true,
  },

  // 소셜 로그인 (추후 활성화)
  // socialProviders: {
  //   google: {
  //     clientId: process.env.GOOGLE_CLIENT_ID!,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  //   },
  //   kakao: {
  //     clientId: process.env.KAKAO_CLIENT_ID!,
  //     clientSecret: process.env.KAKAO_CLIENT_SECRET!,
  //   },
  // },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
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
      sameSite: 'lax',
    },
  },
})
