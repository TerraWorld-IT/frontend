import { Capacitor, registerPlugin } from '@capacitor/core'
import { toValue, type MaybeRefOrGetter } from 'vue'

interface ReviewState {
  days: string[]
  requestedVersions: string[]
}

export function useAppReview(userId: MaybeRefOrGetter<string | null | undefined>) {
  async function maybeRequestReview(): Promise<void> {
    try {
      if (!import.meta.client || Capacitor.getPlatform() !== 'ios' || !Capacitor.isPluginAvailable('InAppReview')) return
      const id = toValue(userId)
      if (!id) return
      const key = `tw:app-review:${id}`
      const readState = (): ReviewState => {
        const raw = localStorage.getItem(key)
        if (!raw) return { days: [], requestedVersions: [] }
        const state: ReviewState = JSON.parse(raw)
        if (!Array.isArray(state.days) || !state.days.every(day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day))
          || !Array.isArray(state.requestedVersions) || !state.requestedVersions.every(version => typeof version === 'string')) {
          throw new Error('Invalid review state')
        }
        return state
      }
      const state = readState()
      const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
      state.days = [...new Set([...state.days, today])].slice(-3)
      localStorage.setItem(key, JSON.stringify(state))
      if (state.days.length < 3) return

      const { App } = await import('@capacitor/app')
      const { version } = await App.getInfo()
      if (!version || toValue(userId) !== id) return
      // 비동기 버전 조회 사이 다른 호출이 요청했을 수 있으므로 최신 상태를 다시 읽는다.
      const latest = readState()
      if (latest.requestedVersions.includes(version)) return
      latest.requestedVersions.push(version)
      // 플러그인 실패도 요청 시도로 저장해 같은 버전에서 반복 요청하지 않는다.
      localStorage.setItem(key, JSON.stringify(latest))
      await registerPlugin<{ requestReview(): Promise<void> }>('InAppReview').requestReview()
    }
    catch {
      // 보조 기능의 저장소·네이티브 실패는 기록 저장과 사용자 피드백에 영향을 주지 않는다.
    }
  }

  return { maybeRequestReview }
}
