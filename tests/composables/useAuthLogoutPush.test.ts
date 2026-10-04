import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { STORAGE_KEYS } from '~/utils/constants'
import { useAuth } from '~/composables/useAuth'

// B4: 로그아웃 시 기기 비활성화 실패(반환 error·예외)를 사용자별 보류 키로 남기고 로그아웃은 계속한다.
// 실제 useNative(deactivateDevicesOnce·보류 키)를 쓰고 플랫폼과 SDK 호출만 대체한다.
const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  deactivateMyDevices: vi.fn(),
  native: false,
  platform: 'web',
  userId: 'user-a' as string | undefined,
}))
vi.mock('@capacitor/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@capacitor/core')>()),
  Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => mocks.platform, isPluginAvailable: () => false },
}))
vi.mock('@terraworld-it/openapi-frontend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@terraworld-it/openapi-frontend')>()),
  deactivateMyDevices: mocks.deactivateMyDevices,
}))
vi.mock('~/lib/auth-client', () => ({ authClient: {
  signOut: mocks.signOut,
  // 앱 초기화(세션 플러그인·미들웨어)가 쓰는 최소 표면.
  useSession: () => ref({ data: null }), getSession: async () => ({ data: null }),
} }))
vi.mock('~/stores/user', () => ({ useUserStore: () => ({ me: mocks.userId ? { userId: mocks.userId } : null, reset: vi.fn() }) }))

const pendingKey = STORAGE_KEYS.PUSH_LOGOUT_PENDING_PREFIX + 'user-a'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.native = true
  mocks.platform = 'android'
  mocks.userId = 'user-a'
  mocks.signOut.mockResolvedValue({ error: null })
  mocks.deactivateMyDevices.mockResolvedValue({ error: undefined })
  localStorage.removeItem(pendingKey)
})
afterEach(() => {
  mocks.native = false
  mocks.platform = 'web'
  localStorage.removeItem(pendingKey)
})

describe('로그아웃 기기 비활성화 실패 보류', () => {
  it('비활성화가 성공하면 보류를 남기지 않는다', async () => {
    await useAuth().signOutAndClear()
    expect(mocks.deactivateMyDevices).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(pendingKey)).toBeNull()
    expect(mocks.signOut).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['반환 error', () => mocks.deactivateMyDevices.mockResolvedValueOnce({ error: { message: 'failed' } })],
    ['예외', () => mocks.deactivateMyDevices.mockRejectedValueOnce(new TypeError('network'))],
  ] as const)('%s 로 실패해도 로그아웃은 계속하고 사용자별 보류 키를 남긴다', async (_label, arrange) => {
    arrange()
    await expect(useAuth().signOutAndClear()).resolves.toBeUndefined()
    expect(localStorage.getItem(pendingKey)).toBe('1')
    expect(mocks.signOut).toHaveBeenCalledTimes(1)
    expect(useAuth().isLoggedIn.value).toBe(false)
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_LOGOUT_PENDING_PREFIX + 'user-b')).toBeNull()
  })

  it('다음 로그아웃의 비활성화가 성공하면 남은 보류를 지운다', async () => {
    localStorage.setItem(pendingKey, '1')
    await useAuth().signOutAndClear()
    expect(localStorage.getItem(pendingKey)).toBeNull()
  })

  it('iOS 는 재시도 경로(Android 푸시 등록)가 없어 보류 키를 남기지 않는다', async () => {
    mocks.platform = 'ios'
    mocks.deactivateMyDevices.mockResolvedValueOnce({ error: { message: 'failed' } })
    await useAuth().signOutAndClear()
    expect(mocks.deactivateMyDevices).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(pendingKey)).toBeNull()
    expect(mocks.signOut).toHaveBeenCalledTimes(1)
  })

  it('웹·사용자 미상이면 비활성화를 시도하지 않는다', async () => {
    mocks.native = false
    mocks.platform = 'web'
    await useAuth().signOutAndClear()
    mocks.native = true
    mocks.platform = 'android'
    mocks.userId = undefined
    await useAuth().signOutAndClear()
    expect(mocks.deactivateMyDevices).not.toHaveBeenCalled()
    expect(localStorage.getItem(pendingKey)).toBeNull()
  })
})
