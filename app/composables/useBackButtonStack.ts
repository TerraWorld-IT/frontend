/**
 * 모달/바텀시트가 열려있을 때 Android 하드웨어 뒤로가기 버튼이 라우트 이력을 넘기거나
 * 앱을 종료하는 대신 "가장 최근에 열린 오버레이부터" 닫도록 하는 전역 스택.
 *
 * Modal.vue 등 오버레이 컴포넌트가 열릴 때 자신의 close 콜백을 push, 닫히거나
 * unmount 될 때 그 콜백을 pop 한다. capacitor.client.ts 의 backButton 리스너는
 * 라우트 이력/앱종료 로직보다 먼저 이 스택을 소비한다.
 *
 * 모듈 레벨 배열 — Modal.vue 의 body.dataset.modalDepth 카운터와 동일한 패턴(Vue 반응성 불필요,
 * 단순 등록/해제 스택).
 */
const stack: Array<() => void> = []

export function useBackButtonStack() {
  /** 오버레이가 열릴 때 호출 — 반환된 함수를 오버레이가 닫힐 때(또는 unmount 시) 호출해 해제한다. */
  function pushBackHandler(onBack: () => void): () => void {
    stack.push(onBack)
    return () => {
      const idx = stack.lastIndexOf(onBack)
      if (idx !== -1) stack.splice(idx, 1)
    }
  }

  /**
   * 스택 최상단 핸들러를 소비한다. 처리했으면 true(호출부는 추가 동작 — 라우트 back/앱종료 — 을
   * 하지 말아야 함), 스택이 비어있으면 false.
   */
  function popTopBackHandler(): boolean {
    const top = stack.pop()
    if (!top) return false
    top()
    return true
  }

  return { pushBackHandler, popTopBackHandler }
}
