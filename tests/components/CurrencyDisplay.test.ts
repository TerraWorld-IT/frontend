// UltraPlan M17 — component spec
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CurrencyDisplay from '~/components/common/CurrencyDisplay.vue'

const mockCurrency = {
  basicCoins: 1234,
  specialCoins: 56.5,
  walkTokens: 10,
  readTokens: 20,
  runTokens: 30,
  drawTokens: 40.7,
}

describe('CurrencyDisplay (common)', () => {
  it('currency=null 일 때 모든 금액이 0 으로 표시', async () => {
    const wrapper = await mountSuspended(CurrencyDisplay, { props: { currency: null } })
    // basicCoin + specialCoin 둘 다 "0"
    const text = wrapper.text()
    // tokens 는 currency null 시 빈 array → rendering 안 됨
    expect(text).toContain('기본 코인')
    expect(text).toContain('스페셜 코인')
    expect(text).toMatch(/기본 코인\s*0/)
  })

  it('정수 금액은 그대로 표시', async () => {
    const wrapper = await mountSuspended(CurrencyDisplay, { props: { currency: mockCurrency } })
    expect(wrapper.text()).toContain('1234') // basicCoins
    expect(wrapper.text()).toContain('10')   // walkTokens
  })

  it('소수 금액은 1자리 fixed 표시', async () => {
    const wrapper = await mountSuspended(CurrencyDisplay, { props: { currency: mockCurrency } })
    expect(wrapper.text()).toContain('56.5')  // specialCoins
    expect(wrapper.text()).toContain('40.7')  // drawTokens
  })

  it('4 종 token label 모두 렌더 (산책/독서/러닝/낙서)', async () => {
    const wrapper = await mountSuspended(CurrencyDisplay, { props: { currency: mockCurrency } })
    expect(wrapper.text()).toContain('산책')
    expect(wrapper.text()).toContain('독서')
    expect(wrapper.text()).toContain('러닝')
    expect(wrapper.text()).toContain('낙서')
  })

  it('coinCellBg prop 이 inline style 로 반영', async () => {
    const wrapper = await mountSuspended(CurrencyDisplay, {
      props: { currency: mockCurrency, coinCellBg: '#fafbcc' },
    })
    expect(wrapper.html()).toContain('background-color: rgb(250, 251, 204)')
  })
})
