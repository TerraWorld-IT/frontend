import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import AnalyticsConsentNotice from '~/components/legal/AnalyticsConsentNotice.vue'

let wrapper: VueWrapper | undefined
afterEach(() => wrapper?.unmount())

describe('GA4 별도 동의 고지', () => {
  it('요약은 펼치지 않아도 보이고 자세히에 국외 이전 항목을 모두 제공한다', async () => {
    wrapper = await mountSuspended(AnalyticsConsentNotice)
    expect(wrapper.get('p').text()).toBe('Google LLC(미국)에 이용 기록을 보내 통계를 냅니다. 동의하지 않아도 가입·이용할 수 있어요.')
    expect(wrapper.get('p').element.closest('details, label')).toBeNull()
    expect(wrapper.get('details').attributes('open')).toBeUndefined()
    expect(wrapper.get('summary').text()).toBe('자세히')
    const detail = wrapper.get('details').text()
    for (const text of ['제28조의8 제1항 제1호', 'Google LLC', '미국', 'HTTPS', 'GA 쿠키·클라이언트 식별자', '이용 화면·이벤트', '기기·브라우저', 'IP로 추정한 대략 위치', '2개월', '2년', '거부', 'Google Signals', '간주 동의']) {
      expect(detail).toContain(text)
    }
    expect(wrapper.get('a').attributes('href')).toBe('https://support.google.com/policies/contact/general_privacy_form')
  })

  it('기존 회원 안내는 해당 회원에게만 표시한다', async () => {
    wrapper = await mountSuspended(AnalyticsConsentNotice, { props: { legacyMember: true } })
    expect(wrapper.text()).toContain('2026년 10월 23일 이후 가입한 회원에게 적용돼요')
    await wrapper.setProps({ legacyMember: false })
    expect(wrapper.text()).not.toContain('기존 회원은 이 동의를 켜도 분석하지 않아요')
  })
})
