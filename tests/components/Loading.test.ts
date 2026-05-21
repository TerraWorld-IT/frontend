// UltraPlan M17 — component spec
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Loading from '~/components/common/Loading.vue'

describe('Loading (common)', () => {
  it('기본 variant 는 spinner 를 렌더한다', async () => {
    const wrapper = await mountSuspended(Loading)
    // spinner = border-t-riso-sage 클래스의 div 가 있어야
    expect(wrapper.html()).toContain('animate-spin')
  })

  it('variant="skeleton" 시 3 개의 skeleton row 를 렌더한다', async () => {
    const wrapper = await mountSuspended(Loading, { props: { variant: 'skeleton' } })
    const rows = wrapper.findAll('.animate-pulse')
    expect(rows.length).toBe(3)
  })

  it('variant="dots" 시 3 개의 dot 을 floating animation 으로 렌더한다', async () => {
    const wrapper = await mountSuspended(Loading, { props: { variant: 'dots' } })
    const dots = wrapper.findAll('.animate-float')
    expect(dots.length).toBe(3)
    // 첫 dot animationDelay = 0.2s (i=1)
    expect((dots[0]!.element as HTMLElement).style.animationDelay).toBe('0.2s')
  })

  it('containerClass prop 이 outer wrapper class 에 반영된다', async () => {
    const wrapper = await mountSuspended(Loading, { props: { containerClass: 'my-custom' } })
    expect(wrapper.element.className).toContain('my-custom')
  })

  // UX-005 — a11y attribute 검증
  it('role="status" + aria-live="polite" + aria-busy="true" 명시', async () => {
    const wrapper = await mountSuspended(Loading)
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-live')).toBe('polite')
    expect(wrapper.attributes('aria-busy')).toBe('true')
  })

  it('default ariaLabel="로딩 중" + sr-only 텍스트 포함', async () => {
    const wrapper = await mountSuspended(Loading)
    expect(wrapper.attributes('aria-label')).toBe('로딩 중')
    expect(wrapper.html()).toContain('<span class="sr-only">로딩 중</span>')
  })

  it('ariaLabel prop override 가능', async () => {
    const wrapper = await mountSuspended(Loading, { props: { ariaLabel: '데이터 불러오는 중' } })
    expect(wrapper.attributes('aria-label')).toBe('데이터 불러오는 중')
  })
})
