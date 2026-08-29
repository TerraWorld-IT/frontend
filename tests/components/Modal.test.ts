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
    expect(document.body.querySelector('[data-testid="modal-card"]')).toBeNull()
  })

  it('modelValue=true 면 title + message 렌더', async () => {
    await mountSuspended(Modal, {
      props: { modelValue: true, title: 'Confirm', message: 'Are you sure?' },
    })
    const modalCard = document.body.querySelector('[data-testid="modal-card"]')
    expect(modalCard).not.toBeNull()
    expect(modalCard!.textContent).toContain('Confirm')
    expect(modalCard!.textContent).toContain('Are you sure?')
  })

  // 아프젝 리스킨(C4): danger 도 검정 CTA 유지 — 라벨로 구분. riso 팔레트는 쓰지 않는다.
  it('variant="danger" 도 confirm 버튼은 검정 apjek-cta (riso 색 없음)', async () => {
    await mountSuspended(Modal, { props: { modelValue: true, variant: 'danger' } })
    const buttons = document.body.querySelectorAll('button')
    const confirmBtn = Array.from(buttons).find((b) => b.textContent?.includes('확인'))
    expect(confirmBtn?.className).toContain('apjek-cta')
    expect(confirmBtn?.className).not.toMatch(/riso-/)
  })

  it('confirmDisabled=true 면 confirm 버튼 disabled + 회색 클래스, 클릭해도 confirm 미발화', async () => {
    const wrapper = await mountSuspended(Modal, { props: { modelValue: true, confirmDisabled: true } })
    const buttons = document.body.querySelectorAll('button')
    const confirmBtn = Array.from(buttons).find((b) => b.textContent?.includes('확인')) as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(true)
    expect(confirmBtn.className).toContain('modal-cta-disabled')
    confirmBtn.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('confirm')).toBeFalsy()
  })

  it('우상단 X(연파랑 원형) 클릭 시 cancel + update:modelValue=false emit', async () => {
    const wrapper = await mountSuspended(Modal, { props: { modelValue: true, title: 'T' } })
    const closeBtn = document.body.querySelector('[data-testid="modal-close"]') as HTMLButtonElement | null
    expect(closeBtn).not.toBeNull()
    expect(closeBtn!.className).toContain('size-11')
    const visualCircle = closeBtn!.querySelector('span')
    expect(visualCircle?.className).toContain('size-8')
    expect(visualCircle?.className).toContain('bg-apjek-blue-soft')
    closeBtn!.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('cancel')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  // 백드롭 탭 = cancel (X/ESC 와 동일 경로). 카드 안 클릭은 닫히지 않는다.
  it('백드롭 클릭 시 cancel + update:modelValue=false emit, 카드 내부 클릭은 무시', async () => {
    const wrapper = await mountSuspended(Modal, { props: { modelValue: true, title: 'T' } })
    const card = document.body.querySelector('[data-testid="modal-card"]') as HTMLElement
    card.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('cancel')).toBeFalsy()

    const backdrop = document.body.querySelector('[data-testid="modal-backdrop"]') as HTMLElement | null
    expect(backdrop).not.toBeNull()
    backdrop!.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('showClose=false 면 X 미렌더', async () => {
    await mountSuspended(Modal, { props: { modelValue: true, showClose: false } })
    expect(document.body.querySelector('[data-testid="modal-close"]')).toBeNull()
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
