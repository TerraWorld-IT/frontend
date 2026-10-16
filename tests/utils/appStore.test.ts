import { describe, expect, it } from 'vitest'
import { buildAppStoreUrl, buildSmartBannerContent } from '../../app/utils/appStore'

describe('App Store 링크와 배너', () => {
  it('토큰 없이는 캠페인 쿼리와 제휴 정보를 넣지 않는다', () => {
    expect(buildAppStoreUrl('share')).toBe('https://apps.apple.com/kr/app/terraworld/id6786987682')
    expect(buildSmartBannerContent({ campaign: 'web' })).toBe('app-id=6786987682')
    expect(buildSmartBannerContent({ campaign: 'share', appArgument: 'https://terraworld.web-qplay.kr/share/abc' }))
      .toBe('app-id=6786987682, app-argument=https://terraworld.web-qplay.kr/share/abc')
  })

  it('설정한 앱 ID와 추적 매개변수를 사용한다', () => {
    const config = { appStoreId: '123', appStoreProviderToken: 'partner &1' }
    expect(buildAppStoreUrl('share /한글', config))
      .toBe('https://apps.apple.com/kr/app/terraworld/id123?pt=partner+%261&ct=share+%2F%ED%95%9C%EA%B8%80&mt=8')
    expect(buildSmartBannerContent({ campaign: 'web' }, config))
      .toBe('app-id=123, affiliate-data=pt=partner+%261&ct=web&mt=8')
    expect(buildSmartBannerContent({ campaign: 'share', appArgument: 'https://example.com/share/abc' }, config))
      .toBe('app-id=123, affiliate-data=pt=partner+%261&ct=share&mt=8, app-argument=https://example.com/share/abc')
  })

  it('예약문자·유니코드 입력은 디코딩 후 복원되고 다른 매개변수를 만들지 않는다', () => {
    // 의존성 추가 없이 ASCII 전체와 유니코드 경계값의 왕복 속성을 검사한다.
    const inputs = [...Array.from({ length: 128 }, (_, code) => String.fromCodePoint(code)), '한글', '🌱', '\uFFFF', 'x&mt=9, app-id=0', '']
    for (const campaign of inputs) {
      const token = `partner${campaign}`
      const config = { appStoreProviderToken: token }
      const url = new URL(buildAppStoreUrl(campaign, config))
      expect([...url.searchParams.keys()]).toEqual(['pt', 'ct', 'mt'])
      expect(url.searchParams.get('pt')).toBe(token)
      expect(url.searchParams.get('ct')).toBe(campaign)
      expect(url.searchParams.get('mt')).toBe('8')
      const banner = buildSmartBannerContent({ campaign }, config)
      const affiliate = new URLSearchParams(banner.split(', affiliate-data=')[1])
      expect([...affiliate.keys()]).toEqual(['pt', 'ct', 'mt'])
      expect(affiliate.get('pt')).toBe(token)
      expect(affiliate.get('ct')).toBe(campaign)
      expect(affiliate.get('mt')).toBe('8')
    }
  })
})
