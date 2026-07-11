/**
 * Promise 에 **하드 데드라인**을 걸고, 데드라인 초과 시 (선택적으로) 진짜로 요청을 abort 한다.
 *
 * 왜 필요한가: better-fetch(그 위의 better-auth)의 `fetchOptions.timeout` 은 응답 **헤더**를
 * 받는 순간 abort 타이머를 꺼버린다(`@better-fetch/fetch` 소스 확인). 서버/프록시가 헤더만
 * 빨리 주고 **본문(body)을 영영 안 흘려보내면** 요청이 끝나지 않아 `await` 가 무한히 매달린다.
 *
 * 두 가지를 함께 한다:
 *  1) `Promise.race` 로 호출부의 대기를 ms 안에 끊는다(데드라인 초과 시 reject).
 *  2) `controller` 를 넘기면 데드라인에 `controller.abort()` 를 호출해 **원본 요청까지 취소**한다.
 *     그러지 않으면 stalled 요청이 orphan 으로 남아 stream/소켓/서버 부수효과가 누적된다.
 *     (better-fetch 는 외부 signal 이 있으면 자기 timeout 타이머를 안 걸고 그 signal 을 쓴다 —
 *      즉 signal 하나로 헤더·본문 전 구간을 통제한다.)
 *
 * 사용법:
 *   const ac = new AbortController()
 *   await withTimeout(getSession({ fetchOptions: { signal: ac.signal } }), 5000, ac)
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  controller?: AbortController,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller?.abort()
      reject(new Error('withTimeout: deadline exceeded'))
    }, ms)
  })
  return Promise.race([promise, deadline]).finally(() => {
    if (timer !== undefined) clearTimeout(timer)
  })
}
