/**
 * 아이템 에셋(PNG/GIF) 해석 composable — 낙서장 리팩토링 req 4(PNG 교체형) + req 8(env).
 *
 * 아이템은 `slug` 만 알고, 렌더 에셋은 규약 경로 `${assetBase}/${slug}.png` 로 파생한다.
 * → 나중에 **png 파일만 교체**하면 코드/스키마 변경 0. (정령/판타지식물 애니메이션은 `.gif`.)
 *
 * `assetBase` 는 env(`NUXT_PUBLIC_ASSET_BASE`) — 로컬 `/items` ↔ R2 CDN 를 키/URL 교체만으로 전환.
 * 에셋 부재 시 `placeholder.png` 로 graceful fallback(디자이너가 png drop 시 자동 반영).
 *
 * 사용:
 *   const { itemAssetUrl, onAssetError } = useItemAsset()
 *   <img :src="itemAssetUrl(item.slug)" @error="onAssetError" />
 */
export function useItemAsset() {
  const base = (useRuntimeConfig().public.assetBase as string) || '/items'
  const root: string = base.replace(/\/+$/, '')

  function itemAssetUrl(slug: string, ext: 'png' | 'gif' = 'png'): string {
    return `${root}/${slug}.${ext}`
  }

  const placeholderUrl: string = `${root}/placeholder.png`

  /** <img @error> 핸들러 — 에셋 부재 시 placeholder 로 1회 폴백(무한루프 가드). */
  function onAssetError(e: Event): void {
    const img = e.target as HTMLImageElement | null
    if (img && !img.src.endsWith('/placeholder.png')) {
      img.src = placeholderUrl
    }
  }

  return { itemAssetUrl, placeholderUrl, onAssetError }
}
