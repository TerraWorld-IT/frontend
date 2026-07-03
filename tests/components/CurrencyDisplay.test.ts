// UltraPlan M17 — component spec (낙서장 리팩토링: 7화폐 balances[] 모델로 갱신)
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CurrencyDisplay from '~/components/common/CurrencyDisplay.vue'

// 신 substrate: CurrencyResponse { balances: [{code, amount}] } (7종 COIN/RUBY/SPARKLE/DEW/SUN/BOLT/WIND)
const mockCurrency = {
  balances: [
    { code: 'COIN', amount: 1234 },
    { code: 'RUBY', amount: 56.5 },
    { code: 'SPARKLE', amount: 7 },
    { code: 'DEW', amount: 10 },
    { code: 'SUN', amount: 20 },
    { code: 'BOLT', amount: 30 },
    { code: 'WIND', amount: 40.7 },
  ],
}

describe('CurrencyDisplay (common)', () => {
  it('currency=null 일 때 7종 라벨 + 금액 0 표시', async () => {
    const wrapper = await mountSuspended(CurrencyDisplay, { props: { currency: null } })
    const text = wrapper.text()
    // 코인/루비/반짝이 + 이슬/햇살/번개/바람 라벨 모두 렌더
    for (const label of ['코인', '루비', '반짝이', '이슬', '햇살', '번개', '바람']) {
      expect(text).toContain(label)
    }
    // 잔액 없음 → 모두 0
    expect(text).toMatch(/코인\s*0/)
  })

  it('정수 금액은 그대로 표시', async () => {
    const wrapper = await mountSuspended(CurrencyDisplay, { props: { currency: mockCurrency } })
    expect(wrapper.text()).toContain('1234') // COIN
    expect(wrapper.text()).toContain('10') // DEW
  })

  it('소수 금액은 1자리 fixed 표시', async () => {
    const wrapper = await mountSuspended(CurrencyDisplay, { props: { currency: mockCurrency } })
    expect(wrapper.text()).toContain('56.5') // RUBY
    expect(wrapper.text()).toContain('40.7') // WIND
  })

  it('7종 라벨 모두 렌더 (코인/루비/반짝이/이슬/햇살/번개/바람)', async () => {
    const wrapper = await mountSuspended(CurrencyDisplay, { props: { currency: mockCurrency } })
    const text = wrapper.text()
    for (const label of ['코인', '루비', '반짝이', '이슬', '햇살', '번개', '바람']) {
      expect(text).toContain(label)
    }
  })

  it('coinCellBg prop 이 inline style 로 반영', async () => {
    const wrapper = await mountSuspended(CurrencyDisplay, {
      props: { currency: mockCurrency, coinCellBg: '#fafbcc' },
    })
    // happy-dom 은 inline style 의 hex 색을 rgb() 로 정규화하지 않고 원문 유지.
    expect(wrapper.html()).toContain('background-color: #fafbcc')
  })
})
