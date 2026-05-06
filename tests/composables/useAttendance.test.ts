// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'

/**
 * useAttendance 는 SDK 호출이 본체 — 깊은 테스트는 SDK mocking 이 필요해 별도 PR 로.
 * 본 파일은 contract 보장 (모듈 로딩 + 함수 시그니처).
 */
describe('useAttendance contract', () => {
  it('exports useAttendance function', async () => {
    const mod = await import('~/composables/useAttendance')
    expect(typeof mod.useAttendance).toBe('function')
  })
})
