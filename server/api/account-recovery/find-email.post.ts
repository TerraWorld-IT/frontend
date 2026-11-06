/**
 * 이메일(계정) 찾기 — 가입 시 입력한 닉네임 + 생년월일로 가입 이메일을 **마스킹**해 알려준다.
 *
 * 로그인 아이디가 곧 이메일인 구조라, 사용자가 "어떤 이메일로 가입했는지" 잊은 경우를 돕는다.
 *
 * 보안 설계
 * - 이 기능은 본질적으로 "그 닉네임+생년월일 조합의 계정이 있는지"를 확인해 주므로 열거 표면이다.
 *   이를 줄이기 위해:
 *   - 닉네임 + 생년월일 **정확 일치** 1건일 때만 마스킹된 이메일을 준다.
 *   - 전체 이메일은 절대 반환하지 않는다(`ja***@gm***.com` 형태).
 *   - IP 기준 레이트리밋(기본 시간당 5회). 단일 replica 전제(auth.ts rateLimit 주석과 동일 가정).
 *   - 여러 건 일치 시 이메일을 주지 않고 고객센터 안내로 수렴(닉네임은 유니크가 아님).
 * - better-auth 의 `/forget-password` 와 달리 커스텀 라우트라 better-auth 레이트리밋이 적용되지
 *   않는다. 그래서 여기서 자체 리밋을 건다.
 */
import { authDbPool } from '~~/server/lib/authDb'
import { maskEmail } from '#shared/utils/maskEmail'

const BIRTHDATE_RE = /^\d{4}-\d{2}-\d{2}$/
const NICKNAME_MAX = 20

// --- IP 레이트리밋 (in-memory, best-effort) -------------------------------
const WINDOW_MS = 60 * 60 * 1000 // 1시간
const MAX_PER_WINDOW = 5
const hits = new Map<string, { count: number, resetAt: number }>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now >= entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > MAX_PER_WINDOW
}

// 메모리 누수 방지: 가끔 만료 엔트리 정리.
function sweep(): void {
  if (hits.size < 1000) return
  const now = Date.now()
  for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k)
}

export default defineEventHandler(async (event) => {
  // getRequestIP 는 신뢰할 수 있는 프록시 뒤에서 x-forwarded-for 를 쓰도록 xForwardedFor 옵션을 켠다.
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  sweep()
  if (rateLimited(ip)) {
    setResponseStatus(event, 429)
    return { status: 'too_many' as const }
  }

  const body = await readBody<{ nickname?: unknown, birthDate?: unknown }>(event)
  const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : ''
  const birthDate = typeof body?.birthDate === 'string' ? body.birthDate.trim() : ''

  if (!nickname || nickname.length > NICKNAME_MAX || !BIRTHDATE_RE.test(birthDate)) {
    setResponseStatus(event, 400)
    return { status: 'invalid' as const }
  }

  try {
    const { rows } = await authDbPool().query<{ email: string }>(
      'SELECT email FROM "user" WHERE name = $1 AND "birthDate" = $2 LIMIT 2',
      [nickname, birthDate],
    )
    if (rows.length === 0) return { status: 'not_found' as const }
    if (rows.length > 1) return { status: 'multiple' as const }
    return { status: 'found' as const, email: maskEmail(rows[0]!.email) }
  }
  catch (e) {
    // eslint-disable-next-line no-console
    console.error('[find-email] query failed', e)
    setResponseStatus(event, 500)
    return { status: 'error' as const }
  }
})
