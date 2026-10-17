import { describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import DefaultLayout from '~/layouts/default.vue'

mockNuxtImport('useNative', () => () => ({ hapticImpact: vi.fn() }))

describe('하단 탭 투어 대상', () => {
  it('다섯 탭 링크에 고유한 data-tour-target을 부착한다', async () => {
    const wrapper = await mountSuspended(DefaultLayout, {
      global: { stubs: { CommonAdSenseBanner: true, Icon: true } },
    })
    try {
      const expected = [
        ['/record', 'nav-record'],
        ['/grow', 'nav-grow'],
        ['/', 'nav-terrarium'],
        ['/shop', 'nav-shop'],
        ['/profile', 'nav-profile'],
      ]
      expect(wrapper.findAll('[data-tour-target]')).toHaveLength(5)
      for (const [route, name] of expected) {
        expect(wrapper.get(`nav a[href="${route}"]`).attributes('data-tour-target')).toBe(name)
      }
    }
    finally { wrapper.unmount() }
  })
})
