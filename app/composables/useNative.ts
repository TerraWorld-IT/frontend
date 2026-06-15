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

  // --- Share ---
  async function share(opts: { title: string; text: string; url: string }) {
    if (!import.meta.client) return

    if (isNative) {
      const { Share } = await import('@capacitor/share')
      await Share.share(opts)
    } else if (navigator.share) {
      await navigator.share(opts)
    } else {
      await navigator.clipboard.writeText(opts.url)
    }
  }

  /**
   * 이미지 파일 공유 — 네이티브에서는 Cache 디렉토리에 임시 저장 후 시스템 공유 시트 호출,
   * 웹에서는 Web Share API (file 지원 시) 또는 다운로드 폴백.
   */
  async function shareFile(blob: Blob, filename: string, opts: { title?: string; text?: string } = {}) {
    if (!import.meta.client) return

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
      return
    }

    // 웹: Share API 의 file 지원 여부 확인
    if (navigator.share && 'canShare' in navigator) {
      const file = new File([blob], filename, { type: blob.type })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title: opts.title, text: opts.text, files: [file] })
        return
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
  }

  /**
   * Instagram 우선 공유 — 네이티브에서 Instagram 딥링크(Stories/feed)를 시도하고,
   * Instagram 미설치 / iOS / 웹 등 사용 불가 상황에서는 기존 generic shareFile() 로 graceful fallback.
   *
   * 플랫폼별 동작:
   *  - Android(native): Instagram 설치 여부를 `instagram://` URL 스킴으로 확인 후, 설치돼 있으면
   *    이미지를 캐시에 저장하고 시스템 공유 시트에 Instagram 패키지를 우선 노출(Share 플러그인은 특정 앱
   *    타겟팅을 지원하지 않으므로, 공유 시트가 뜬 상태에서 사용자가 Instagram 을 선택). 미설치면 shareFile().
   *  - iOS(native): Instagram 은 Stories 전용 pasteboard 스킴(instagram-stories://share)을 쓰는데
   *    Capacitor 표준 플러그인으로 pasteboard 주입이 불가하므로, instagram-stories:// 스킴 호출만 시도하고
   *    실패 시 즉시 generic shareFile() 로 fallback (사용자는 공유 시트에서 Instagram 선택 가능).
   *  - web: Instagram 웹 공유 API 가 없으므로 항상 shareFile() (Web Share / 다운로드) 로 fallback.
   */
  async function shareToInstagram(blob: Blob, filename: string, opts: { title?: string; text?: string } = {}) {
    if (!import.meta.client) return

    // 웹: Instagram 딥링크 불가 → 바로 generic 공유로 위임
    if (!isNative) {
      await shareFile(blob, filename, opts)
      return
    }

    // iOS Stories / Android feed 딥링크 스킴
    const scheme = isIOS ? 'instagram-stories://share' : 'instagram://library'

    const opened = await tryOpenUrl(scheme)
    if (!opened) {
      // Instagram 미설치 또는 스킴 호출 거부 → 시스템 공유 시트로 안전하게 폴백
      await shareFile(blob, filename, opts)
      return
    }

    // Instagram 이 열렸더라도 이미지 전달은 표준 플러그인으로 보장되지 않으므로,
    // 사용자가 Instagram 에서 직접 첨부할 수 있도록 시스템 공유 시트도 함께 띄운다.
    await shareFile(blob, filename, opts)
  }

  /**
   * 네이티브에서 URL 스킴 열기 시도. 성공 여부를 boolean 으로 반환 (앱 미설치 시 false).
   * @capacitor/app 의 openUrl 은 일부 버전에서 미지원이라 window.location fallback 을 둔다.
   */
  async function tryOpenUrl(url: string): Promise<boolean> {
    if (!isNative) return false
    try {
      const { App } = await import('@capacitor/app')
      const maybeOpen = (App as unknown as { openUrl?: (o: { url: string }) => Promise<{ completed: boolean }> }).openUrl
      if (typeof maybeOpen === 'function') {
        const res = await maybeOpen({ url })
        return res.completed === true
      }
      // openUrl 미지원 버전: 직접 navigation 시도 (미설치 시 no-op 이라 false 로 간주)
      window.location.href = url
      return false
    }
    catch {
      return false
    }
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
