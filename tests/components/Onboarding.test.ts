// 2026-08-23 런타임 스모크 — 첫 로그인 온보딩 모달이 홈 병 스테이지 뒤로 깔려 반투명으로만 보이던 회귀 가드.
// 오버레이 루트는 body 로 텔레포트되고(변환된 조상 밖) 다이얼로그 밴드 최상단 z-[9998] 을 가져야 한다.
import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Onboarding from '~/components/common/Onboarding.vue'

describe('Onboarding (common)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.documentElement.classList.remove('scroll-locked')
    document.documentElement.removeAttribute('data-scroll-lock-count')
  })

  it('show=false 면 오버레이 미렌더', async () => {
    await mountSuspended(Onboarding, { props: { show: false } })
    expect(document.body.querySelector('[data-testid="onboarding-root"]')).toBeNull()
  })

  it('show=true 면 body 로 텔레포트된 오버레이가 z-[9998] 다이얼로그 밴드에 있다', async () => {
    const wrapper = await mountSuspended(Onboarding, { props: { show: true } })
    const root = document.body.querySelector('[data-testid="onboarding-root"]') as HTMLElement | null
    expect(root).not.toBeNull()
    // 텔레포트 — mount 루트(변환된 조상일 수 있는 곳) 안이 아니라 body 쪽 트리
    // (테스트 환경은 Transition 이 stub 이라 부모가 transition-stub — body 직계 대신 포함 관계로 판정)
    expect(wrapper.element.contains(root)).toBe(false)
    expect(document.body.contains(root)).toBe(true)
    // 고정 오버레이 + 밴드 z-index (토스트 9999 / AppUpdateGate 10000 보다 아래, 홈 팝업 9997 보다 위)
    expect(root!.classList.contains('fixed')).toBe(true)
    expect(root!.classList.contains('z-[9998]')).toBe(true)
    expect(root!.getAttribute('role')).toBe('dialog')
  })
})
