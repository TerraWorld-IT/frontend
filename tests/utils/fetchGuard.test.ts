import { describe, it, expect, vi } from 'vitest'
import { createFetchGuard } from '~/utils/fetchGuard'

/** 수동으로 resolve 할 수 있는 promise — in-flight 타이밍을 정확히 제어하기 위해. */
function deferred(): { promise: Promise<void>, resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>((r) => { resolve = r })
  return { promise, resolve }
}

describe('createFetchGuard', () => {
  it('TTL 안이면 fetcher 를 부르지 않는다', async () => {
    const guard = createFetchGuard(60_000)
    const fetcher = vi.fn(async () => {})

    await guard.run(fetcher)
    await guard.run(fetcher)

    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('force 는 TTL 을 무시한다', async () => {
    const guard = createFetchGuard(60_000)
    const fetcher = vi.fn(async () => {})

    await guard.run(fetcher)
    await guard.run(fetcher, true)

    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('동시 호출은 요청 하나로 합쳐진다', async () => {
    const guard = createFetchGuard(60_000)
    const d = deferred()
    const fetcher = vi.fn(() => d.promise)

    const a = guard.run(fetcher)
    const b = guard.run(fetcher)
    d.resolve()
    await Promise.all([a, b])

    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('실패는 신선도로 캐시하지 않는다 — 다음 호출이 다시 시도한다', async () => {
    const guard = createFetchGuard(60_000)
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined)

    await expect(guard.run(fetcher)).rejects.toThrow('boom')
    await guard.run(fetcher)

    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('invalidate() 후에는 TTL 안이어도 다시 가져온다', async () => {
    const guard = createFetchGuard(60_000)
    const fetcher = vi.fn(async () => {})

    await guard.run(fetcher)
    guard.invalidate()
    await guard.run(fetcher)

    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  // 회귀 가드 — 이 케이스가 실제 HIGH 버그였다. force 가 TTL 만 건너뛰고 진행 중인
  // non-forced 요청에는 그대로 합류하면, 뮤테이션 이전에 출발한 응답을 받아놓고
  // 신선한 값으로 도장까지 찍는다(= 사용자가 방금 번 재화가 화면에 안 보인다).
  it('force 는 뮤테이션 이전에 출발한 in-flight 요청에 합류하지 않는다', async () => {
    const guard = createFetchGuard(60_000)
    const first = deferred()
    const calls: string[] = []

    const staleFetcher = vi.fn(() => { calls.push('stale'); return first.promise })
    const freshFetcher = vi.fn(async () => { calls.push('fresh') })

    // 1) 느린 non-forced 요청이 출발한다 (아직 응답 없음).
    const pending = guard.run(staleFetcher)

    // 2) 그 사이 사용자가 재화를 벌었고, 호출부가 force 로 재조회한다.
    const forced = guard.run(freshFetcher, true)

    // 아직 첫 요청이 안 끝났으므로 두 번째 fetcher 는 시작조차 하면 안 된다.
    expect(freshFetcher).not.toHaveBeenCalled()

    first.resolve()
    await Promise.all([pending, forced])

    // force 는 첫 요청에 합류하지 않고, 그것이 끝난 뒤 자기 요청을 새로 냈다.
    expect(freshFetcher).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(['stale', 'fresh'])
  })

  it('진행 중 요청이 실패해도 force 는 자기 요청을 낸다', async () => {
    const guard = createFetchGuard(60_000)
    const first = { promise: Promise.reject(new Error('네트워크')), settled: true }
    // unhandled rejection 방지 — guard 가 내부에서 삼키는지 확인하는 것이 목적.
    first.promise.catch(() => {})

    const failing = vi.fn(() => first.promise)
    const fresh = vi.fn(async () => {})

    const pending = guard.run(failing).catch(() => {})
    const forced = guard.run(fresh, true)
    await Promise.all([pending, forced])

    expect(fresh).toHaveBeenCalledTimes(1)
  })
})
