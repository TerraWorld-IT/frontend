import * as sdk from '@terraworld-it/openapi-frontend'

/**
 * Convenience composable that exposes both:
 *   - `sdk`    : the generated `@terraworld-it/openapi-frontend` SDK
 *                (e.g. `sdk.loginWithCredentials`, `sdk.getHealth`, ...)
 *   - `client` : the Nuxt-injected `@hey-api/client-fetch` instance
 *                configured in `app/plugins/openapi.ts`
 *
 * Example:
 *
 *   const { sdk, client } = useOpenApi()
 *   const { data, error } = await sdk.loginWithCredentials({
 *     client,
 *     body: { email: 'foo@bar.io', password: '...' },
 *   })
 *
 *   if (error) toast.error(error.message)
 *   if (data) session.set(data.accessToken)
 *
 * Prefer this over `useApi()` for any endpoint defined in the openapi spec —
 * it's fully typed against the spec and compile-errors when the spec changes.
 * `useApi()` remains available for paths not yet migrated.
 */
export function useOpenApi() {
  const { $apiClient } = useNuxtApp()
  return {
    sdk,
    client: $apiClient,
  }
}
