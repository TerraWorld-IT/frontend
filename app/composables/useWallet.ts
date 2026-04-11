import type { CurrencyResponse } from '@terraworld-it/openapi-frontend'

export function useWallet() {
  const { sdk, client } = useOpenApi()

  const currency = ref<CurrencyResponse | null>(null)
  const loading = ref(false)

  async function fetchWallet() {
    loading.value = true
    try {
      const { data, error } = await sdk.getMe({ client })
      if (error) throw error
      // UserMeResponse.currency has the actual wallet shape
      currency.value = (data as { currency: CurrencyResponse })?.currency ?? null
    } finally {
      loading.value = false
    }
  }

  async function exchangeSpecialToBasic(amount: number) {
    const { data, error } = await sdk.exchangeSpecialToBasic({ client, body: { amount } })
    if (error) throw error
    // Refresh currency after exchange
    if (data && 'updatedCurrency' in data) {
      currency.value = (data as { updatedCurrency: CurrencyResponse }).updatedCurrency
    }
    return data
  }

  async function exchangeTokens(payload: { fromCategoryId: number; toCategoryId: number; amount: number }) {
    const { data, error } = await sdk.exchangeTokens({ client, body: payload })
    if (error) throw error
    if (data && 'updatedCurrency' in data) {
      currency.value = (data as { updatedCurrency: CurrencyResponse }).updatedCurrency
    }
    return data
  }

  return {
    currency: readonly(currency),
    loading: readonly(loading),
    fetchWallet,
    exchangeSpecialToBasic,
    exchangeTokens,
  }
}
