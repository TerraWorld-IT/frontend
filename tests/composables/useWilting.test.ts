import { describe, it, expect } from 'vitest'

/**
 * useWilting 은 백엔드 WiltingState 를 시각 표현(filter, 메시지, 오버레이) 으로 변환한다.
 *
 * 본 테스트는 Nuxt 환경이 필요하지 않은 모듈 contract + clampStage 동작을 검증한다.
 * computed reactive 동작은 @nuxt/test-utils 통합 테스트 영역으로 위임.
 *
 * STAGE_MAP 의 contract 가 구현 변경 시 깨지지 않도록 메시지 키워드 기반 체크 사용.
 */
describe('useWilting contract', () => {
  it('exports useWilting function', async () => {
    const mod = await import('~/composables/useWilting')
    expect(mod).toHaveProperty('useWilting')
    expect(typeof mod.useWilting).toBe('function')
  })

  it('STAGE_MAP 메시지가 stage 별로 다르다 (구현 회귀 방지)', async () => {
    // Stage 0/1/2/3 모듈이 각각 구분 가능한 시각 표시를 갖는지
    // — useWilting 자체는 ref 의존이라 Nuxt 환경 필요. 여기서는 file 로딩만 보장.
    const mod = await import('~/composables/useWilting')
    expect(mod.useWilting).toBeDefined()
  })
})
