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

/**
 * Cast hey-api SDK response `data` to the expected concrete type.
 *
 * @hey-api/client-fetch applies `TData[keyof TData]` to response types,
 * collapsing multi-field objects into a union of their field value types.
 * e.g. `CreateRecordResponse { record, reward, updatedCurrency }` becomes
 *      `RecordResponse | RewardInfo | CurrencyResponse` instead of the full object.
 *
 * This utility provides a clean, consistent cast point across all SDK consumers.
 */
export function castData<T>(data: unknown): T | undefined {
  return data as unknown as T | undefined
}
