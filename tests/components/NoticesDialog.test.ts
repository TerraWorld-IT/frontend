import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import NoticesDialog from '~/components/profile/NoticesDialog.vue'

describe('NoticesDialog', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('긴 URL이 포함된 공지 행은 가로로 넘치지 않게 줄바꿈한다', async () => {
    const url = `https://example.com/${'a'.repeat(100)}`
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([{ id: 1, title: url, body: url, date: '2026-09-28' }]))
    const wrapper = await mountSuspended(NoticesDialog, { props: { open: true } })
    try {
      await vi.waitFor(() => expect(document.body.querySelector('[data-testid="notice-row"]')).not.toBeNull())
      const row = document.body.querySelector('[data-testid="notice-row"]')!
      const content = row.firstElementChild!
      expect(content.className).toContain('min-w-0')
      expect(content.className).toContain('[overflow-wrap:anywhere]')
      expect(content.textContent).toContain(url)
    } finally {
      wrapper.unmount()
    }
  })
})
