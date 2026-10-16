import { buildSmartBannerContent } from '~/utils/appStore'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  useHead({
    meta: [{
      key: 'smart-app-banner',
      name: 'apple-itunes-app',
      content: buildSmartBannerContent({ campaign: 'web' }, config.public),
    }],
  })
})
