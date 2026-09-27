import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LoginPage from '~/pages/auth/login.vue'
import ItemsPage from '~/pages/admin/items.vue'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), signIn: vi.fn(), signUp: vi.fn(), navigate: vi.fn(),
  createItem: vi.fn(), listAllItems: vi.fn(), listCategories: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('~/lib/auth-client', () => ({ authClient: {
  getSession: mocks.getSession,
  signIn: { email: mocks.signIn },
  signUp: { email: mocks.signUp },
} }))
vi.mock('~/stores/items', () => ({ useItemsStore: () => ({ invalidate: vi.fn() }) }))
mockNuxtImport('useAuth', () => () => ({ loadJwt: vi.fn(async () => 'test-token') }))
mockNuxtImport('useNative', () => () => ({ registerPushIfGranted: vi.fn(async () => undefined) }))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('navigateTo', () => mocks.navigate)
mockNuxtImport('dismissKeyboard', () => vi.fn())
mockNuxtImport('useGtagEvents', () => () => ({ trackLogin: vi.fn(), trackSignup: vi.fn() }))
mockNuxtImport('useOpenApi', () => () => ({
  sdk: { createItem: mocks.createItem, listAllItems: mocks.listAllItems, listCategories: mocks.listCategories },
  client: {},
}))
mockNuxtImport('useItemAsset', () => () => ({ resolveItemImage: vi.fn(), onAssetError: vi.fn() }))

let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSession.mockResolvedValue({ data: null })
  mocks.signIn.mockResolvedValue({ error: null })
  mocks.signUp.mockResolvedValue({ error: null })
  mocks.listAllItems.mockResolvedValue({ data: { items: [] }, error: null })
  mocks.listCategories.mockResolvedValue({ data: { categories: [] }, error: null })
  mocks.createItem.mockResolvedValue({ data: null, error: null })
})
afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
})

function enter(input: Element, composing: boolean, keyCode?: number, key = 'Enter'): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, isComposing: composing })
  if (keyCode !== undefined) Object.defineProperty(event, 'keyCode', { value: keyCode })
  input.dispatchEvent(event)
  return event
}

describe('한글 IME Enter 제출', () => {
  it.each(['login', 'signup'] as const)('%s 폼은 조합 중 Enter를 막고 확정 후 한 번 제출한다', async (mode) => {
    wrapper = await mountSuspended(LoginPage, { attachTo: document.body, shallow: true })
    await flushPromises()
    if (mode === 'signup') {
      await wrapper.get('button[type="button"]').trigger('click')
      await wrapper.get('#auth-nickname').setValue('테스트')
      await wrapper.get('#auth-birthDate').setValue('2000-01-01')
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      await checkboxes[1]!.setValue(true)
      await checkboxes[2]!.setValue(true)
    }
    await wrapper.get('#auth-email').setValue('test@example.com')
    await wrapper.get('#auth-password').setValue('password123')
    const input = wrapper.get(mode === 'signup' ? '#auth-nickname' : '#auth-email').element
    expect(enter(input, true).defaultPrevented).toBe(true)
    expect(enter(input, false, 229).defaultPrevented).toBe(true)
    expect(enter(input, false, 229, 'Process').defaultPrevented).toBe(false)
    expect(enter(input, true, 229, '한').defaultPrevented).toBe(false)
    expect(enter(input, true, 229, 'Backspace').defaultPrevented).toBe(false)
    expect(mocks.signIn).not.toHaveBeenCalled()
    expect(mocks.signUp).not.toHaveBeenCalled()
    expect(enter(input, false).defaultPrevented).toBe(false)
    wrapper.get('form').element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(mode === 'login' ? mocks.signIn : mocks.signUp).toHaveBeenCalledTimes(1)
  })

  it('관리자 아이템 폼도 조합 중 Enter를 막고 확정 후 한 번 제출한다', async () => {
    wrapper = await mountSuspended(ItemsPage, {
      attachTo: document.body,
      shallow: true,
      global: { stubs: { CommonModal: { template: '<div><slot /></div>' } } },
    })
    await flushPromises()
    const form = wrapper.get('form')
    const input = form.get('input[type="text"]').element
    await form.get('input[type="text"]').setValue('테스트')
    const asset = form.findAll('input[type="text"]')[2]!
    await asset.setValue('/item.png')
    expect(enter(input, true).defaultPrevented).toBe(true)
    expect(enter(input, false, 229).defaultPrevented).toBe(true)
    expect(enter(input, false, 229, 'Process').defaultPrevented).toBe(false)
    expect(enter(input, true, 229, '한').defaultPrevented).toBe(false)
    expect(enter(input, true, 229, 'Backspace').defaultPrevented).toBe(false)
    expect(mocks.createItem).not.toHaveBeenCalled()
    expect(enter(input, false).defaultPrevented).toBe(false)
    form.element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(mocks.createItem).toHaveBeenCalledTimes(1)
  })

  it('로그인 시한 초과 뒤 기존 오류를 알리고 다시 제출할 수 있다', async () => {
    mocks.signIn.mockRejectedValueOnce(new Error('withTimeout: deadline exceeded'))
    wrapper = await mountSuspended(LoginPage, { attachTo: document.body, shallow: true })
    await flushPromises()
    await wrapper.get('#auth-email').setValue('test@example.com')
    await wrapper.get('#auth-password').setValue('password123')
    const form = wrapper.get('form')
    form.element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(mocks.toast.error).toHaveBeenCalledWith('로그인에 실패했습니다')
    expect(form.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    form.element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(mocks.signIn).toHaveBeenCalledTimes(2)
  })
})
