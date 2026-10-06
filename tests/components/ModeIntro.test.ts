import { afterEach, describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ModeIntro from '~/components/terrarium/ModeIntro.vue'

// 모드 진입 인트로는 fixed 풀스크린 오버레이 — 열린 동안 배경 스크롤을 잠근다(useOverlayScrollLock).
const html = document.documentElement
const locked = () => html.classList.contains('scroll-locked')
const props = { icon: 'lucide:leaf', title: '힐링 모드', description: '설명', durationMs: 60_000 }

afterEach(() => {
  document.body.innerHTML = ''
  html.classList.remove('scroll-locked')
  html.removeAttribute('data-scroll-lock-count')
})

describe('ModeIntro 배경 스크롤 잠금', () => {
  it('open=true 로 마운트하면 잠그고, open=false 가 되면 푼다', async () => {
    const wrapper = await mountSuspended(ModeIntro, { props: { ...props, open: true } })
    expect(locked()).toBe(true)
    await wrapper.setProps({ open: false })
    expect(locked()).toBe(false)
    wrapper.unmount()
  })

  it('open=false 로 마운트하면 잠그지 않는다', async () => {
    const wrapper = await mountSuspended(ModeIntro, { props: { ...props, open: false } })
    expect(locked()).toBe(false)
    wrapper.unmount()
  })

  it('열린 채 언마운트되면 자기 몫만 풀어 다른 오버레이의 잠금은 유지된다', async () => {
    // 다른 오버레이가 이미 잠금 하나를 쥐고 있는 상황
    html.setAttribute('data-scroll-lock-count', '1')
    html.classList.add('scroll-locked')
    const wrapper = await mountSuspended(ModeIntro, { props: { ...props, open: true } })
    expect(html.getAttribute('data-scroll-lock-count')).toBe('2')
    wrapper.unmount()
    expect(html.getAttribute('data-scroll-lock-count')).toBe('1')
    expect(locked()).toBe(true)
  })
})
