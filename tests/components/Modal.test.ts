// UltraPlan M17 — component spec
import { describe, it, expect, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Modal from '~/components/common/Modal.vue'

describe('Modal (common)', () => {
  // Modal 은 <Teleport to="body"> 라 mountSuspended wrapper 가 해제돼도
  // teleport 된 DOM 이 body 에 잔류 → 다음 테스트의 querySelectorAll 오염.
  // 매 테스트 후 body + scroll-lock 상태를 초기화해 테스트 격리를 보장한다.
  afterEach(() => {
    document.body.innerHTML = ''
    // 스크롤 잠금 상태(클래스 + 참조 카운트 속성)를 초기화해 테스트 격리를 보장한다.
    // mountSuspended 는 컴포넌트를 언마운트하지 않아 여러 테스트가 카운트를 누적시킨다.
    document.documentElement.classList.remove('scroll-locked')
    document.documentElement.removeAttribute('data-scroll-lock-count')
  })

  it('modelValue=false 면 hidden (Transition v-if 미렌더)', async () => {
    await mountSuspended(Modal, { props: { modelValue: false } })
    // Teleport target body 에 modal 미렌더
    expect(document.body.querySelector('.bg-riso-cream')).toBeNull()
  })

  it('modelValue=true 면 title + message 렌더', async () => {
    await mountSuspended(Modal, {
      props: { modelValue: true, title: 'Confirm', message: 'Are you sure?' },
    })
    const modalCard = document.body.querySelector('.bg-riso-cream')
    expect(modalCard).not.toBeNull()
    expect(modalCard!.textContent).toContain('Confirm')
    expect(modalCard!.textContent).toContain('Are you sure?')
  })

  it('variant="danger" 시 confirm 버튼이 riso-poppy 배경', async () => {
    await mountSuspended(Modal, { props: { modelValue: true, variant: 'danger' } })
    const buttons = document.body.querySelectorAll('button')
    const confirmBtn = Array.from(buttons).find((b) => b.textContent?.includes('확인'))
    expect(confirmBtn?.className).toContain('bg-riso-poppy')
  })

  it('confirm 버튼 클릭 시 confirm + update:modelValue=false emit', async () => {
    const wrapper = await mountSuspended(Modal, { props: { modelValue: true } })
    const buttons = document.body.querySelectorAll('button')
    const confirmBtn = Array.from(buttons).find((b) => b.textContent?.includes('확인'))
    confirmBtn!.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('confirm')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('showCancel=false 면 cancel 버튼 미렌더', async () => {
    await mountSuspended(Modal, { props: { modelValue: true, showCancel: false } })
    const buttons = document.body.querySelectorAll('button')
    expect(Array.from(buttons).find((b) => b.textContent?.includes('취소'))).toBeUndefined()
  })

  // UX-002 / SEC-302 — a11y + body scroll lock + focus trap
  it('open 시 role="dialog" + aria-modal="true" 명시', async () => {
    await mountSuspended(Modal, { props: { modelValue: true, title: 'T', message: 'M' } })
    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(dialog?.getAttribute('aria-labelledby')).toBe('modal-title')
    expect(dialog?.getAttribute('aria-describedby')).toBe('modal-message')
  })

  // 스크롤 잠금 계약은 이제 <html>.scroll-locked 다 (useOverlayScrollLock).
  // 과거의 body.style.overflow / modalDepth 방식은 실제 스크롤러(main)를 못 잠가 무효였다.
  it('open 시 <html> 에 scroll-locked 부여', async () => {
    document.documentElement.classList.remove('scroll-locked')
    await mountSuspended(Modal, { props: { modelValue: true } })
    await nextTick()
    expect(document.documentElement.classList.contains('scroll-locked')).toBe(true)
  })

  it('open=false 일 때 scroll 미잠금', async () => {
    document.documentElement.classList.remove('scroll-locked')
    await mountSuspended(Modal, { props: { modelValue: false } })
    expect(document.documentElement.classList.contains('scroll-locked')).toBe(false)
  })
})
