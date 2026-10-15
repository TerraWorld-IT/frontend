import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import NoticesDialog from '~/components/profile/NoticesDialog.vue'
import notices from '../../public/notices.json'

describe('NoticesDialog', () => {
  it('시행일 정정 안내를 맨 앞에 표시하고 기존 개정 공지의 안내를 보존한다', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(notices))
    const wrapper = await mountSuspended(NoticesDialog, { props: { open: true } })
    try {
      await vi.waitFor(() => expect(document.body.querySelector('[data-testid="notice-row"]')).not.toBeNull())
      const rows = document.body.querySelectorAll('[data-testid="notice-row"]')
      expect(rows[0]!.textContent).toContain('개인정보 처리방침·이용약관 시행일 정정 안내')
      expect(notices[0]!.date).toBe('2026-10-15')
      expect(notices[0]!.body).toContain('2026년 10월 23일 00:00(한국 시간)')
      expect(rows[0]!.textContent).toContain('2026.11.13 → 2026.10.23')
      expect(rows[0]!.textContent).toContain('개정 공고일 현재 운영·테스트 계정 외에 가입한 회원이 없어 30일 사전 고지를 받을 기존 회원이 없으므로 시행일을 앞당깁니다.')
      expect(rows[0]!.textContent).toContain('보상형 광고도 같은 시각부터 제공합니다.')
      expect(rows[0]!.textContent).toContain('개정 약관에 대한 거부 의사 표시와 간주 동의의 기준 시각도 정정된 시행 시각(2026년 10월 23일 00:00, 한국 시간)입니다.')
      expect(notices[1]!.id).toBe(2)
      expect(notices[1]!.date).toBe('2026-10-14')
      expect(rows[1]!.textContent).toContain('개인정보 처리방침·이용약관 개정 안내')
      expect(rows[1]!.textContent).toContain('2026년 11월 13일(한국 시간)')
      expect(rows[1]!.textContent).toContain('시행 전에는 보상형 광고를 제공하지 않습니다.')
      expect(rows[1]!.textContent).not.toContain('정정')
      expect(rows[1]!.textContent).toContain('가입 때 이미 광고 식별자 수집·맞춤광고에 동의한 회원은 그 동의가 시행일부터 개정 내용에 따라 적용')
      expect(rows[1]!.textContent).toContain('설정 > 동의 항목 관리의 맞춤형 광고 동의에서 언제든 철회할 수 있습니다.')
      expect(rows[1]!.textContent).toContain('맞춤형 광고 동의를 철회하면 맞춤형 광고만 중단합니다.')
      expect(rows[1]!.textContent).toContain('IDFA 제공 자체를 막으려면 iOS 설정 > 개인정보 보호 및 보안 > 추적에서 TerraWorld의 추적(ATT)을 거부해야 합니다.')
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
