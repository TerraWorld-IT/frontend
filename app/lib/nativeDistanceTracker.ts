import { Capacitor, registerPlugin } from '@capacitor/core'

/**
 * 거리 기록 네이티브 브리지 계약 — mobile 앱-로컬 DistanceTrackerPlugin 과 동기.
 * (2026-07-21 백그라운드 거리 유실 리포트 후속 — Codex 설계 [A] 단계적 하이브리드)
 *
 * 동작 모델: 네이티브 가용 시 웹 geolocation watch 를 쓰지 않고 네이티브 fix 큐를
 * 단일 소스로 사용한다(전경 polling drain + 복귀 drain). 이중 집계 방지가 목적 —
 * 서비스는 화면이 보일 때 시작(while-in-use FGS)되어 전경/배경 모두 수집하므로
 * 웹 watch 와 병행하면 같은 이동이 두 번 잡힌다.
 *
 * 구버전 셸(플러그인 없음)/웹에서는 모든 호출이 실패하며, 호출부(record 페이지)는
 * 기존 웹 watch + 복귀 직선거리 하한 보정으로 폴백한다 — 폴백 제거 금지.
 * ⚠️ 네이티브 경로는 실기기 QA(화면잠금/OEM 절전/배터리) 전까지 검증되지 않은 상태다.
 */
export interface DistanceFix {
  seq: number
  time: number
  lat: number
  lng: number
  accuracy: number
}

interface DistanceTrackerPlugin {
  isAvailable(): Promise<{ available: boolean }>
  start(options: { sessionId: string }): Promise<void>
  drain(options: { sessionId: string, afterSeq: number }): Promise<{ fixes: DistanceFix[], lastSeq: number }>
  stop(options: { sessionId: string, afterSeq: number }): Promise<{ fixes: DistanceFix[], lastSeq: number }>
}

const DistanceTracker = registerPlugin<DistanceTrackerPlugin>('DistanceTracker')

/** 네이티브 트래커 가용 여부 — 구버전 셸/웹은 false (호출부는 웹 watch 폴백). */
export async function isNativeDistanceTrackerAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  if (!Capacitor.isPluginAvailable('DistanceTracker')) return false
  try {
    const { available } = await DistanceTracker.isAvailable()
    return available
  }
  catch {
    return false
  }
}

// 종료 요청이 실패한 세션 — 화면을 떠나 상태를 보존할 수 없을 때 다음 측정 시작·화면 진입에서
// 같은 세션 ID 로 다시 종료한다. 네이티브 stop 은 세션 불일치·중복 호출을 무시하므로 멱등이다.
const pendingStopSessions = new Set<string>()

/** 세션 종료 + 잔여 fix 회수. 실패하면 세션을 재시도 대상으로 남기고 오류를 그대로 던진다. */
export async function stopNativeSession(sessionId: string, afterSeq: number): Promise<{ fixes: DistanceFix[], lastSeq: number }> {
  try {
    const result = await DistanceTracker.stop({ sessionId, afterSeq })
    pendingStopSessions.delete(sessionId)
    return result
  }
  catch (e) {
    pendingStopSessions.add(sessionId)
    throw e
  }
}

/** 이전에 종료하지 못한 세션을 다시 종료한다. 실패한 세션은 다음 기회까지 남는다. */
export async function retryPendingNativeStops(): Promise<void> {
  // 순회 중 성공한 세션은 지워지고 실패한 세션은 그대로 남는다(Set 순회는 삭제에 안전).
  for (const sessionId of pendingStopSessions) {
    await stopNativeSession(sessionId, 0).catch(() => {})
  }
}

export { DistanceTracker }
