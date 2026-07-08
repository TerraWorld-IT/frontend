import { Capacitor } from '@capacitor/core'

/**
 * Native API bridge composable.
 *
 * Detects platform (web/ios/android) and provides safe wrappers around
 * Capacitor plugin calls. Falls back gracefully on web.
 *
 * Usage:
 *   const { isNative, share, hapticImpact } = useNative()
 *   await share({ title: 'My Terrarium', text: '...', url: '...' })
 */
export function useNative() {
  const isNative = import.meta.client ? Capacitor.isNativePlatform() : false
  const platform = import.meta.client ? Capacitor.getPlatform() : 'web'
  const isIOS = platform === 'ios'
  const isAndroid = platform === 'android'

  /** 사용자가 공유 시트를 취소했을 때 흔한 에러 신호 — 실패 토스트를 띄우면 안 되는 정상 경로. */
  function isShareCancellation(e: unknown): boolean {
    if (e instanceof DOMException && e.name === 'AbortError') return true
    const msg = e instanceof Error ? e.message : String(e)
    return /cancel/i.test(msg)
  }

  // --- Share ---
  // 취소는 조용히 무시하고, 실제 실패만 토스트로 알린다 — 호출부마다 개별 try/catch 를
  // 강제하지 않고 이 컴포저블 내부에서 일관 처리(Codex 감사 지적 — 이전엔 실패/취소가
  // unhandled promise rejection 으로만 남고 사용자에게 아무 피드백이 없었음).
  // 반환값(true=완료/false=취소·실패)은 await 하는 호출부가 성공 후속 동작(토스트/추적)을
  // 실패 시에도 실행하지 않도록 분기하는 데 쓴다(Codex Round 2 — void 로 fire-and-forget
  // 하는 호출부는 반환값을 무시해도 안전).
  async function share(opts: { title: string; text: string; url: string }): Promise<boolean> {
    if (!import.meta.client) return false
    try {
      if (isNative) {
        const { Share } = await import('@capacitor/share')
        await Share.share(opts)
      } else if (navigator.share) {
        await navigator.share(opts)
      } else {
        await navigator.clipboard.writeText(opts.url)
      }
      return true
    }
    catch (e) {
      if (isShareCancellation(e)) return false
      const { error } = useToast()
      error('공유에 실패했어요')
      return false
    }
  }

  /**
   * 이미지 파일 공유 — 네이티브에서는 Cache 디렉토리에 임시 저장 후 시스템 공유 시트 호출,
   * 웹에서는 Web Share API (file 지원 시) 또는 다운로드 폴백.
   */
  async function shareFile(blob: Blob, filename: string, opts: { title?: string; text?: string } = {}): Promise<boolean> {
    if (!import.meta.client) return false

    try {
      if (isNative) {
        // 1) blob → base64 변환 (Capacitor Filesystem 은 base64 string 만 받음)
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            resolve(result.split(',')[1] ?? '')
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        // 2) 임시 캐시에 PNG 저장
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        const result = await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Cache,
        })
        // 3) 네이티브 공유 시트 호출 (files 배열 — Capacitor Share v6+)
        const { Share } = await import('@capacitor/share')
        await Share.share({
          title: opts.title,
          text: opts.text,
          files: [result.uri],
          dialogTitle: opts.title,
        })
        return true
      }

      // 웹: Share API 의 file 지원 여부 확인
      if (navigator.share && 'canShare' in navigator) {
        const file = new File([blob], filename, { type: blob.type })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: opts.title, text: opts.text, files: [file] })
          return true
        }
      }

      // 폴백: 다운로드 트리거
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return true
    }
    catch (e) {
      if (isShareCancellation(e)) return false
      const { error } = useToast()
      error('공유에 실패했어요')
      return false
    }
  }

  /**
   * Instagram 공유.
   *
   * Capacitor 표준 플러그인으로는 이미지를 Instagram(Stories pasteboard / feed)에 직접 주입할 수
   * 없다. 딥링크로 빈 Instagram 을 띄운 뒤 시스템 공유 시트까지 함께 노출하면 이중 공유가 되어
   * UX 가 나빠진다(코드리뷰 2026-06-15). 가장 신뢰성 있는 경로인 시스템 공유 시트(shareFile)로
   * 위임한다 — 공유 시트에 Instagram 이 타겟으로 노출되어 사용자가 이미지를 첨부한 채 선택할 수 있다.
   * (이미지를 실은 네이티브 Stories 딥링크는 별도 pasteboard 플러그인이 필요 — 후속 과제)
   */
  async function shareToInstagram(blob: Blob, filename: string, opts: { title?: string; text?: string } = {}): Promise<boolean> {
    if (!import.meta.client) return false
    return shareFile(blob, filename, opts)
  }

  // --- Haptics ---
  async function hapticImpact(style: 'Heavy' | 'Medium' | 'Light' = 'Medium') {
    if (!isNative) return
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle[style] })
  }

  async function hapticNotification(type: 'Success' | 'Warning' | 'Error' = 'Success') {
    if (!isNative) return
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType[type] })
  }

  // --- Camera ---
  async function takePhoto() {
    if (!import.meta.client) return undefined // SSR guard
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    return Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
    })
  }

  // --- Push Notifications ---
  async function registerPush() {
    if (!isNative) return null
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const perm = await PushNotifications.requestPermissions()
    if (perm.receive === 'granted') {
      await PushNotifications.register()
    }
    return perm
  }

  /**
   * Subscribe to push notifications received while app is in foreground.
   * Returns a cleanup function — call it in onUnmounted() to prevent listener stacking.
   */
  async function onPushReceived(callback: (notification: { title?: string; body?: string; data?: Record<string, unknown> }) => void) {
    if (!isNative) return () => {}
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const handle = await PushNotifications.addListener('pushNotificationReceived', (n) => {
      callback({ title: n.title, body: n.body, data: n.data as Record<string, unknown> })
    })
    return () => handle.remove()
  }

  // --- Splash Screen ---
  async function hideSplash() {
    if (!isNative) return
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide({ fadeOutDuration: 300 })
  }

  // --- Status Bar ---
  async function setStatusBarColor(color: string) {
    if (!isNative) return
    const { StatusBar } = await import('@capacitor/status-bar')
    await StatusBar.setBackgroundColor({ color })
  }

  /**
   * Clear push token on logout — call from sign-out flow.
   */
  function clearPushToken() {
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN)
    }
  }

  return {
    isNative,
    platform,
    isIOS,
    isAndroid,
    share,
    shareFile,
    shareToInstagram,
    hapticImpact,
    hapticNotification,
    takePhoto,
    registerPush,
    onPushReceived,
    hideSplash,
    setStatusBarColor,
    clearPushToken,
  }
}
