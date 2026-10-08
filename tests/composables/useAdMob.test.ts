import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { AdRewardNonceResponse } from '@terraworld-it/openapi-frontend'
import { useAdMob, REWARD_AD_TIMEOUT_MS, REWARD_AD_PREPARE_TIMEOUT_MS, TEST_REWARDED_AD_ID, TEST_REWARDED_AD_ID_IOS, resolveRewardedAdId, isRewardedAdAvailable, readPendingAdClaim, writePendingAdClaim, clearPendingAdClaim, isAdLimitReachedToday, markAdLimitReachedToday } from '~/composables/useAdMob'
import { STORAGE_KEYS } from '~/utils/constants'
import { kstTodayKey } from '~/utils/habitState'

const mocks = vi.hoisted(() => ({
  adsEnabled: false,
  native: false,
  platform: 'web',
  pluginAvailable: false,
  trackingStatus: vi.fn(),
  requestTracking: vi.fn(),
  issue: vi.fn(),
  initialize: vi.fn(),
  prepare: vi.fn(),
  show: vi.fn(),
  remove: vi.fn(),
  listeners: new Map<string, () => void>(),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => mocks.platform, isPluginAvailable: (name: string) => name === 'AdMob' && mocks.pluginAvailable } }))
// 전체 중단 스위치와 실제 바이너리의 플러그인 유무를 각각 검증한다.
vi.mock('~/utils/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/constants')>()
  return { ...actual, get ADS_ENABLED() { return mocks.adsEnabled } }
})
vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    initialize: mocks.initialize,
    prepareRewardVideoAd: mocks.prepare,
    showRewardVideoAd: mocks.show,
    trackingAuthorizationStatus: mocks.trackingStatus,
    requestTrackingAuthorization: mocks.requestTracking,
    addListener: async (event: string, callback: () => void) => {
      mocks.listeners.set(event, callback)
      return { remove: mocks.remove }
    },
  },
  RewardAdPluginEvents: { Rewarded: 'rewarded', Dismissed: 'dismissed', FailedToShow: 'failed' },
}))
mockNuxtImport('useOpenApi', () => () => ({ sdk: { issueAdRewardNonce: mocks.issue }, client: {} }))

// 런타임 설정은 Nuxt 앱이 소유하므로 모의 대신 공개 설정 값만 바꾼다.
function setAdId(value: string): void {
  useRuntimeConfig().public.admobRewardedAdId = value
}

function nonce(overrides: Partial<AdRewardNonceResponse> = {}): AdRewardNonceResponse {
  return { nonce: 'server-nonce', purpose: 'AD_REWARD', status: 'PENDING', expiresAt: '2026-09-09T03:10:00Z', ...overrides }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-09T03:00:00Z'))
  mocks.adsEnabled = true
  setAdId('')
  useRuntimeConfig().public.admobRewardedAdIdIos = ''
  mocks.native = true
  mocks.platform = 'android'
  mocks.pluginAvailable = true
  mocks.trackingStatus.mockReset().mockResolvedValue({ status: 'authorized' })
  mocks.requestTracking.mockReset().mockResolvedValue(undefined)
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
  vi.unstubAllGlobals()
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

  it('대기 중 abort는 즉시 반환하고 타이머와 추가 GET을 남기지 않는다', async () => {
    const controller = new AbortController()
    const result = useAdMob().awaitNonceVerified('AD_REWARD', 'server-nonce', { signal: controller.signal })
    await vi.advanceTimersByTimeAsync(500)
    expect(mocks.issue).toHaveBeenCalledTimes(1)
    controller.abort()
    expect(await result).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(5000)
    expect(mocks.issue).toHaveBeenCalledTimes(1)
  })

  it.each(['resolve', 'reject'] as const)('GET 중 abort 후 늦은 %s도 무시하고 추가 조회하지 않는다', async (outcome) => {
    let resolve!: (value: unknown) => void
    let reject!: (reason: Error) => void
    mocks.issue.mockReturnValueOnce(new Promise((yes, no) => { resolve = yes; reject = no }))
    const controller = new AbortController()
    const result = useAdMob().awaitNonceVerified('AD_REWARD', 'server-nonce', { signal: controller.signal })
    controller.abort()
    expect(await result).toBeNull()
    if (outcome === 'resolve') resolve({ data: nonce({ nonce: 'rotated' }) })
    else reject(new Error('늦은 조회 실패'))
    await vi.advanceTimersByTimeAsync(5000)
    expect(mocks.issue).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('이미 abort된 요청은 GET을 시작하지 않는다', async () => {
    const controller = new AbortController()
    controller.abort()
    expect(await useAdMob().awaitNonceVerified('AD_REWARD', 'server-nonce', { signal: controller.signal })).toBeNull()
    expect(mocks.issue).not.toHaveBeenCalled()
  })

  it('다른 nonce가 돌아오면 즉시 null이고 재청구용 조회는 1회다', async () => {
    mocks.issue.mockResolvedValueOnce({ data: nonce({ nonce: 'rotated', status: 'VERIFIED' }) })
    expect(await useAdMob().awaitNonceVerified('AD_REWARD', 'server-nonce', { tries: 1 })).toBeNull()
    expect(mocks.issue).toHaveBeenCalledTimes(1)
  })
})

describe('광고 보류와 한도일 저장', () => {
  it.each([false, true])('성장 보류는 기존 키 사용=%s에서도 원래 종과 nonce를 사용자별로 보존한다', (legacy) => {
    const first = { nonce: 'first', purpose: 'GROWTH_REVIVE' as const, expiresAt: nonce().expiresAt, speciesCode: 'SPIRIT_A' }
    if (legacy) localStorage.setItem(STORAGE_KEYS.AD_PENDING + 'GROWTH_REVIVE.u1', JSON.stringify(first))
    else writePendingAdClaim('GROWTH_REVIVE', 'u1', first)
    expect(readPendingAdClaim('GROWTH_REVIVE', 'u1')).toEqual(first)
    expect(readPendingAdClaim('GROWTH_REVIVE', 'u2')).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.AD_PENDING + 'GROWTH_REVIVE.u1')!)).toEqual(first)
    clearPendingAdClaim('GROWTH_REVIVE', 'u1', 'other-nonce')
    expect(readPendingAdClaim('GROWTH_REVIVE', 'u1')).toEqual(first)
    clearPendingAdClaim('GROWTH_REVIVE', 'u1', first.nonce)
    expect(readPendingAdClaim('GROWTH_REVIVE', 'u1')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.AD_PENDING + 'GROWTH_REVIVE.u1')).toBeNull()
  })

  it('이전 성장 청구 정리는 같은 종의 새 nonce 보류를 삭제하지 않는다', () => {
    const first = { nonce: 'old', purpose: 'GROWTH_REVIVE' as const, expiresAt: nonce().expiresAt, speciesCode: 'SPIRIT_A' }
    localStorage.setItem(STORAGE_KEYS.AD_PENDING + 'GROWTH_REVIVE.u1', JSON.stringify(first))
    const newer = { ...first, nonce: 'new' }
    writePendingAdClaim('GROWTH_REVIVE', 'u1', newer)
    clearPendingAdClaim('GROWTH_REVIVE', 'u1', first.nonce)
    expect(readPendingAdClaim('GROWTH_REVIVE', 'u1')).toEqual(newer)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.AD_PENDING + 'GROWTH_REVIVE.u1')!)).toEqual(newer)
  })

  it('서버 만료시각과 nonce만 보존하고 사용자별로 분리한다', () => {
    writePendingAdClaim('AD_REWARD', 'u1', nonce())
    expect(readPendingAdClaim('AD_REWARD', 'u1')).toEqual({ nonce: 'server-nonce', purpose: 'AD_REWARD', expiresAt: nonce().expiresAt })
    expect(readPendingAdClaim('AD_REWARD', 'u2')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.AD_PENDING + 'AD_REWARD.u1')).not.toContain('status')
    clearPendingAdClaim('AD_REWARD', 'u2')
    expect(readPendingAdClaim('AD_REWARD', 'u1')).not.toBeNull()
    clearPendingAdClaim('AD_REWARD', 'u1', 'different')
    expect(readPendingAdClaim('AD_REWARD', 'u1')).not.toBeNull()
    clearPendingAdClaim('AD_REWARD', 'u1', 'server-nonce')
    expect(readPendingAdClaim('AD_REWARD', 'u1')).toBeNull()
  })

  it('purpose별 보류를 함께 저장하고 각 키만 삭제한다', () => {
    writePendingAdClaim('AD_REWARD', 'u1', nonce())
    writePendingAdClaim('GROWTH_REVIVE', 'u1', { ...nonce({ purpose: 'GROWTH_REVIVE', nonce: 'growth' }), speciesCode: 'SPIRIT_A' })
    expect(readPendingAdClaim('AD_REWARD', 'u1')?.nonce).toBe('server-nonce')
    expect(readPendingAdClaim('GROWTH_REVIVE', 'u1')?.nonce).toBe('growth')
    expect(localStorage.getItem('tw-ad-pending.GROWTH_REVIVE.u1')).not.toBeNull()
    clearPendingAdClaim('GROWTH_REVIVE', 'u1', 'growth')
    expect(readPendingAdClaim('AD_REWARD', 'u1')?.nonce).toBe('server-nonce')
    expect(readPendingAdClaim('GROWTH_REVIVE', 'u1')).toBeNull()
  })

  it('복구 종을 저장하고 만료시각 경계의 레코드를 안내용으로 보존한다', () => {
    writePendingAdClaim('GROWTH_REVIVE', 'u1', { ...nonce({ purpose: 'GROWTH_REVIVE' }), speciesCode: 'SPIRIT_A' })
    expect(readPendingAdClaim('GROWTH_REVIVE', 'u1')?.speciesCode).toBe('SPIRIT_A')
    vi.setSystemTime(new Date(nonce().expiresAt))
    const stored = readPendingAdClaim('GROWTH_REVIVE', 'u1')!
    expect(Date.now() < Date.parse(stored.expiresAt)).toBe(false)
    clearPendingAdClaim('GROWTH_REVIVE', 'u1')
    expect(readPendingAdClaim('GROWTH_REVIVE', 'u1')).toBeNull()
  })

  it.each(['invalid-json', 'null', '{}', '{"nonce":"n","purpose":"AD_REWARD","expiresAt":"bad"}', '{"nonce":"n","purpose":"GROWTH_REVIVE","expiresAt":"2026-09-09T03:10:00Z"}'])('손상 저장값은 무시한다: %s', (value) => {
    localStorage.setItem(STORAGE_KEYS.AD_PENDING + 'AD_REWARD.u1', value)
    expect(readPendingAdClaim('AD_REWARD', 'u1')).toBeNull()
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
    writePendingAdClaim('AD_REWARD', undefined, nonce())
    markAdLimitReachedToday(undefined)
    clearPendingAdClaim('AD_REWARD', undefined)
    expect(readPendingAdClaim('AD_REWARD', undefined)).toBeNull()
    expect(isAdLimitReachedToday(undefined)).toBe(false)
    expect(localStorage.length).toBe(0)
  })

  it('저장소 예외가 청구 결과를 덮지 않는다', () => {
    // happy-dom 저장소 프록시의 메서드 교체가 다음 테스트에 남지 않도록 전역을 복원한다.
    const storage = {
      setItem: vi.fn(() => { throw new Error('저장 차단') }),
      getItem: vi.fn(() => { throw new Error('조회 차단') }),
      removeItem: vi.fn(() => { throw new Error('삭제 차단') }),
    }
    vi.stubGlobal('localStorage', storage)
    expect(() => writePendingAdClaim('AD_REWARD', 'u1', nonce())).not.toThrow()
    expect(() => markAdLimitReachedToday('u1')).not.toThrow()
    expect(readPendingAdClaim('AD_REWARD', 'u1')).toBeNull()
    expect(isAdLimitReachedToday('u1')).toBe(false)
    expect(() => clearPendingAdClaim('AD_REWARD', 'u1')).not.toThrow()
    expect(storage.setItem).toHaveBeenCalledTimes(2)
    expect(storage.getItem).toHaveBeenCalledTimes(2)
    expect(storage.removeItem).toHaveBeenCalledTimes(1)
  })
})

describe.each(['android', 'ios'])('%s 광고 시한과 완료 증거', (platform) => {
  beforeEach(() => {
    mocks.adsEnabled = true
    mocks.native = true
    mocks.platform = platform
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

  it('시청 완료 후 닫으면 성공하고 준비·표시 오류에는 실패한다', async () => {
    const watched = useAdMob().showRewardedAd()
    await flushPromises()
    mocks.listeners.get('rewarded')!()
    mocks.listeners.get('dismissed')!()
    expect(await watched).toBe(true)
    mocks.prepare.mockRejectedValueOnce(new Error('준비 실패'))
    expect(await useAdMob().showRewardedAd()).toBe(false)
    mocks.show.mockRejectedValueOnce(new Error('표시 실패'))
    expect(await useAdMob().showRewardedAd()).toBe(false)
  })
})

describe('광고 중단 스위치와 운영 광고 단위 ID', () => {
  it.each(['android', 'ios', 'web'] as const)('ADS_ENABLED=false면 %s에서 SDK 초기화·준비·표시를 시작하지 않는다', async (platform) => {
    mocks.adsEnabled = false
    mocks.native = platform !== 'web'
    mocks.platform = platform
    setAdId('ca-app-pub-real/1')
    const ad = useAdMob()
    expect(await ad.showRewardedAd({ ssvUserId: 'u1', ssvCustomData: 'server-nonce' })).toBe(false)
    await ad.initialize()
    expect(mocks.initialize).not.toHaveBeenCalled()
    expect(mocks.prepare).not.toHaveBeenCalled()
    expect(mocks.show).not.toHaveBeenCalled()
    expect(mocks.listeners.size).toBe(0)
  })

  it('운영 빌드는 빈 광고 단위 ID를 테스트 ID로 대체하지 않는다', () => {
    expect(resolveRewardedAdId('', true)).toBeNull()
    expect(resolveRewardedAdId('   ', true)).toBeNull()
    expect(resolveRewardedAdId(undefined, true)).toBeNull()
    expect(resolveRewardedAdId('ca-app-pub-real/1', true)).toBe('ca-app-pub-real/1')
    // 개발·테스트 빌드만 Google 공식 테스트 ID 를 쓴다.
    expect(resolveRewardedAdId('', false)).toBe(TEST_REWARDED_AD_ID)
    expect(resolveRewardedAdId('ca-app-pub-real/1', false)).toBe('ca-app-pub-real/1')
    expect(resolveRewardedAdId('', true, 'ios')).toBeNull()
    expect(resolveRewardedAdId('   ', true, 'ios')).toBeNull()
    expect(resolveRewardedAdId(undefined, true, 'ios')).toBeNull()
    expect(resolveRewardedAdId('ios-real/1', true, 'ios')).toBe('ios-real/1')
    expect(resolveRewardedAdId('', false, 'ios')).toBe(TEST_REWARDED_AD_ID_IOS)
  })

  it('광고를 켜면 설정된 광고 단위 ID로 준비하고, 비어 있으면 테스트 빌드에서만 테스트 ID를 쓴다', async () => {
    mocks.adsEnabled = true
    mocks.native = true
    mocks.platform = 'android'
    setAdId('ca-app-pub-real/1')
    void useAdMob().showRewardedAd()
    await flushPromises()
    expect(mocks.prepare).toHaveBeenCalledWith(expect.objectContaining({ adId: 'ca-app-pub-real/1', npa: true }))
    mocks.listeners.get('dismissed')!()
    mocks.prepare.mockClear()
    setAdId('')
    void useAdMob().showRewardedAd()
    await flushPromises()
    expect(import.meta.env.PROD).toBe(false)
    expect(mocks.prepare).toHaveBeenCalledWith(expect.objectContaining({ adId: TEST_REWARDED_AD_ID }))
    mocks.listeners.get('dismissed')!()
  })
})

describe('바이너리 가용성과 구버전 보호', () => {
  it.each([
    ['ios', true, true, 'ios-real/1', true],
    ['ios', true, false, 'ios-real/1', false],
    ['ios', true, true, '', false],
    ['android', true, false, 'android-real/1', false],
    ['android', true, true, 'android-real/1', true],
    ['web', false, true, 'web/1', false],
    ['other', true, true, 'other/1', false],
  ] as const)('%s 네이티브=%s 플러그인=%s ID=%s → %s', (platform, native, plugin, configured, expected) => {
    const adId = resolveRewardedAdId(configured, true, platform)
    expect(isRewardedAdAvailable(native, plugin, platform, adId)).toBe(expected)
  })

  it.each(['ios', 'android', 'web'])('%s 플러그인이 없으면 보류를 보존하고 nonce·광고·ATT를 시작하지 않는다', async (platform) => {
    mocks.platform = platform
    mocks.native = platform !== 'web'
    mocks.pluginAvailable = false
    setAdId('android-real/1')
    useRuntimeConfig().public.admobRewardedAdIdIos = 'ios-real/1'
    const ad = useAdMob()
    expect(ad.isAvailable).toBe(false)
    await ad.initialize()
    expect(await ad.requestTrackingAuthorization()).toBeNull()
    expect(await ad.showRewardedAd()).toBe(false)
    for (const purpose of ['AD_REWARD', 'GROWTH_REVIVE'] as const) {
      const pending = { ...nonce({ purpose }), ...(purpose === 'GROWTH_REVIVE' ? { speciesCode: 'SPIRIT_A' } : {}) }
      writePendingAdClaim(purpose, 'u1', pending)
      await expect(ad.issueServerNonce(purpose)).rejects.toThrow('앱에서 이용할 수 있어요')
      expect(await ad.awaitNonceVerified(purpose, pending.nonce)).toBeNull()
      expect(readPendingAdClaim(purpose, 'u1')?.nonce).toBe(pending.nonce)
    }
    expect(mocks.issue).not.toHaveBeenCalled()
    expect(mocks.initialize).not.toHaveBeenCalled()
    expect(mocks.prepare).not.toHaveBeenCalled()
    expect(mocks.show).not.toHaveBeenCalled()
    expect(mocks.trackingStatus).not.toHaveBeenCalled()
    expect(mocks.requestTracking).not.toHaveBeenCalled()
  })
})

describe('iOS ATT와 광고 단위', () => {
  beforeEach(() => { mocks.platform = 'ios' })

  it('ATT 응답이 20초를 넘어도 실패하지 않고 응답 뒤 준비와 시청을 완료한다', async () => {
    let resolveTracking!: () => void
    let resolvePrepare!: () => void
    mocks.trackingStatus.mockResolvedValueOnce({ status: 'notDetermined' }).mockResolvedValue({ status: 'authorized' })
    mocks.requestTracking.mockReturnValueOnce(new Promise<void>((resolve) => { resolveTracking = resolve }))
    mocks.prepare.mockReturnValueOnce(new Promise<void>((resolve) => { resolvePrepare = resolve }))
    const settled = vi.fn()
    const result = useAdMob().showRewardedAd().then(settled)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(REWARD_AD_PREPARE_TIMEOUT_MS + 5000)
    expect(settled).not.toHaveBeenCalled()
    expect(mocks.requestTracking).toHaveBeenCalledTimes(1)
    expect(mocks.initialize).not.toHaveBeenCalled()
    expect(mocks.prepare).not.toHaveBeenCalled()
    expect(mocks.show).not.toHaveBeenCalled()

    resolveTracking()
    await flushPromises()
    expect(mocks.trackingStatus.mock.invocationCallOrder[1]).toBeLessThan(mocks.initialize.mock.invocationCallOrder[0]!)
    expect(mocks.prepare).toHaveBeenCalledWith(expect.objectContaining({ npa: false }))
    await vi.advanceTimersByTimeAsync(REWARD_AD_PREPARE_TIMEOUT_MS - 1)
    expect(settled).not.toHaveBeenCalled()
    resolvePrepare()
    await flushPromises()
    expect(mocks.show).toHaveBeenCalledTimes(1)
    mocks.listeners.get('rewarded')!()
    mocks.listeners.get('dismissed')!()
    await result
    expect(settled).toHaveBeenCalledExactlyOnceWith(true)
    expect(mocks.requestTracking).toHaveBeenCalledTimes(1)
    expect(mocks.remove).toHaveBeenCalledTimes(3)
  })

  it.each(['initialize', 'prepare'] as const)('긴 ATT 응답 뒤에도 %s의 준비 시한은 20초로 유지한다', async (step) => {
    let resolveTracking!: () => void
    let resolveStep!: () => void
    mocks.trackingStatus.mockResolvedValueOnce({ status: 'notDetermined' }).mockResolvedValue({ status: 'denied' })
    mocks.requestTracking.mockReturnValueOnce(new Promise<void>((resolve) => { resolveTracking = resolve }))
    mocks[step].mockReturnValueOnce(new Promise<void>((resolve) => { resolveStep = resolve }))
    const settled = vi.fn()
    const result = useAdMob().showRewardedAd().then(settled)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(REWARD_AD_PREPARE_TIMEOUT_MS + 5000)
    expect(settled).not.toHaveBeenCalled()
    resolveTracking()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(REWARD_AD_PREPARE_TIMEOUT_MS - 1)
    expect(settled).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await result
    expect(settled).toHaveBeenCalledExactlyOnceWith(false)
    resolveStep()
    await flushPromises()
    expect(mocks.show).not.toHaveBeenCalled()
    if (step === 'initialize') expect(mocks.prepare).not.toHaveBeenCalled()
  })

  it.each(['authorized', 'denied'])('같은 인스턴스와 다른 인스턴스의 동시 요청은 ATT 1회와 결과 %s를 공유한다', async (status) => {
    let resolveTracking!: () => void
    mocks.trackingStatus.mockResolvedValueOnce({ status: 'notDetermined' }).mockResolvedValue({ status })
    mocks.requestTracking.mockReturnValueOnce(new Promise<void>((resolve) => { resolveTracking = resolve }))
    const first = useAdMob()
    const second = useAdMob()
    const pending = Promise.all([
      first.requestTrackingAuthorization(),
      first.requestTrackingAuthorization(),
      second.requestTrackingAuthorization(),
    ])
    await flushPromises()
    expect(mocks.requestTracking).toHaveBeenCalledTimes(1)
    expect(mocks.initialize).not.toHaveBeenCalled()
    resolveTracking()
    expect(await pending).toEqual([status, status, status])
    expect(mocks.trackingStatus).toHaveBeenCalledTimes(2)
    for (const ad of [first, second]) {
      const result = ad.showRewardedAd()
      await flushPromises()
      expect(mocks.trackingStatus.mock.invocationCallOrder[1]).toBeLessThan(mocks.initialize.mock.invocationCallOrder[0]!)
      expect(mocks.prepare).toHaveBeenLastCalledWith(expect.objectContaining({ npa: status !== 'authorized' }))
      mocks.listeners.get('dismissed')!()
      expect(await result).toBe(false)
    }
    expect(mocks.requestTracking).toHaveBeenCalledTimes(1)
    expect(mocks.trackingStatus).toHaveBeenCalledTimes(2)
  })

  it.each(['authorized', 'denied', 'restricted', 'notDetermined'])('ATT %s에서 재요청 없이 광고를 계속한다', async (status) => {
    mocks.trackingStatus.mockResolvedValue({ status })
    useRuntimeConfig().public.admobRewardedAdIdIos = 'ios-real/1'
    setAdId('android-real/1')
    const ad = useAdMob()
    expect(ad.isAvailable).toBe(true)
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = ad.showRewardedAd()
      await flushPromises()
      expect(mocks.prepare).toHaveBeenLastCalledWith(expect.objectContaining({ adId: 'ios-real/1', npa: status !== 'authorized' }))
      mocks.listeners.get('dismissed')!()
      expect(await result).toBe(false)
    }
    expect(mocks.requestTracking).toHaveBeenCalledTimes(status === 'notDetermined' ? 1 : 0)
    expect(mocks.trackingStatus.mock.invocationCallOrder[0]).toBeLessThan(mocks.initialize.mock.invocationCallOrder[0]!)
    if (status === 'notDetermined') expect(mocks.requestTracking.mock.invocationCallOrder[0]).toBeLessThan(mocks.initialize.mock.invocationCallOrder[0]!)
  })

  it.each(['authorized', 'denied', 'restricted'])('미결정 프롬프트 결과 %s를 SDK 초기화 전에 반영한다', async (status) => {
    mocks.trackingStatus.mockResolvedValueOnce({ status: 'notDetermined' }).mockResolvedValue({ status })
    const ad = useAdMob()
    const result = ad.showRewardedAd()
    await flushPromises()
    expect(mocks.requestTracking).toHaveBeenCalledTimes(1)
    expect(mocks.trackingStatus.mock.invocationCallOrder[1]).toBeLessThan(mocks.initialize.mock.invocationCallOrder[0]!)
    expect(mocks.prepare).toHaveBeenCalledWith(expect.objectContaining({ adId: TEST_REWARDED_AD_ID_IOS, npa: status !== 'authorized' }))
    mocks.listeners.get('dismissed')!()
    expect(await result).toBe(false)
  })

  it('ATT 확인 실패는 비개인화로 계속하고 같은 초기화의 요청을 공유한다', async () => {
    mocks.trackingStatus.mockRejectedValue(new Error('상태 확인 실패'))
    const ad = useAdMob()
    await Promise.all([ad.requestTrackingAuthorization(), ad.requestTrackingAuthorization()])
    const result = ad.showRewardedAd()
    await flushPromises()
    expect(mocks.trackingStatus).toHaveBeenCalledTimes(1)
    expect(mocks.requestTracking).not.toHaveBeenCalled()
    expect(mocks.prepare).toHaveBeenCalledWith(expect.objectContaining({ npa: true }))
    mocks.listeners.get('dismissed')!()
    expect(await result).toBe(false)
  })
})
