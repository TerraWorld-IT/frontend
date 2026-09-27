import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import InviteCodeModal from '~/components/terrarium/InviteCodeModal.vue'

describe('InviteCodeModal', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('긴 초대 코드를 기존 표시 영역에서 줄바꿈한다', async () => {
    const wrapper = await mountSuspended(InviteCodeModal, {
      props: { open: true, code: 'A'.repeat(100), inviterRuby: 1, inviteeRuby: 1 },
    })
    try {
      const code = document.body.querySelector('[data-testid="invite-code-display"]')!
      expect(code.textContent).toContain('A'.repeat(100))
      expect(code.className).toContain('[overflow-wrap:anywhere]')
    } finally {
      wrapper.unmount()
    }
  })
})
