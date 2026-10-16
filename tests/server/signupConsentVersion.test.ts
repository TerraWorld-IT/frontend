import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRuntimeConfig } from '#imports'
import { getWithHooks, parseUserInput, parseUserOutput } from 'better-auth/db'

// 실제 가입 훅을 불러오되 인증 서비스와 DB 연결은 생성하지 않는다.
vi.mock('better-auth', () => ({ betterAuth: vi.fn((options: unknown) => options) }))
vi.mock('better-auth/plugins', () => ({ jwt: vi.fn(() => ({ id: 'jwt' })), bearer: vi.fn(() => ({ id: 'bearer' })) }))
vi.mock('pg', () => ({ Pool: class {} }))

type CreateBefore = (user: Record<string, unknown>) => Promise<unknown>
async function loadAuthOptions(): Promise<Record<string, unknown>> {
  vi.stubEnv('DATABASE_URL', 'postgres://test.invalid/test')
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-only-secret-for-consent-hooks')
  vi.stubEnv('INTERNAL_API_TOKEN', 'test-only-internal-token')
  try {
    const { auth } = await import('../../server/lib/auth')
    return auth as unknown as Record<string, unknown>
  }
  finally {
    vi.unstubAllEnvs()
  }
}
async function loadCreateBefore(): Promise<CreateBefore> {
  const options = await loadAuthOptions() as { databaseHooks: { user: { create: { before: CreateBefore } } } }
  return options.databaseHooks.user.create.before
}

// /update-user 와 같은 순서로 요청 본문을 거르고 better-auth 훅 병합을 거쳐 DB 에 넘길 값을 돌려준다.
async function updateUserThroughHooks(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const options = await loadAuthOptions()
  const update = vi.fn(async ({ update }: { update: Record<string, unknown> }) => update)
  const { updateWithHooks } = getWithHooks({ update } as never, {
    options: options as never,
    hooks: [{ source: 'user', hooks: options.databaseHooks as never }],
  })
  const { name, image, ...rest } = body
  const fields = parseUserInput(options as never, rest, 'update')
  await updateWithHooks({ name, image, ...fields }, [{ field: 'id', value: 'user-a' }], 'user', undefined)
  expect(update).toHaveBeenCalledOnce()
  return update.mock.calls[0]![0].update
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
  it('서버 추가 필드가 분석 동의와 가입 버전을 세션 사용자에 반환한다', async () => {
    const options = await loadAuthOptions() as unknown as Parameters<typeof parseUserOutput>[0]
    const user = { ...validUser, consentVersion: '2026-10-23', analyticsConsent: true }
    expect(parseUserOutput(options, user as never)).toMatchObject({ consentVersion: '2026-10-23', analyticsConsent: true })
  })

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

describe('회원 정보 변경의 동의 버전 보호', () => {
  it('변경 요청의 가입 동의 버전과 동의 시각은 버리고 다른 동의 항목은 반영한다', async () => {
    const applied = await updateUserThroughHooks({
      consentVersion: '2026-10-23', consentedAt: '2026-10-23T00:00:00.000Z',
      analyticsConsent: true, marketingConsent: false, pushConsent: true,
    })
    expect(applied).not.toHaveProperty('consentVersion')
    expect(applied).not.toHaveProperty('consentedAt')
    expect(applied).toMatchObject({ analyticsConsent: true, marketingConsent: false, pushConsent: true })
  })

  it('가입 동의 버전만 바꾸는 요청은 동의 기록을 건드리지 않는다', async () => {
    const applied = await updateUserThroughHooks({ consentVersion: '2099-01-01' })
    expect(applied).not.toHaveProperty('consentVersion')
    expect(applied).not.toHaveProperty('consentedAt')
  })

  it('동의 기록과 무관한 이름 변경은 그대로 반영한다', async () => {
    await expect(updateUserThroughHooks({ name: '새싹이' })).resolves.toMatchObject({ name: '새싹이' })
  })
})
