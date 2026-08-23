import { describe, it, expect, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import GrowLostModal from '~/components/grow/GrowLostModal.vue'

// G4 기록 끊김 모달 — 루비 버튼은 잔액 >= 비용일 때만 활성, 광고 버튼은 항상 활성(busy 제외), X 는 close.
function buttons(): { ruby: HTMLButtonElement, ad: HTMLButtonElement, close: HTMLButtonElement } {
  const all = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button'))
  return {
    ruby: all.find(b => b.textContent?.includes('루비') && b.textContent.includes('개 사용'))!,
    ad: all.find(b => b.textContent?.includes('광고 보상 사용'))!,
    close: all.find(b => b.getAttribute('aria-label') === '닫기')!,
  }
}

describe('GrowLostModal', () => {
  afterEach(() => {
    // Teleport 잔류 DOM + 스크롤 잠금 상태 초기화 (Modal.test 와 동일 격리 규약)
    document.body.innerHTML = ''
    document.documentElement.classList.remove('scroll-locked')
    document.documentElement.removeAttribute('data-scroll-lock-count')
  })

  it('루비가 충분하면 [루비 N개 사용] 활성 + 클릭 시 revive(RUBY)', async () => {
    const wrapper = await mountSuspended(GrowLostModal, { props: { open: true, ruby: 30, rubyCost: 10 } })
    const { ruby, ad } = buttons()
    expect(ruby.disabled).toBe(false)
    expect(ruby.textContent).toContain('루비 10개 사용')
    expect(ruby.textContent).not.toContain('루비가 부족해요')
    expect(ad.disabled).toBe(false)
    ruby.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('revive')?.[0]).toEqual(['RUBY'])
  })

  it('루비가 부족하면 루비 버튼 비활성 + 안내, 광고 버튼은 활성 → revive(AD)', async () => {
    const wrapper = await mountSuspended(GrowLostModal, { props: { open: true, ruby: 3, rubyCost: 10 } })
    const { ruby, ad } = buttons()
    expect(ruby.disabled).toBe(true)
    expect(ruby.textContent).toContain('루비가 부족해요')
    expect(ad.disabled).toBe(false)
    ad.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('revive')?.[0]).toEqual(['AD'])
  })

  it('busy 면 두 버튼 모두 비활성', async () => {
    await mountSuspended(GrowLostModal, { props: { open: true, ruby: 99, rubyCost: 10, busy: true } })
    const { ruby, ad } = buttons()
    expect(ruby.disabled).toBe(true)
    expect(ad.disabled).toBe(true)
  })

  it('우상단 X 클릭 시 close emit (재화/광고 강제 없음)', async () => {
    const wrapper = await mountSuspended(GrowLostModal, { props: { open: true, ruby: 0, rubyCost: 10 } })
    buttons().close.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('revive')).toBeFalsy()
  })

  it('open=false 면 미렌더', async () => {
    await mountSuspended(GrowLostModal, { props: { open: false, ruby: 0, rubyCost: 10 } })
    expect(document.body.querySelector('#grow-lost-title')).toBeNull()
  })
})
