import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import NoticesDialog from '~/components/profile/NoticesDialog.vue'
import notices from '../../public/notices.json'

describe('NoticesDialog', () => {
  it('실제 공지 데이터의 개정 안내를 맨 앞에 표시하고 기존 공지를 보존한다', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(notices))
    const wrapper = await mountSuspended(NoticesDialog, { props: { open: true } })
    try {
      await vi.waitFor(() => expect(document.body.querySelector('[data-testid="notice-row"]')).not.toBeNull())
      const rows = document.body.querySelectorAll('[data-testid="notice-row"]')
      expect(rows[0]!.textContent).toContain('개인정보 처리방침·이용약관 개정 안내')
      expect(notices[0]!.date).toBe('2026-10-14')
      expect(notices[0]!.body).toContain('2026년 11월 13일')
      expect(rows[0]!.textContent).toContain('가입 때 이미 광고 식별자 수집·맞춤광고에 동의한 회원은 그 동의가 시행일부터 개정 내용에 따라 적용')
      expect(rows[0]!.textContent).toContain('설정 > 동의 항목 관리의 맞춤형 광고 동의에서 언제든 철회할 수 있습니다.')
      expect(rows[0]!.textContent).toContain('맞춤형 광고 동의를 철회하면 맞춤형 광고만 중단합니다.')
      expect(rows[0]!.textContent).toContain('IDFA 제공 자체를 막으려면 iOS 설정 > 개인정보 보호 및 보안 > 추적에서 TerraWorld의 추적(ATT)을 거부해야 합니다.')
      expect(notices.find(notice => notice.id === 1)?.title).toBe('정령이 추가 되었어요')
    }
    finally {
      wrapper.unmount()
    }
  })

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
