import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { AdRewardNonceResponse } from '@terraworld-it/openapi-frontend'
import { useAdMob, REWARD_AD_TIMEOUT_MS, REWARD_AD_PREPARE_TIMEOUT_MS, readPendingAdClaim, writePendingAdClaim, clearPendingAdClaim, isAdLimitReachedToday, markAdLimitReachedToday } from '~/composables/useAdMob'
import { STORAGE_KEYS } from '~/utils/constants'
import { kstTodayKey } from '~/utils/habitState'

const mocks = vi.hoisted(() => ({
  native: false,
  platform: 'web',
  issue: vi.fn(),
  initialize: vi.fn(),
  prepare: vi.fn(),
  show: vi.fn(),
  remove: vi.fn(),
  listeners: new Map<string, () => void>(),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => mocks.platform } }))
vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    initialize: mocks.initialize,
    prepareRewardVideoAd: mocks.prepare,
    showRewardVideoAd: mocks.show,
    addListener: async (event: string, callback: () => void) => {
      mocks.listeners.set(event, callback)
      return { remove: mocks.remove }
    },
  },
  RewardAdPluginEvents: { Rewarded: 'rewarded', Dismissed: 'dismissed', FailedToShow: 'failed' },
}))
mockNuxtImport('useOpenApi', () => () => ({ sdk: { issueAdRewardNonce: mocks.issue }, client: {} }))

function nonce(overrides: Partial<AdRewardNonceResponse> = {}): AdRewardNonceResponse {
  return { nonce: 'server-nonce', purpose: 'AD_REWARD', status: 'PENDING', expiresAt: '2026-09-09T03:10:00Z', ...overrides }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-09T03:00:00Z'))
  mocks.native = false
  mocks.platform = 'web'
  mocks.listeners.clear()
  mocks.initialize.mockReset().mockResolvedValue(undefined)
  mocks.prepare.mockReset().mockResolvedValue(undefined)
  mocks.show.mockReset().mockResolvedValue(undefined)
  mocks.remove.mockReset().mockResolvedValue(undefined)
  mocks.issue.mockReset().mockResolvedValue({ data: nonce() })
  localStorage.clear()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('useAdMob contract', () => {
  it('exports useAdMob function', () => {
    expect(typeof useAdMob).toBe('function')
    expect(useAdMob()).not.toHaveProperty('generateNonce')
  })

  it.each(['AD_REWARD', 'GROWTH_REVIVE'] as const)('서버 발급에 query.purpose=%s를 전달한다', async (purpose) => {
    mocks.issue.mockResolvedValueOnce({ data: nonce({ purpose }) })
    expect(await useAdMob().issueServerNonce(purpose)).toEqual(nonce({ purpose }))
    expect(mocks.issue).toHaveBeenCalledWith({ client: {}, query: { purpose } })
  })

  it('발급 오류를 전파한다', async () => {
    mocks.issue.mockResolvedValueOnce({ error: { message: '발급 실패' } })
    await expect(useAdMob().issueServerNonce('AD_REWARD')).rejects.toThrow('발급 실패')
  })

  it('VERIFIED에서 조기 반환한다', async () => {
    mocks.issue.mockResolvedValueOnce({ data: nonce({ status: 'VERIFIED' }) })
    expect((await useAdMob().awaitNonceVerified('AD_REWARD', 'server-nonce'))?.status).toBe('VERIFIED')
    expect(mocks.issue).toHaveBeenCalledTimes(1)
  })

  it('PENDING 3회 뒤 마지막 응답을 반환한다', async () => {
    const pending = useAdMob().awaitNonceVerified('AD_REWARD', 'server-nonce')
    await vi.advanceTimersByTimeAsync(2000)
    expect(await pending).toEqual(nonce())
    expect(mocks.issue).toHaveBeenCalledTimes(3)
  })

  it('PENDING에서 VERIFIED로 바뀌면 추가 재조회하지 않는다', async () => {
    mocks.issue.mockResolvedValueOnce({ data: nonce() }).mockResolvedValueOnce({ data: nonce({ status: 'VERIFIED' }) })
    const pending = useAdMob().awaitNonceVerified('AD_REWARD', 'server-nonce')
    await vi.advanceTimersByTimeAsync(1000)
    expect((await pending)?.status).toBe('VERIFIED')
    expect(mocks.issue).toHaveBeenCalledTimes(2)
  })

  it('다른 nonce가 돌아오면 즉시 null이고 재청구용 조회는 1회다', async () => {
    mocks.issue.mockResolvedValueOnce({ data: nonce({ nonce: 'rotated', status: 'VERIFIED' }) })
    expect(await useAdMob().awaitNonceVerified('AD_REWARD', 'server-nonce', { tries: 1 })).toBeNull()
    expect(mocks.issue).toHaveBeenCalledTimes(1)
  })
})

describe('광고 보류와 한도일 저장', () => {
  it('서버 만료시각과 nonce만 보존하고 사용자별로 분리한다', () => {
    writePendingAdClaim('u1', nonce())
    expect(readPendingAdClaim('u1')).toEqual({ nonce: 'server-nonce', purpose: 'AD_REWARD', expiresAt: nonce().expiresAt })
    expect(readPendingAdClaim('u2')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.AD_PENDING + 'u1')).not.toContain('status')
    clearPendingAdClaim('u2')
    expect(readPendingAdClaim('u1')).not.toBeNull()
    clearPendingAdClaim('u1', 'different')
    expect(readPendingAdClaim('u1')).not.toBeNull()
    clearPendingAdClaim('u1', 'server-nonce')
    expect(readPendingAdClaim('u1')).toBeNull()
  })

  it('복구 종을 저장하고 만료시각 경계의 레코드를 안내용으로 보존한다', () => {
    writePendingAdClaim('u1', { ...nonce({ purpose: 'GROWTH_REVIVE' }), speciesCode: 'SPIRIT_A' })
    expect(readPendingAdClaim('u1')?.speciesCode).toBe('SPIRIT_A')
    vi.setSystemTime(new Date(nonce().expiresAt))
    const stored = readPendingAdClaim('u1')!
    expect(Date.now() < Date.parse(stored.expiresAt)).toBe(false)
    clearPendingAdClaim('u1')
    expect(readPendingAdClaim('u1')).toBeNull()
  })

  it.each(['invalid-json', 'null', '{}', '{"nonce":"n","purpose":"AD_REWARD","expiresAt":"bad"}', '{"nonce":"n","purpose":"GROWTH_REVIVE","expiresAt":"2026-09-09T03:10:00Z"}'])('손상 저장값은 무시한다: %s', (value) => {
    localStorage.setItem(STORAGE_KEYS.AD_PENDING + 'u1', value)
    expect(readPendingAdClaim('u1')).toBeNull()
  })

  it('한도 키 값은 기존 KST 헬퍼 날짜이고 다른 날과 다른 계정에는 적용하지 않는다', () => {
    markAdLimitReachedToday('u1')
    expect(localStorage.getItem(STORAGE_KEYS.AD_LIMIT_DATE + 'u1')).toBe(kstTodayKey())
    expect(isAdLimitReachedToday('u1')).toBe(true)
    expect(isAdLimitReachedToday('u2')).toBe(false)
    localStorage.setItem(STORAGE_KEYS.AD_LIMIT_DATE + 'u1', '2026-09-08')
    expect(isAdLimitReachedToday('u1')).toBe(false)
  })

  it('사용자 ID가 없으면 공유 저장 키를 만들지 않는다', () => {
    writePendingAdClaim(undefined, nonce())
    markAdLimitReachedToday(undefined)
    clearPendingAdClaim(undefined)
    expect(readPendingAdClaim(undefined)).toBeNull()
    expect(isAdLimitReachedToday(undefined)).toBe(false)
    expect(localStorage.length).toBe(0)
  })

  it('저장소 예외가 청구 결과를 덮지 않는다', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('저장 차단') })
    expect(() => writePendingAdClaim('u1', nonce())).not.toThrow()
    expect(() => markAdLimitReachedToday('u1')).not.toThrow()
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('조회 차단') })
    expect(readPendingAdClaim('u1')).toBeNull()
    expect(isAdLimitReachedToday('u1')).toBe(false)
    vi.spyOn(localStorage, 'removeItem').mockImplementation(() => { throw new Error('삭제 차단') })
    expect(() => clearPendingAdClaim('u1')).not.toThrow()
  })
})

describe('Android 광고 시한과 완료 증거', () => {
  beforeEach(() => {
    mocks.native = true
    mocks.platform = 'android'
  })

  it.each(['initialize', 'prepare'] as const)('%s가 멈추면 준비 20초 뒤 false이며 늦은 완료도 광고를 표시하지 않는다', async (step) => {
    let resolve!: () => void
    mocks[step].mockReturnValueOnce(new Promise<void>(done => { resolve = done }))
    const result = useAdMob().showRewardedAd()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(REWARD_AD_PREPARE_TIMEOUT_MS)
    expect(await result).toBe(false)
    expect(mocks.show).not.toHaveBeenCalled()
    resolve()
    await flushPromises()
    expect(mocks.show).not.toHaveBeenCalled()
    if (step === 'initialize') expect(mocks.prepare).not.toHaveBeenCalled()
  })

  it('Rewarded 뒤 Dismissed가 없어도 60초에 true로 정리한다', async () => {
    const result = useAdMob().showRewardedAd({ ssvUserId: 'u1', ssvCustomData: 'server-nonce' })
    await flushPromises()
    expect(mocks.prepare).toHaveBeenCalledWith(expect.objectContaining({ ssv: { userId: 'u1', customData: 'server-nonce' } }))
    expect(mocks.show).toHaveBeenCalledTimes(1)
    mocks.listeners.get('rewarded')!()
    await vi.advanceTimersByTimeAsync(REWARD_AD_TIMEOUT_MS)
    expect(await result).toBe(true)
    expect(mocks.remove).toHaveBeenCalledTimes(3)
  })

  it('완료 증거가 없으면 시한 뒤 false다', async () => {
    const result = useAdMob().showRewardedAd()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(REWARD_AD_TIMEOUT_MS)
    expect(await result).toBe(false)
    expect(mocks.remove).toHaveBeenCalledTimes(3)
  })

  it('중도 닫기와 표시 실패는 즉시 false다', async () => {
    const ad = useAdMob()
    const dismissed = ad.showRewardedAd()
    await flushPromises()
    mocks.listeners.get('dismissed')!()
    expect(await dismissed).toBe(false)
    const failed = ad.showRewardedAd()
    await flushPromises()
    mocks.listeners.get('failed')!()
    expect(await failed).toBe(false)
  })
})
