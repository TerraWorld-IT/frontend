import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRuntimeConfig } from '#imports'

// 실제 가입 훅을 불러오되 인증 서비스와 DB 연결은 생성하지 않는다.
vi.mock('better-auth', () => ({ betterAuth: vi.fn((options: unknown) => options) }))
vi.mock('better-auth/plugins', () => ({ jwt: vi.fn(), bearer: vi.fn() }))
vi.mock('pg', () => ({ Pool: class {} }))

type CreateBefore = (user: Record<string, unknown>) => Promise<unknown>
async function loadCreateBefore(): Promise<CreateBefore> {
  vi.stubEnv('DATABASE_URL', 'postgres://test.invalid/test')
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-only-secret-for-consent-hooks')
  vi.stubEnv('INTERNAL_API_TOKEN', 'test-only-internal-token')
  try {
    const { auth } = await import('../../server/lib/auth')
    return (auth as unknown as { databaseHooks: { user: { create: { before: CreateBefore } } } }).databaseHooks.user.create.before
  }
  finally {
    vi.unstubAllEnvs()
  }
}

const validUser = {
  id: 'user-a', name: '초록이', email: 'a@example.com', birthDate: '2000-01-01',
  agreeTerms: true, agreePrivacy: true, adConsent: false,
}
let previousEffectiveAt: string
beforeEach(() => {
  previousEffectiveAt = useRuntimeConfig().public.adsEffectiveAt
  useRuntimeConfig().public.adsEffectiveAt = '2026-10-23T00:00:00+09:00'
})
afterEach(() => {
  useRuntimeConfig().public.adsEffectiveAt = previousEffectiveAt
  vi.restoreAllMocks()
})

describe('서버 가입 동의 버전 확정', () => {
  it.each([
    ['2026-10-22T14:59:59.999Z', '2026-06-23'],
    ['2026-10-22T15:00:00.000Z', '2026-10-23'],
    ['2026-10-22T15:00:00.001Z', '2026-10-23'],
  ])('서버 시각 %s에서는 클라이언트 값과 관계없이 %s를 저장한다', async (now, expectedVersion) => {
    const before = await loadCreateBefore()
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(now))
    for (const consentVersion of [undefined, '', '2026-06-23', '2026-10-23', '2099-01-01']) {
      const user = { ...validUser, consentVersion }
      await expect(before(user)).resolves.toEqual({ data: { ...validUser, consentVersion: expectedVersion } })
      expect(user.consentVersion).toBe(consentVersion)
    }
  })

  it.each([
    ['2026-10-24T00:00:00+09:00', '2026-06-23'],
    ['2026-10-22T15:00:00Z', '2026-10-23'],
    ['', '2026-06-23'],
    ['invalid', '2026-06-23'],
    ['2026-10-23T00:00:00', '2026-06-23'],
    ['2026-02-30T00:00:00Z', '2026-06-23'],
  ])('서버 시행 설정 %s를 적용해 %s를 저장한다', async (effectiveAt, consentVersion) => {
    const before = await loadCreateBefore()
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-22T15:00:00.000Z'))
    useRuntimeConfig().public.adsEffectiveAt = effectiveAt
    await expect(before({ ...validUser, consentVersion: 'untrusted' })).resolves.toEqual({
      data: { ...validUser, consentVersion },
    })
  })

  it('기존 생년월일·나이·필수 동의·닉네임 검사 순서를 유지한다', async () => {
    const before = await loadCreateBefore()
    const invalidUser = { ...validUser, name: 'ADMIN', agreeTerms: false, birthDate: undefined }
    await expect(before(invalidUser)).rejects.toThrow('birthDate is required')
    await expect(before({ ...invalidUser, birthDate: 'invalid' })).rejects.toThrow('invalid birthDate format')
    await expect(before({ ...invalidUser, birthDate: '2099-01-01' })).rejects.toThrow('만 14세 미만')
    await expect(before({ ...invalidUser, birthDate: validUser.birthDate })).rejects.toThrow('필수 약관')
    await expect(before({ ...validUser, name: 'ADMIN' })).rejects.toMatchObject({
      status: 'BAD_REQUEST', body: { code: 'NICKNAME_NOT_ALLOWED' },
    })
  })
})
