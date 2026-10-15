import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import PrivacyPage from '~/pages/legal/privacy.vue'
import TermsPage from '~/pages/legal/terms.vue'

let wrapper: VueWrapper | undefined
beforeEach(() => {
  useRuntimeConfig().public.adsEffectiveAt = '2026-10-23T00:00:00+09:00'
  clearNuxtState('ads-policy-rendered-at')
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
  clearNuxtState('ads-policy-rendered-at')
})

describe.each([
  ['처리방침', PrivacyPage, '행태정보를 이용한 맞춤형 광고는 하지 않습니다.', 'Google은 수집한 정보를 미국 등 국외에서 처리할 수 있으며, 보유 기간과 파기는'],
  ['약관', TermsPage, '현재 유료 상품과 광고는 제공하지 않습니다.', '하루 최대 5회'],
] as const)('%s 버전 공개', (_name, component, oldText, newText) => {
  it.each([
    ['2026-10-22T14:59:59.999Z', false],
    ['2026-10-22T15:00:00.000Z', true],
  ] as const)('한국 시간 시행 경계 %s의 기본 본문과 다른 버전 전체를 제공한다', async (now, revised) => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(now))
    wrapper = await mountSuspended(component)
    const body = () => wrapper!.get('section').text()
    expect(body()).toContain(revised ? newText : oldText)
    expect(body()).not.toContain(revised ? oldText : newText)
    if (revised) expect(body()).toContain('개정 공고일 현재 운영·테스트 계정 외에 가입한 회원이 없어 30일 사전 고지를 받을 기존 회원이 없으므로 시행일을 앞당깁니다.')
    expect(wrapper.get('aside').text()).toContain('2026-10-14')
    expect(wrapper.get('aside').text()).toContain('2026-10-23')
    expect(wrapper.get('aside').text()).toContain('2026-10-15 시행일 정정 공고')
    expect(wrapper.get('aside').text()).toContain('개정 공고일 현재 운영·테스트 계정 외에 가입한 회원이 없어 30일 사전 고지를 받을 기존 회원이 없으므로 시행일을 앞당깁니다.')
    expect(wrapper.text()).toContain('2026.11.13 → 2026.10.23')
    expect(wrapper.get('aside h2').text()).toBe(revised ? '개정 시행 안내' : '개정 예정 공지')
    await wrapper.get('aside button[aria-pressed="false"]').trigger('click')
    expect(body()).toContain(revised ? oldText : newText)
    expect(body()).not.toContain(revised ? newText : oldText)
    expect(wrapper.get('header p').text()).toContain(revised ? '2026년 10월 3일' : '2026년 10월 23일')
    if (!revised) expect(body()).toContain('2026년 10월 15일 시행일 정정 공고')
  })

  it('클라이언트 시계가 시행 이후여도 서버가 전달한 시각으로 첫 본문을 유지한다', async () => {
    useState('ads-policy-rendered-at', () => Date.parse('2026-10-22T14:59:59Z'))
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-23T15:00:00Z'))
    wrapper = await mountSuspended(component)
    expect(wrapper.get('section').text()).toContain(oldText)
  })

  it('시행 경계 전후의 별도 요청은 각 요청의 렌더 시각으로 기본 본문을 선택한다', async () => {
    const clock = vi.spyOn(Date, 'now')
    for (const [now, revised] of [
      ['2026-10-22T14:59:59.999Z', false],
      ['2026-10-22T15:00:00.000Z', true],
    ] as const) {
      // SSR 요청마다 새로 생성되는 상태를 재현한다.
      clearNuxtState('ads-policy-rendered-at')
      clock.mockReturnValue(Date.parse(now))
      wrapper = await mountSuspended(component)
      expect(useState('ads-policy-rendered-at').value).toBe(Date.parse(now))
      expect(wrapper.get('section').text()).toContain(revised ? newText : oldText)
      expect(wrapper.get('section').text()).not.toContain(revised ? oldText : newText)
      wrapper.unmount()
      wrapper = undefined
    }
  })

  it('시행 설정이 잘못되면 현행 본문을 유지하고 개정 예정 본문은 열람할 수 있다', async () => {
    useRuntimeConfig().public.adsEffectiveAt = ''
    wrapper = await mountSuspended(component)
    expect(wrapper.get('section').text()).toContain(oldText)
    await wrapper.get('aside button[aria-pressed="false"]').trigger('click')
    expect(wrapper.get('section').text()).toContain(newText)
  })
})
