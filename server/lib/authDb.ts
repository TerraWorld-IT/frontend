/**
 * 계정 복구(이메일 찾기)용 auth DB 읽기 전용 풀.
 *
 * `server/lib/auth.ts` 의 better-auth 내부 풀과는 별개의 작은 풀이다. auth.ts 풀은
 * 모듈 비공개라 재사용하지 않고, 복구 경로는 가끔·소량 쿼리만 하므로 max 를 작게 둔다.
 * 같은 DATABASE_URL 을 가리키므로 better-auth 가 만든 `"user"` 테이블을 그대로 읽는다.
 *
 * lazy init — 모듈 로드 시점이 아니라 첫 쿼리 때 풀을 만든다(라우트가 임포트돼도
 * DATABASE_URL 이 없는 빌드 단계에서 터지지 않도록).
 */
import { Pool } from 'pg'

let pool: Pool | null = null

export function authDbPool(): Pool {
  if (pool) return pool
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('[authDb] DATABASE_URL is required')
  }
  pool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })
  return pool
}
