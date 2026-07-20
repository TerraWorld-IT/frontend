import { Capacitor, registerPlugin } from '@capacitor/core'

/**
 * 인스타그램 스토리 직접 공유 브리지 — mobile 앱-로컬 InstagramStoriesPlugin 과 동기.
 * (2026-07-21 요구: 테라리움 투명 스티커를 스토리 카메라 위에 올리기 — Codex 설계 [B])
 *
 * Meta "Sharing to Stories" 계약: Android = ADD_TO_STORY intent, iOS = pasteboard(5분) +
 * instagram-stories:// 스킴. 표준 시스템 공유 시트로는 불가능해 전용 플러그인 사용.
 * 반환 'fallback-needed' 시 호출부는 기존 시스템 공유 시트로 폴백한다 — 폴백 제거 금지.
 */
interface InstagramStoriesPlugin {
  isAvailable(): Promise<{ available: boolean }>
  shareSticker(options: {
    stickerBase64: string
    sourceApplication: string
    topColor?: string
    bottomColor?: string
  }): Promise<{ opened: boolean }>
}

const InstagramStories = registerPlugin<InstagramStoriesPlugin>('InstagramStories')

export type StoryShareResult = 'opened' | 'fallback-needed'

/**
 * 스토리 편집기 열기 시도. 성공 판정은 "편집기 열림"까지 — 실제 게시 여부는 알 수 없다.
 * 불가 조건(웹/구버전 셸/인스타 미설치/Meta App ID 미설정/호출 실패)은 전부 fallback-needed.
 * metaAppId 는 호출부(컴포넌트)가 runtimeConfig 에서 주입 — lib 는 Nuxt auto-import 밖.
 */
export async function shareToInstagramStory(stickerDataUrl: string, metaAppId: string): Promise<StoryShareResult> {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('InstagramStories')) {
    return 'fallback-needed'
  }
  if (!metaAppId.trim()) {
    // Meta 계약상 source_application 필수 — 미설정 배포에서는 정직하게 폴백.
    return 'fallback-needed'
  }
  try {
    const { available } = await InstagramStories.isAvailable()
    if (!available) return 'fallback-needed'
    const { opened } = await InstagramStories.shareSticker({
      stickerBase64: stickerDataUrl,
      sourceApplication: metaAppId,
      topColor: '#FFF8EB',
      bottomColor: '#DFF3E8',
    })
    return opened ? 'opened' : 'fallback-needed'
  }
  catch {
    return 'fallback-needed'
  }
}
