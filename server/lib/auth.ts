import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://terraworld:terraworld@localhost:5432/terraworld',
  }),

  secret: process.env.BETTER_AUTH_SECRET || 'terraworld-dev-secret-change-in-production',

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
  },
})
