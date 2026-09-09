import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import SettingsPage from '~/pages/profile/settings.vue'
import { STORAGE_KEYS } from '~/utils/constants'
import { deactivateDevicesOnce } from '~/composables/useNative'

type SettingsSession = { data: { user: { id: string; pushConsent: boolean; adConsent: boolean } } | null }

const mocks = vi.hoisted(() => ({
  session: null as Ref<SettingsSession> | null,
  platform: 'web', native: false,
  isLoggedIn: null as Ref<boolean> | null, getJwt: vi.fn(), getSession: vi.fn(),
  deleteUser: vi.fn(), updateUser: vi.fn(), signOutAndClear: vi.fn(),
  deactivateMyDevices: vi.fn(), registerPush: vi.fn(), registerPushIfGranted: vi.fn(), getAppInfo: vi.fn(),
  invalidatePushRegistration: vi.fn(),
  betterAuth: vi.fn((options: unknown) => options),
  client: { request: vi.fn() },
  navigate: vi.fn(), toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
vi.mock('@capacitor/core', () => ({ Capacitor: {
  getPlatform: () => mocks.platform, isNativePlatform: () => mocks.native,
} }))
vi.mock('better-auth', () => ({ betterAuth: mocks.betterAuth }))
vi.mock('better-auth/plugins', () => ({ jwt: vi.fn(), bearer: vi.fn() }))
vi.mock('pg', () => ({ Pool: class {} }))
vi.mock('@terraworld-it/openapi-frontend', () => ({ deactivateMyDevices: mocks.deactivateMyDevices }))
vi.mock('~/lib/auth-client', () => ({ authClient: {
  useSession: () => mocks.session ??= ref<SettingsSession>({ data: { user: { id: 'user-a', pushConsent: true, adConsent: true } } }),
  deleteUser: mocks.deleteUser, updateUser: mocks.updateUser,
  getSession: mocks.getSession,
} }))
mockNuxtImport('useAuth', () => () => ({ isLoggedIn: mocks.isLoggedIn ??= ref<boolean>(true), getJwt: mocks.getJwt, signOutAndClear: mocks.signOutAndClear }))
mockNuxtImport('useOpenApi', () => () => ({ sdk: { deactivateMyDevices: mocks.deactivateMyDevices }, client: mocks.client }))
mockNuxtImport('useNative', () => () => ({
  registerPush: mocks.registerPush, registerPushIfGranted: mocks.registerPushIfGranted, getAppInfo: mocks.getAppInfo,
  invalidatePushRegistration: mocks.invalidatePushRegistration,
  deactivateDevicesOnce,
}))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('navigateTo', () => mocks.navigate)
mockNuxtImport('useDialogFocusTrap', () => () => undefined)
mockNuxtImport('useBackButtonStack', () => () => ({ pushBackHandler: () => () => undefined }))
mockNuxtImport('dismissKeyboard', () => vi.fn())

let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.clearAllMocks()
  mocks.platform = 'web'
  mocks.native = false
  mocks.isLoggedIn = ref<boolean>(true)
  mocks.getJwt.mockReset().mockReturnValue('jwt-a')
  mocks.getSession.mockReset().mockImplementation(async () => mocks.session!.value)
  mocks.session = ref<SettingsSession>({ data: { user: { id: 'user-a', pushConsent: true, adConsent: true } } })
  localStorage.removeItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a')
  localStorage.removeItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-b')
  mocks.deleteUser.mockReset().mockResolvedValue({ error: null })
  mocks.updateUser.mockReset().mockResolvedValue({ error: null })
  mocks.deactivateMyDevices.mockReset().mockResolvedValue({ error: undefined })
  mocks.signOutAndClear.mockReset().mockResolvedValue(undefined)
  mocks.registerPush.mockReset().mockImplementation(async () => mocks.native && mocks.platform === 'android' ? { receive: 'granted' } : null)
  mocks.registerPushIfGranted.mockReset().mockImplementation(async () => mocks.native && mocks.platform === 'android')
  mocks.getAppInfo.mockReset().mockResolvedValue({ version: '1.2.3', build: '42' })
})

describe('계정 삭제 서버 훅', () => {
  async function loadDeletionHooks() {
    vi.stubEnv('DATABASE_URL', 'postgres://test.invalid/test')
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-only-secret-for-deletion-hooks')
    vi.stubEnv('INTERNAL_API_TOKEN', 'test-only-internal-token')
    try {
      const { auth } = await import('../../server/lib/auth')
      return auth as unknown as {
        hooks: { before: (ctx: { path: string; body?: unknown; context: object }) => Promise<unknown> }
        user: { deleteUser: { beforeDelete: (user: { id: string }) => Promise<void> } }
      }
    }
    finally {
      vi.unstubAllEnvs()
    }
  }

  it.each([undefined, {}, { password: '' }, { password: '   ' }, { password: 123 }])('비밀번호가 없는 삭제 요청 %j를 거절한다', async (body) => {
    const config = await loadDeletionHooks()
    await expect(config.hooks.before({ path: '/delete-user', body, context: {} })).rejects.toMatchObject({ status: 'BAD_REQUEST', body: { code: 'PASSWORD_REQUIRED', message: '비밀번호를 입력해 주세요' } })
  })

  it('입력된 비밀번호와 다른 엔드포인트는 기존 인증 경로로 넘긴다', async () => {
    const config = await loadDeletionHooks()
    await expect(config.hooks.before({ path: '/delete-user', body: { password: 'provided-password' }, context: {} })).resolves.toBeUndefined()
    await expect(config.hooks.before({ path: '/update-user', body: {}, context: {} })).resolves.toBeUndefined()
  })

  it.each([200, 204, 299, 300, 304, 400, 500])('도메인 삭제 상태 %i는 2xx일 때만 통과한다', async (status) => {
    const config = await loadDeletionHooks()
    const raw = vi.fn().mockResolvedValue({ status })
    vi.stubGlobal('$fetch', Object.assign(vi.fn(), { raw }))
    try {
      const deletion = config.user.deleteUser.beforeDelete({ id: 'user/id' })
      if (status >= 200 && status < 300) await expect(deletion).resolves.toBeUndefined()
      else await expect(deletion).rejects.toMatchObject({ status: 'INTERNAL_SERVER_ERROR' })
      expect(raw).toHaveBeenCalledWith(expect.stringContaining('/api/v1/internal/users/user%2Fid'), expect.objectContaining({ method: 'DELETE', redirect: 'error', timeout: 5000, retry: 2 }))
    }
    finally {
      vi.unstubAllGlobals()
    }
  })
})
afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
})

async function mountSettings() {
  wrapper = await mountSuspended(SettingsPage, {
    attachTo: document.body,
    global: { stubs: { teleport: true } },
  })
  await flushPromises()
  return wrapper
}

describe('계정 설정', () => {
  it('JWT 발급 전 isLoggedIn이 false여도 세션 사용자가 있으면 삭제 버튼만 표시한다', async () => {
    mocks.isLoggedIn!.value = false
    const w = await mountSettings()
    expect(w.find('[data-testid="delete-account"]').exists()).toBe(true)
    expect(w.find('a[href="/auth/login"]').exists()).toBe(false)
  })

  it('세션 사용자가 없으면 삭제 버튼을 숨기고 로그인 링크를 표시한다', async () => {
    mocks.session!.value = { data: null }
    const w = await mountSettings()
    expect(w.find('[data-testid="delete-account"]').exists()).toBe(false)
    expect(w.find('a[href="/auth/login"]').exists()).toBe(true)
  })

  it('처리방침·약관·버전·삭제 행과 웹 버전을 표시한다', async () => {
    const w = await mountSettings()
    for (const text of ['개인정보 처리방침', '이용약관', '앱 버전', '계정 삭제', '웹']) expect(w.text()).toContain(text)
    expect(w.get('a[href="/legal/privacy"]').text()).toBe('개인정보 처리방침')
    expect(w.get('a[href="/legal/terms"]').text()).toBe('이용약관')
    expect(w.find('[data-testid="consent-push"]').exists()).toBe(false)
    expect(w.find('[data-testid="consent-adId"]').exists()).toBe(false)
  })

  it('삭제 pending 중 중복 요청과 닫기를 막고 비밀번호 오류 후 재시도 성공 시 로그인으로 이동한다', async () => {
    let resolve!: (value: { error: { code: string } }) => void
    mocks.deleteUser.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const w = await mountSettings()
    await w.get('[data-testid="delete-account"]').trigger('click')
    expect(w.get('[role="dialog"]').text()).toContain('복구할 수 없습니다')
    const confirm = w.get('[role="dialog"] button[autofocus]')
    expect(confirm.attributes('disabled')).toBeDefined()
    await w.get('#delete-account-password').setValue('wrong-password')
    await w.get('[role="dialog"] button[autofocus]').trigger('click')
    await w.get('[role="dialog"] button[autofocus]').trigger('click')
    await w.get('[data-testid="modal-backdrop"]').trigger('click')
    expect(w.find('[role="dialog"]').exists()).toBe(true)
    expect(w.get('[role="dialog"] button[autofocus]').attributes('disabled')).toBeDefined()
    expect(w.get('#delete-account-password').attributes('disabled')).toBeDefined()
    expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith({ password: 'wrong-password' })
    resolve({ error: { code: 'INVALID_PASSWORD' } })
    await flushPromises()
    expect(mocks.toast.error).toHaveBeenCalledWith('비밀번호가 올바르지 않습니다.')
    expect(mocks.signOutAndClear).not.toHaveBeenCalled()
    expect(w.find('[role="dialog"]').exists()).toBe(true)
    await w.get('#delete-account-password').setValue('correct-password')
    await w.get('[role="dialog"] button[autofocus]').trigger('click')
    await flushPromises()
    expect(mocks.deleteUser).toHaveBeenLastCalledWith({ password: 'correct-password' })
    expect(mocks.signOutAndClear).toHaveBeenCalledTimes(1)
    expect(mocks.navigate).toHaveBeenCalledWith('/auth/login')
    expect(w.find('[role="dialog"]').exists()).toBe(false)
  })

  it('삭제 서버 오류는 계정을 유지하고 일반 오류를 알린다', async () => {
    mocks.deleteUser.mockResolvedValueOnce({ error: { code: 'INTERNAL_SERVER_ERROR' } })
    const w = await mountSettings()
    await w.get('[data-testid="delete-account"]').trigger('click')
    await w.get('#delete-account-password').setValue('password')
    await w.get('[role="dialog"] button[autofocus]').trigger('click')
    await flushPromises()
    expect(mocks.toast.error).toHaveBeenCalledWith('계정 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.')
    expect(mocks.signOutAndClear).not.toHaveBeenCalled()
    expect(w.find('[role="dialog"]').exists()).toBe(true)
    expect((w.get('#delete-account-password').element as HTMLInputElement).value).toBe('password')
    expect(w.get('[role="dialog"] button[autofocus]').attributes('disabled')).toBeUndefined()
    await w.get('[data-testid="modal-close"]').trigger('click')
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    await w.get('[data-testid="delete-account"]').trigger('click')
    expect((w.get('#delete-account-password').element as HTMLInputElement).value).toBe('')
  })

  it('공백 비밀번호는 서버 호출 없이 입력 안내를 표시한다', async () => {
    const w = await mountSettings()
    await w.get('[data-testid="delete-account"]').trigger('click')
    await w.get('#delete-account-password').setValue('   ')
    await w.get('[role="dialog"] button[autofocus]').trigger('click')
    await flushPromises()
    expect(mocks.toast.error).toHaveBeenCalledWith('비밀번호를 입력해 주세요')
    expect(mocks.deleteUser).not.toHaveBeenCalled()
    expect(mocks.signOutAndClear).not.toHaveBeenCalled()
    expect(w.find('[role="dialog"]').exists()).toBe(true)
    await w.get('#delete-account-password').setValue('correct-password')
    await w.get('[role="dialog"] button[autofocus]').trigger('click')
    await flushPromises()
    expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith({ password: 'correct-password' })
    expect(mocks.navigate).toHaveBeenCalledWith('/auth/login')
    expect(w.find('[role="dialog"]').exists()).toBe(false)
  })

  it('서버 PASSWORD_REQUIRED 오류를 비밀번호 입력 안내로 표시한다', async () => {
    mocks.deleteUser.mockResolvedValueOnce({ error: { code: 'PASSWORD_REQUIRED' } })
    const w = await mountSettings()
    await w.get('[data-testid="delete-account"]').trigger('click')
    await w.get('#delete-account-password').setValue('password')
    await w.get('[role="dialog"] button[autofocus]').trigger('click')
    await flushPromises()
    expect(mocks.toast.error).toHaveBeenCalledWith('비밀번호를 입력해 주세요')
    expect(mocks.signOutAndClear).not.toHaveBeenCalled()
  })

  it('iOS에서는 푸시·광고 동의 토글을 숨기고 앱 버전과 빌드를 표시한다', async () => {
    mocks.platform = 'ios'; mocks.native = true
    const w = await mountSettings()
    expect(w.find('[data-testid="consent-push"]').exists()).toBe(false)
    expect(w.find('[data-testid="consent-adId"]').exists()).toBe(false)
    expect(w.find('[data-testid="consent-photo"]').exists()).toBe(true)
    expect(w.text()).toContain('1.2.3 (42)')
  })

  it('푸시 OFF는 동의를 먼저 저장하고 모든 디바이스를 비활성화한다', async () => {
    mocks.platform = 'android'; mocks.native = true
    let resolve!: (value: object) => void
    mocks.deactivateMyDevices.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const w = await mountSettings()
    await w.get('[data-testid="consent-push"]').setValue(false)
    await flushPromises()
    expect(mocks.deactivateMyDevices).toHaveBeenCalledExactlyOnceWith({ client: mocks.client })
    expect(mocks.invalidatePushRegistration).toHaveBeenCalledExactlyOnceWith('user-a')
    expect(mocks.invalidatePushRegistration.mock.invocationCallOrder[0]).toBeLessThan(mocks.updateUser.mock.invocationCallOrder[0]!)
    expect(mocks.updateUser.mock.invocationCallOrder[0]).toBeLessThan(mocks.deactivateMyDevices.mock.invocationCallOrder[0]!)
    expect(mocks.updateUser).toHaveBeenCalledExactlyOnceWith({ pushConsent: false })
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a')).toBe('1')
    resolve({})
    await flushPromises()
    expect(mocks.updateUser).toHaveBeenCalledExactlyOnceWith({ pushConsent: false })
    expect(mocks.registerPush).not.toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a')).toBeNull()
  })

  it('비활성화 실패 시 동의 OFF와 사용자별 보류 키를 유지한다', async () => {
    mocks.platform = 'android'; mocks.native = true
    mocks.deactivateMyDevices.mockResolvedValueOnce({ error: { message: 'failed' } })
    const w = await mountSettings()
    await w.get('[data-testid="consent-push"]').setValue(false)
    await flushPromises()
    expect(mocks.updateUser).toHaveBeenCalledExactlyOnceWith({ pushConsent: false })
    expect((w.get('[data-testid="consent-push"]').element as HTMLInputElement).checked).toBe(false)
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a')).toBe('1')
    expect(w.get('[data-testid="retry-push-consent"]').text()).toContain('다시 시도')
    expect(mocks.toast.error).toHaveBeenCalledWith('푸시 알림 해제에 실패했어요. 다시 시도해 주세요.')
  })

  it('푸시 ON 권한 거절 시 동의를 저장하지 않고 토글을 복원한다', async () => {
    mocks.platform = 'android'; mocks.native = true
    const w = await mountSettings()
    await w.get('[data-testid="consent-push"]').setValue(false)
    await flushPromises()
    mocks.updateUser.mockClear()
    mocks.registerPush.mockResolvedValueOnce({ receive: 'denied' })
    await w.get('[data-testid="consent-push"]').setValue(true)
    await flushPromises()
    expect(mocks.registerPush).toHaveBeenCalledTimes(1)
    expect(mocks.updateUser).not.toHaveBeenCalled()
    expect((w.get('[data-testid="consent-push"]').element as HTMLInputElement).checked).toBe(false)
    expect(mocks.toast.info).toHaveBeenCalled()
  })

  it.each(['응답 오류', '네트워크 오류'])('OFF 동의 저장 %s 시 디바이스를 해제하지 않고 동의 저장부터 재시도한다', async (failure) => {
    mocks.platform = 'android'; mocks.native = true
    if (failure === '응답 오류') mocks.updateUser.mockResolvedValueOnce({ error: { message: 'failed' } })
    else mocks.updateUser.mockRejectedValueOnce(new Error('network'))
    const w = await mountSettings()
    expect(w.find('[data-testid="consent-adId"]').exists()).toBe(true)
    await w.get('[data-testid="consent-push"]').setValue(false)
    await flushPromises()
    expect((w.get('[data-testid="consent-push"]').element as HTMLInputElement).checked).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a')).toBeNull()
    expect(mocks.deactivateMyDevices).not.toHaveBeenCalled()
    expect(mocks.toast.error).toHaveBeenCalledWith(failure === '응답 오류' ? 'failed' : 'network')
    await w.get('[data-testid="consent-push"]').setValue(false)
    await flushPromises()
    expect(mocks.deactivateMyDevices).toHaveBeenCalledTimes(1)
    expect(mocks.updateUser).toHaveBeenCalledTimes(2)
    expect(mocks.updateUser).toHaveBeenLastCalledWith({ pushConsent: false })
    expect(mocks.registerPush).not.toHaveBeenCalled()
    expect(w.find('[data-testid="retry-push-consent"]').exists()).toBe(false)
    expect((w.get('[data-testid="consent-push"]').element as HTMLInputElement).checked).toBe(false)
  })

  it.each(['화면', '자동'])('%s 재시도 중 다른 경로가 진입해도 디바이스 해제는 한 번만 호출한다', async (firstPath) => {
    mocks.platform = 'android'; mocks.native = true
    mocks.session!.value = { data: { user: { id: 'user-a', pushConsent: false, adConsent: true } } }
    localStorage.setItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a', '1')
    let resolve!: (value: object) => void
    mocks.deactivateMyDevices.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const { useNative: useNativeActual } = await vi.importActual<typeof import('~/composables/useNative')>('~/composables/useNative')
    const native = useNativeActual()
    let automatic: Promise<boolean>
    if (firstPath === '자동') {
      automatic = native.registerPushIfGranted()
      await flushPromises()
      await mountSettings()
    }
    else {
      await mountSettings()
      automatic = native.registerPushIfGranted()
      await flushPromises()
    }
    expect(mocks.getSession).toHaveBeenCalledTimes(1)
    expect(mocks.deactivateMyDevices).toHaveBeenCalledTimes(1)
    expect(mocks.updateUser).not.toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a')).toBe('1')
    resolve({})
    expect(await automatic).toBe(false)
    await flushPromises()
    expect(mocks.deactivateMyDevices).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a')).toBeNull()
    expect(wrapper!.find('[data-testid="retry-push-consent"]').exists()).toBe(false)
  })

  it.each(['응답 오류', '네트워크 오류'])('디바이스 해제 %s 후 재진입해도 OFF와 재시도를 표시하고 해제 단계만 재시도한다', async (failure) => {
    mocks.platform = 'android'; mocks.native = true
    if (failure === '응답 오류') mocks.deactivateMyDevices.mockResolvedValue({ error: { message: 'failed' } })
    else mocks.deactivateMyDevices.mockRejectedValue(new Error('network'))
    const first = await mountSettings()
    await first.get('[data-testid="consent-push"]').setValue(false)
    await flushPromises()
    first.unmount()
    // 서버 동의가 OFF로 갱신된 뒤 화면을 다시 마운트한다.
    mocks.session!.value = { data: { user: { id: 'user-a', pushConsent: false, adConsent: true } } }
    const w = await mountSettings()
    expect(mocks.updateUser).toHaveBeenCalledExactlyOnceWith({ pushConsent: false })
    expect(mocks.deactivateMyDevices).toHaveBeenCalledTimes(2)
    expect((w.get('[data-testid="consent-push"]').element as HTMLInputElement).checked).toBe(false)
    expect(w.get('[data-testid="consent-push"]').attributes('disabled')).toBeDefined()
    expect(w.get('[data-testid="retry-push-consent"]').text()).toContain('다시 시도')
    mocks.deactivateMyDevices.mockResolvedValueOnce({})
    await w.get('[data-testid="retry-push-consent"]').trigger('click')
    await flushPromises()
    expect(mocks.updateUser).toHaveBeenCalledTimes(1)
    expect(mocks.deactivateMyDevices).toHaveBeenCalledTimes(3)
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a')).toBeNull()
    expect(w.find('[data-testid="retry-push-consent"]').exists()).toBe(false)
    expect((w.get('[data-testid="consent-push"]').element as HTMLInputElement).checked).toBe(false)
  })

  it.each([false, true])('첫 동의 저장 대기 중 세션 교체 후 디바이스 해제 오류 %s여도 현재 토글은 OFF다', async (failed) => {
    mocks.platform = 'android'; mocks.native = true
    let resolve!: (value: object) => void
    mocks.updateUser.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    mocks.deactivateMyDevices.mockResolvedValueOnce(failed ? { error: { message: 'failed' } } : {})
    const w = await mountSettings()
    await w.get('[data-testid="consent-push"]').setValue(false)
    mocks.session!.value = { data: { user: { id: 'user-a', pushConsent: true, adConsent: false } } }
    await flushPromises()
    expect((w.get('[data-testid="consent-push"]').element as HTMLInputElement).checked).toBe(false)
    expect(mocks.deactivateMyDevices).not.toHaveBeenCalled()
    resolve({ error: null })
    await flushPromises()
    expect((w.get('[data-testid="consent-push"]').element as HTMLInputElement).checked).toBe(false)
    expect(w.find('[data-testid="retry-push-consent"]').exists()).toBe(failed)
  })

  it('A의 보류 상태가 있는 설정 화면에서 B로 전환하면 B의 동의와 토글을 복원한다', async () => {
    mocks.platform = 'android'; mocks.native = true
    mocks.deactivateMyDevices.mockResolvedValue({ error: { message: 'failed' } })
    const w = await mountSettings()
    await w.get('[data-testid="consent-push"]').setValue(false)
    await flushPromises()
    mocks.session!.value = { data: { user: { id: 'user-b', pushConsent: true, adConsent: true } } }
    await flushPromises()
    expect((w.get('[data-testid="consent-push"]').element as HTMLInputElement).checked).toBe(true)
    expect(w.find('[data-testid="retry-push-consent"]').exists()).toBe(false)
    expect(mocks.deactivateMyDevices).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a')).toBe('1')
  })

  it.each([true, false])('삭제 성공 여부 %s에 따라 활동 캐시만 제거한다', async (succeeded) => {
    const keys = ['tw.todos.user-a', 'tw.todos.user-b', STORAGE_KEYS.ONBOARDING_DONE, STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-a', STORAGE_KEYS.PUSH_OFF_PENDING_PREFIX + 'user-b', STORAGE_KEYS.THEME, 'unrelated-setting']
    for (const key of keys) localStorage.setItem(key, 'preserved')
    if (!succeeded) mocks.deleteUser.mockResolvedValueOnce({ error: { code: 'INTERNAL_SERVER_ERROR' } })
    const w = await mountSettings()
    await w.get('[data-testid="delete-account"]').trigger('click')
    await w.get('#delete-account-password').setValue('password')
    await w.get('[role="dialog"] button[autofocus]').trigger('click')
    await flushPromises()
    for (const key of keys.slice(0, 5)) expect(localStorage.getItem(key)).toBe(succeeded ? null : 'preserved')
    for (const key of keys.slice(5)) expect(localStorage.getItem(key)).toBe('preserved')
    for (const key of keys) localStorage.removeItem(key)
  })
})
