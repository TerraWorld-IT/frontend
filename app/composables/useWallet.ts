import type { WalletInfo, WalletTransaction, ExchangeTokenPayload } from '~/types'

export function useWallet() {
  const { get, post, getPage } = useApi()

  const wallet = ref<WalletInfo | null>(null)
  const loading = ref(false)

  async function fetchWallet() {
    loading.value = true
    try {
      wallet.value = await get<WalletInfo>('/wallet')
    } finally {
      loading.value = false
    }
  }

  async function fetchHistory(page = 1) {
    return getPage<WalletTransaction>('/wallet/history', { page })
  }

  async function exchangeToken(payload: ExchangeTokenPayload) {
    const result = await post<WalletInfo>('/wallet/exchange', payload)
    wallet.value = result
    return result
  }

  return { wallet: readonly(wallet), loading: readonly(loading), fetchWallet, fetchHistory, exchangeToken }
}
