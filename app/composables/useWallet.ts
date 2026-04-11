import type { WalletInfo } from '~/types'

export function useWallet() {
  const { sdk, client } = useOpenApi()

  const wallet = ref<WalletInfo | null>(null)
  const loading = ref(false)

  async function fetchWallet() {
    loading.value = true
    try {
      const { data, error } = await sdk.getMe({ client })
      if (error) throw error
      // getMe returns user profile which includes wallet info
      if (data) {
        wallet.value = {
          basicCoin: (data as { basicCoin: number }).basicCoin ?? 0,
          tokens: (data as { tokens: WalletInfo['tokens'] }).tokens ?? [],
        }
      }
    } finally {
      loading.value = false
    }
  }

  async function exchangeSpecialToBasic(payload: { categoryId: number; amount: number }) {
    const { data, error } = await sdk.exchangeSpecialToBasic({ client, body: payload })
    if (error) throw error
    return data
  }

  async function exchangeTokens(payload: { fromCategoryId: number; toCategoryId: number; amount: number }) {
    const { data, error } = await sdk.exchangeTokens({ client, body: payload })
    if (error) throw error
    return data
  }

  return { wallet: readonly(wallet), loading: readonly(loading), fetchWallet, exchangeSpecialToBasic, exchangeTokens }
}
