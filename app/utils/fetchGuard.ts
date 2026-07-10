/**
 * TTL + in-flight dedup 가드.
 *
 * 이 앱은 페이지마다 `onMounted` 에서 데이터를 다시 받아온다. 하단 탭을 왕복하면 바뀌지도
 * 않은 아이템 카탈로그와 프로필을 매번 다시 요청하고, 그동안 화면은 빈 상태로 남는다.
 * 원격 URL WebView 는 라우트 전환 사이에 절대 리로드되지 않으므로 이 낭비가 그대로 누적된다.
 *
 * `run()` 은 (1) TTL 안이면 네트워크를 아예 타지 않고 (2) 동시에 여러 호출부가 부르면
 * 요청 하나만 나가게 한다. 실패 시에는 신선도를 갱신하지 않으므로 다음 호출이 다시 시도한다.
 *
 * **반드시 store setup 안에서 생성할 것.** 모듈 스코프에 두면 Nitro 가 모듈을 프로세스당
 * 한 번만 로드하므로 SSR 요청 사이에 캐시가 공유돼 교차 사용자 데이터 누출이 된다.
 */
export interface FetchGuard {
  /**
   * TTL 안이면 skip, 진행 중이면 그 Promise 를 공유.
   * `force` 는 TTL 뿐 아니라 **진행 중인 요청에 올라타는 것도** 건너뛴다 (아래 주석 참조).
   */
  run: (fetcher: () => Promise<void>, force?: boolean) => Promise<void>
  /** 다음 `run()` 이 반드시 네트워크를 타게 한다. */
  invalidate: () => void
}

export function createFetchGuard(ttlMs: number): FetchGuard {
  let fetchedAt: number = 0
  let inflight: Promise<void> | null = null

  async function run(fetcher: () => Promise<void>, force: boolean = false): Promise<void> {
    if (!force && fetchedAt > 0 && Date.now() - fetchedAt < ttlMs) return

    // `force` 는 "뮤테이션 직후이니 서버의 새 값을 받아라" 는 뜻이다. 그런데 그 시점에 이미
    // 진행 중인 요청이 있으면, 그 요청은 **뮤테이션 이전**에 출발했을 수 있다. 거기에 그냥
    // 합류하면 옛 스냅샷을 받아놓고 `fetchedAt` 까지 갱신해 TTL 내내 신선한 값으로 취급된다
    // — 이 가드가 막으려던 바로 그 stale 잔액이 된다.
    // 그래서 진행 중인 요청이 끝나기를 기다린 뒤(실패는 무시) 새로 친다. 기다리는 동안
    // 다른 forced 호출이 새 요청을 띄웠다면 그건 뮤테이션 이후에 출발한 것이므로 합류해도 된다.
    if (force && inflight) await inflight.catch(() => {})

    if (inflight) return inflight

    const promise: Promise<void> = fetcher()
      .then(() => {
        // 성공했을 때만 신선도를 갱신한다. 실패는 캐시하지 않는다.
        fetchedAt = Date.now()
      })
      .finally(() => {
        // 내가 넣어둔 것이 아직 그대로일 때만 치운다 (남의 요청을 null 로 밀어내지 않게).
        if (inflight === promise) inflight = null
      })
    inflight = promise

    return promise
  }

  function invalidate(): void {
    fetchedAt = 0
  }

  return { run, invalidate }
}
