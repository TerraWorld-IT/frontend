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
