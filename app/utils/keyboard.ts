/**
 * 텍스트 입력이 있는 모달/시트를 닫거나 다른 화면으로 전환하기 직전에 호출.
 *
 * 근본 원인: v-if/v-show 로 제어되는 모달 안의 <input>/<textarea> 가 포커스를 유지한 채
 * blur 없이 DOM 에서 즉시 제거되면, Android/iOS WebView 의 IME(소프트 키보드)가 닫힘 신호를
 * 못 받아 화면에 남는 콘텐츠가 없는데도 키보드만 떠 있는 상태가 될 수 있다.
 *
 * document.activeElement.blur() 는 반드시 첫 await 이전에 동기적으로 실행한다 — 호출부가
 * `void dismissKeyboard()` 로 fire-and-forget 하는 경우가 많은데, blur() 가 async 체인 뒤에
 * 있으면 호출 직후 이어지는 동기 코드(예: v-if 상태 변경으로 input 이 언마운트되거나, 다른
 * 요소로 포커스가 복귀되는 로직)가 먼저 실행돼버려 정작 필요한 input 이 아니라 엉뚱한
 * 요소를 blur 하거나, 이미 사라진 뒤라 아무 효과가 없어질 수 있다(Codex 감사로 발견).
 * Capacitor Keyboard.hide() 는 그 뒤에 best-effort 로 호출 — 실패해도 UI 흐름을 막지 않는다.
 */
export async function dismissKeyboard(): Promise<void> {
  if (!import.meta.client) return

  const active = document.activeElement
  if (active instanceof HTMLElement) {
    active.blur()
  }

  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { Keyboard } = await import('@capacitor/keyboard')
      await Keyboard.hide()
    }
  }
  catch {
    // Keyboard 플러그인 미가용 — 무시.
  }
}
