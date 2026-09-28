import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useNuxtApp, useState } from '#app'
import OfflineBanner from '~/components/common/OfflineBanner.vue'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('OfflineBanner', () => {
  it('오프라인 배너가 상단 콘텐츠 앞에서 공간을 차지하고 온라인 복귀 시 사라진다', async () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false })
    const wrapper = await mountSuspended(OfflineBanner)
    await nextTick()

    const banner = wrapper.get('[role="status"]')
    expect(banner.classes()).toContain('relative')
    expect(banner.classes()).not.toContain('fixed')
    expect(banner.attributes('style')).toContain('margin-top: var(--sat)')
    expect(banner.text()).toContain('오프라인')

    window.dispatchEvent(new Event('online'))
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('네이티브 오프라인 신호가 먼저 있어도 첫 렌더 전에는 배너가 없다', async () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: true })
    const nuxtApp = useNuxtApp()
    const nativeConnected = nuxtApp.runWithContext(() => useState<boolean | null>('native-network-connected', () => null))
    nativeConnected.value = false
    const serverHtml = await nuxtApp.runWithContext(() => renderToString(createSSRApp(OfflineBanner)))
    expect(serverHtml).not.toContain('role="status"')

    const wrapper = await mountSuspended(OfflineBanner)
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    nativeConnected.value = null
    wrapper.unmount()
  })
})
