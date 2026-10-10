import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AdsTestPage from '~/pages/dev/ads-test.vue'

// 개발자 광고 테스트 페이지 — 웹(테스트 환경)에서는 광고 SDK 를 부르지 않고 이유를 안내한다.
describe('dev/ads-test', () => {
  it('웹에서는 실행 버튼을 막고 앱에서 열라고 안내한다', async () => {
    const wrapper = await mountSuspended(AdsTestPage)
    const button = wrapper.get('[data-testid="ads-test-run"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('앱(안드로이드/iOS)에서 열어야')
    wrapper.unmount()
  })

  it('환경 표에 실행 환경·운영 광고 ID 상태·사용하는 테스트 ID 를 보여준다', async () => {
    const wrapper = await mountSuspended(AdsTestPage)
    const env = wrapper.get('[data-testid="ads-test-env"]').text()
    expect(env).toContain('웹 브라우저')
    expect(env).toContain('운영 광고 단위 ID')
    expect(env).toContain('구글 테스트 ca-app-pub-394')
    wrapper.unmount()
  })
})
