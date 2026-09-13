import { setWidgetOwner, widgetAvailable } from '~/lib/terraWidget'
import { useUserStore } from '~/stores/user'

export default defineNuxtPlugin((nuxtApp) => {
  if (!widgetAvailable()) return
  const user = useUserStore()
  // 앱 전역: 로그아웃은 홈 컴포넌트 밖 설정 화면에서도 발생할 수 있다.
  const stop = watch(() => user.me?.userId ?? null, setWidgetOwner, { immediate: true, flush: 'sync' })
  nuxtApp.vueApp.onUnmount(stop)
  if (import.meta.hot) import.meta.hot.dispose(stop)
})
