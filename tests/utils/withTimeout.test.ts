import { describe, expect, it, vi } from 'vitest'
import { withTimeout } from '~/utils/withTimeout'

describe('withTimeout', () => {
  it('promise 가 데드라인 안에 끝나면 그 값을 그대로 돌려준다', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42)
  })

  it('promise 가 데드라인 안에 reject 하면 그 에러를 전파한다', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000)).rejects.toThrow('boom')
  })

  // 핵심 회귀 가드 — 응답 헤더는 왔지만 본문이 영영 안 오는(never-settling) 연결.
  // fetchOptions.timeout 은 헤더 수신 시 타이머를 꺼서 이걸 못 잡는다 → withTimeout 이 잡아야 한다.
  it('영영 안 끝나는 promise 를 데드라인에 reject 한다', async () => {
    vi.useFakeTimers()
    try {
      const never = new Promise<number>(() => {}) // 절대 settle 안 됨
      const raced = withTimeout(never, 5000)
      const assertion = expect(raced).rejects.toThrow(/deadline exceeded/)
      await vi.advanceTimersByTimeAsync(5001)
      await assertion
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('promise 가 이기면 데드라인 타이머를 정리한다 (dangling timer 없음)', async () => {
    vi.useFakeTimers()
    try {
      const result = await withTimeout(Promise.resolve('ok'), 5000)
      expect(result).toBe('ok')
      // 타이머가 남아 있으면 pending timer count 로 드러난다.
      expect(vi.getTimerCount()).toBe(0)
    }
    finally {
      vi.useRealTimers()
    }
  })

  // 회귀 가드 — 데드라인 초과 시 넘겨준 controller 를 abort 해 원본 요청까지 취소한다.
  it('데드라인 초과 시 controller 를 abort 한다', async () => {
    vi.useFakeTimers()
    try {
      const ac = new AbortController()
      const raced = withTimeout(new Promise<number>(() => {}), 5000, ac)
      const assertion = expect(raced).rejects.toThrow(/deadline exceeded/)
      expect(ac.signal.aborted).toBe(false)
      await vi.advanceTimersByTimeAsync(5001)
      expect(ac.signal.aborted).toBe(true)
      await assertion
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('promise 가 이기면 controller 를 abort 하지 않는다', async () => {
    const ac = new AbortController()
    const result = await withTimeout(Promise.resolve('done'), 5000, ac)
    expect(result).toBe('done')
    expect(ac.signal.aborted).toBe(false)
  })
})
