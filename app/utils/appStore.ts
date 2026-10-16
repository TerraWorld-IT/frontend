export interface AppStoreConfig {
  appStoreId?: string
  appStoreProviderToken?: string
}

export function buildAppStoreUrl(campaign: string, config: AppStoreConfig = {}): string {
  const url = new URL(`https://apps.apple.com/kr/app/terraworld/id${config.appStoreId || '6786987682'}`)
  if (config.appStoreProviderToken) {
    url.searchParams.set('pt', config.appStoreProviderToken)
    url.searchParams.set('ct', campaign)
    url.searchParams.set('mt', '8')
  }
  return url.toString()
}

export function buildSmartBannerContent(
  { campaign, appArgument }: { campaign: string; appArgument?: string },
  config: AppStoreConfig = {},
): string {
  let content = `app-id=${config.appStoreId || '6786987682'}`
  if (config.appStoreProviderToken) {
    const affiliate = new URLSearchParams({ pt: config.appStoreProviderToken, ct: campaign, mt: '8' })
    content += `, affiliate-data=${affiliate}`
  }
  if (appArgument) content += `, app-argument=${appArgument}`
  return content
}
