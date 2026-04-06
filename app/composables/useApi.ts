export function useApi() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const apiFetch = $fetch.create({
    baseURL: config.public.apiBaseUrl as string,
    onRequest({ options }) {
      if (authStore.accessToken) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${authStore.accessToken}`,
        }
      }
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        authStore.clearAuth()
        navigateTo('/auth/login')
      }
    },
  })

  return { apiFetch }
}
