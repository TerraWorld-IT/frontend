import { describe, expect, it, vi } from 'vitest'
import { isForbiddenNickname, normalizeNickname, NICKNAME_NOT_ALLOWED_CODE, NICKNAME_NOT_ALLOWED_MESSAGE } from '#shared/utils/nicknamePolicy'

// 가입 before hook 검증용 — better-auth 는 옵션을 그대로 돌려주게 하고 DB 풀은 만들지 않는다(AccountSettings.test 와 같은 방식).
vi.mock('better-auth', () => ({ betterAuth: vi.fn((options: unknown) => options) }))
vi.mock('better-auth/plugins', () => ({ jwt: vi.fn(), bearer: vi.fn() }))
vi.mock('pg', () => ({ Pool: class {} }))

// 백엔드 NicknamePolicyTest 와 같은 사례 — 두 구현이 같은 판정을 내야 한다.
describe('닉네임 금칙어 정책', () => {
  it('금칙어 원형은 거부한다', () => {
    for (const word of [
      '시발', '씨발', '씨빨', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅄ', 'ㅂㅅ', '개새끼', '좆', '존나', '지랄',
      '미친놈', '미친년', '꺼져', '닥쳐', '엿먹', '느금마', '니애미', '섹스', '야동', '걸레', '창녀',
      'fuck', 'shit', 'bitch', 'asshole', 'pussy', 'cunt', 'nigger', 'faggot', 'porn',
      '운영자', '관리자', 'admin', 'terraworld운영', '테라월드운영',
    ]) expect(isForbiddenNickname(word), word).toBe(true)
  })

  it('공백·숫자·특수문자·제로폭·전각·leet 변형은 거부한다', () => {
    for (const word of [
      '시 발', '시1발', '시.발', '씨_발', '시!@#발', '병1신', '병 신', 'ㅅ ㅂ', 'ㅅ.ㅂ', '개 새 끼',
      '시\u200B발', // 제로폭 공백
      'ＦＵＣＫ', // 전각 영문
      'F u c k', 'f.u.c.k', 'Sh1t', 'b1tch', 'a$$hole', 'FUCK123', 'FuCk', 'PoRn',
      '관 리 자', '관리자1', 'Admin', 'ADMIN', 'Admin_01', '테라월드 운영', 'TerraWorld 운영팀',
      '착한시발', '테라시발이', // 앞뒤에 다른 글자가 붙어도 부분 일치
    ]) expect(isForbiddenNickname(word), word).toBe(true)
  })

  it('분해 자모 사이에 구분자를 넣어도 재조합되어 거부한다', () => {
    for (const word of [
      '\u1109.\u1175.\u1107.\u1161.\u11AF',
      '\u1109 \u1175 \u1107 \u1161 \u11AF',
      '\u1109\u1175\u1107\u1161\u11AF', // 구분자 없는 분해형
      '\u1109\u1175\u11071\u1161\u11AF',
    ]) expect(isForbiddenNickname(word), JSON.stringify(word)).toBe(true)
  })

  it('한글 채움 문자와 폭 없는 문자를 끼워도 거부한다', () => {
    for (const word of [
      '시\u3164발', '시\u1160발', '시\u115F발', '시\uFFA0발',
      '시\u200B발', '시\u200C발', '시\u200D발', '시\uFEFF발',
      'ㅅ\u3164ㅂ',
    ]) expect(isForbiddenNickname(word), JSON.stringify(word)).toBe(true)
  })

  it('채움 문자만 있는 입력은 금칙어가 아니다', () => {
    expect(isForbiddenNickname('\u3164\u1160\u115F\u200B')).toBe(false)
    expect(isForbiddenNickname('초\u3164록\u200B이')).toBe(false)
  })

  it('일반 닉네임은 통과한다', () => {
    for (const word of [
      '테라', '초록이', '김철수', 'Tera 22', 'tera_22', '선인장🌵', '🌱새싹🌱', '🌵', 'Terra',
      '푸른숲', '민트초코', '행복한토끼', '123', 'a', '이끼정원사', 'Luna', 'Moss',
    ]) expect(isForbiddenNickname(word), word).toBe(false)
  })

  it('오탐이 많은 짧은 단어는 단독일 때만 거부하고 정상 단어 안에서는 통과시킨다', () => {
    // '년' 은 목록에서 제외 — 숫자 제거 후 단독 판정이 불가능하고 오탐이 많다. 욕설 용법은 '미친년' 같은 복합어로 막는다.
    for (const word of ['시바견', '시바견 보리', '새끼고양이', '새끼손가락', '졸라맨', '2020년', '년', '새해복많이받으세요', '애비뉴', '보지마세요', 'Essex', 'Sussex', 'Dickens']) {
      expect(isForbiddenNickname(word), word).toBe(false)
    }
    // 숫자는 정규화에서 지워지므로 'se2x'·'자2지' 같은 변형도 단독 단어로 거부한다.
    for (const word of ['시바', '시 바', '새끼', '졸라', '애미', '애비', '보지', '자지', 'sex', 'S3X', 'dick', 'se2x', 'di2ck', '자2지', '보2지']) {
      expect(isForbiddenNickname(word), word).toBe(true)
    }
  })

  it('빈 문자열·기호만 있는 입력은 금칙어가 아니다', () => {
    expect(isForbiddenNickname('')).toBe(false)
    expect(isForbiddenNickname('   ')).toBe(false)
    expect(isForbiddenNickname('!!!')).toBe(false)
  })

  it('정규화가 자모 목록 단어를 빈 문자열로 만들지 않는다 — 빈 단어는 모든 닉네임을 거부하게 만든다', () => {
    for (const word of ['ㅅㅂ', 'ㅆㅂ', 'ㅄ', 'ㅂㅅ']) expect(normalizeNickname(word).length, word).toBeGreaterThan(0)
  })
})

describe('가입 before hook 닉네임 검사', () => {
  type CreateBefore = (user: Record<string, unknown>) => Promise<unknown>
  async function loadCreateBefore(): Promise<CreateBefore> {
    vi.stubEnv('DATABASE_URL', 'postgres://test.invalid/test')
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-only-secret-for-nickname-hooks')
    vi.stubEnv('INTERNAL_API_TOKEN', 'test-only-internal-token')
    try {
      const { auth } = await import('../../server/lib/auth')
      return (auth as unknown as { databaseHooks: { user: { create: { before: CreateBefore } } } }).databaseHooks.user.create.before
    }
    finally {
      vi.unstubAllEnvs()
    }
  }
  const validUser = { email: 'a@example.com', birthDate: '2000-01-01', agreeTerms: true, agreePrivacy: true }

  it.each(['시1발', 'ADMIN', '테라월드 운영', 'f.u.c.k'])('금칙어 닉네임 %s 는 가입을 거절한다(트랜잭션 롤백)', async (name) => {
    const before = await loadCreateBefore()
    await expect(before({ ...validUser, name })).rejects.toMatchObject({
      status: 'BAD_REQUEST',
      body: { code: NICKNAME_NOT_ALLOWED_CODE, message: NICKNAME_NOT_ALLOWED_MESSAGE },
    })
  })

  it.each(['테라', '시바견', '🌱새싹🌱'])('정상 닉네임 %s 는 통과시킨다', async (name) => {
    const before = await loadCreateBefore()
    await expect(before({ ...validUser, name })).resolves.toBe(true)
  })

  it('만 14세·필수 동의 검사는 그대로 먼저 적용된다', async () => {
    const before = await loadCreateBefore()
    await expect(before({ ...validUser, name: '테라', agreeTerms: false })).rejects.toThrow('필수 약관')
  })
})
