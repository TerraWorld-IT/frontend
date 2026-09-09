import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import capacitorPlugin from '~/plugins/capacitor.client'

const mocks = vi.hoisted(() => ({ native: false, recover: vi.fn().mockResolvedValue(undefined), pushListener: vi.fn() }))
const isLoggedIn = ref<boolean>(false)
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => 'android' } }))
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn() } }))
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: { addListener: mocks.pushListener } }))
vi.mock('@capacitor/keyboard', () => ({ Keyboard: { addListener: vi.fn() } }))
mockNuxtImport('useAuth', () => () => ({ isLoggedIn, loadJwt: async () => null }))
mockNuxtImport('useBackButtonStack', () => () => ({ popTopBackHandler: () => false }))
mockNuxtImport('useGtagEvents', () => () => ({ trackPushRegistrationFailed: vi.fn() }))
mockNuxtImport('recoverPendingPurchases', () => mocks.recover)

describe('Capacitor 구매 복구 초기화', () => {
  it('Push 초기화 예외 후에도 로그인 시 미완료 IAP를 복구한다', async () => {
    mocks.native = true
    mocks.pushListener.mockImplementation(() => { throw new Error('push unavailable') })
    await capacitorPlugin({} as never)
    expect(mocks.pushListener).toHaveBeenCalled()
    expect(mocks.recover).not.toHaveBeenCalled()
    isLoggedIn.value = true
    await nextTick()
    expect(mocks.recover).toHaveBeenCalledOnce()
  })
})
