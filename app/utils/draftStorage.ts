/** 저장소 차단이나 잘못된 JSON은 초안 없음으로 처리한다. */
export function readDraft<T>(key: string): T | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw) as T
  }
  catch {
    return null
  }
}

/** 이탈 훅이 연속 실행되어도 같은 초안은 한 번만 쓴다. */
export function writeDraft<T>(key: string, value: T): void {
  if (!import.meta.client) return
  try {
    const raw = JSON.stringify(value)
    if (raw !== undefined && localStorage.getItem(key) !== raw) localStorage.setItem(key, raw)
  }
  catch {
    // 저장소 차단·용량 초과 시에도 화면 이탈은 허용한다.
  }
}

/** 저장 성공 시 초안을 지우되 저장소 접근 실패가 성공 처리를 막지 않게 한다. */
export function clearDraft(key: string): void {
  if (!import.meta.client) return
  try {
    localStorage.removeItem(key)
  }
  catch {
    // 저장소 접근 불가 — 서버에 저장된 기록은 유지한다.
  }
}
