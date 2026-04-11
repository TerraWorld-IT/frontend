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

  async function onPushReceived(callback: (notification: { title?: string; body?: string; data?: Record<string, unknown> }) => void) {
    if (!isNative) return
    const { PushNotifications } = await import('@capacitor/push-notifications')
    PushNotifications.addListener('pushNotificationReceived', (n) => {
      callback({ title: n.title, body: n.body, data: n.data as Record<string, unknown> })
    })
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

  return {
    isNative,
    platform,
    isIOS,
    isAndroid,
    share,
    hapticImpact,
    hapticNotification,
    takePhoto,
    registerPush,
    onPushReceived,
    hideSplash,
    setStatusBarColor,
  }
}
