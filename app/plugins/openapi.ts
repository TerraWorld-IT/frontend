import { createClient, createConfig } from '@hey-api/client-fetch'

/**
 * TerraWorld OpenAPI client plugin.
 *
 * Creates a single `@hey-api/client-fetch` instance configured with the
 * runtime API base URL, and exposes it via `useNuxtApp().$apiClient`.
 *
 * Consumption pattern (recommended):
 *
 *   import * as api from '@terraworld-it/openapi-frontend'
 *   const { $apiClient } = useNuxtApp()
 *   const { data, error } = await api.loginWithCredentials({
 *     client: $apiClient,
 *     body: { email, password },
 *   })
 *
 * Or via the `useOpenApi()` composable wrapper in `app/composables/useOpenApi.ts`.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const apiClient = createClient(
    createConfig({
      baseUrl: config.public.apiBaseUrl as string,
      // credentials: 'include' ensures better-auth session cookies flow to the
      // Spring Boot API when it sits on a different origin.
      credentials: 'include',
    }),
  )

  apiClient.interceptors.request.use((request) => {
    // Backend auth (JWT) will attach its token here once issued.
    // const token = useCookie('access_token').value
    // if (token) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  })

  apiClient.interceptors.response.use((response) => {
    if (response.status === 401 && import.meta.client) {
      navigateTo('/auth/login')
    }
    return response
  })

  return {
    provide: {
      apiClient,
    },
  }
})
