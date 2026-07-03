// UltraPlan M17 — component spec
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RewardToast from '~/components/common/RewardToast.vue'

describe('RewardToast (common)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    // teleported nodes 정리
    document.body.innerHTML = ''
  })

  it('초기 상태는 hidden (visible=false)', async () => {
    await mountSuspended(RewardToast, { props: { coin: 10 } })
    expect(document.body.querySelector('.bg-riso-butter\\/95')).toBeNull()
  })

  it('expose 된 show() 호출 시 toast 등장', async () => {
    const wrapper = await mountSuspended(RewardToast, { props: { coin: 50 } })
    ;(wrapper.vm as unknown as { show: () => void }).show()
    await wrapper.vm.$nextTick()
    const coinNode = document.body.querySelector('.bg-riso-butter\\/95')
    expect(coinNode).not.toBeNull()
    expect(coinNode!.textContent).toContain('+50')
  })

  it('coin / token 프롭 전달 시 두 노드 모두 렌더 (낙서장: EXP 제거)', async () => {
    const wrapper = await mountSuspended(RewardToast, {
      props: { coin: 1, token: 2, tokenEmoji: '🚶' },
    })
    ;(wrapper.vm as unknown as { show: () => void }).show()
    await wrapper.vm.$nextTick()
    const body = document.body.textContent ?? ''
    expect(body).toContain('+1')
    expect(body).toContain('+2')
    expect(body).toContain('🚶')
  })

  it('default duration (2500ms) 후 자동 hidden', async () => {
    const wrapper = await mountSuspended(RewardToast, { props: { coin: 10 } })
    ;(wrapper.vm as unknown as { show: () => void }).show()
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.bg-riso-butter\\/95')).not.toBeNull()

    vi.advanceTimersByTime(2500)
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.bg-riso-butter\\/95')).toBeNull()
  })

  // P4-7 (a11y assertion 보강): 더미 assert(expect(true)) 제거 → 소스 raw 로 a11y 속성 + reduced-motion 검증.
  // jsdom 은 scoped style/matchMedia stub 불완전 → RewardToast.vue 소스에 SC 4.1.3(status messages)
  // 속성과 prefers-reduced-motion(SC 2.3.3) 미디어 쿼리가 존재함을 보장. 실 동작은 e2e 로 검증.
  it('a11y — role=status + aria-live(SC 4.1.3) + prefers-reduced-motion block(SC 2.3.3) 포함', async () => {
    const src = (await import('~/components/common/RewardToast.vue?raw')).default
    expect(src).toContain('role="status"')
    expect(src).toContain('aria-live')
    expect(src).toContain('prefers-reduced-motion')
  })
})
