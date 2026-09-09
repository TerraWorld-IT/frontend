import type { ItemResponse } from '@terraworld-it/openapi-frontend'

// 기존 화면의 URL/이모지 분기를 그대로 공유한다.
export function isAssetUrl(s: string | undefined | null): boolean {
  return !!s && (s.startsWith('http') || s.startsWith('/'))
}

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

  // 배경은 외부 URL보다 slug PNG 규약을 우선하고, 다른 아이템은 원본 URL을 보존한다.
  function resolveItemImage(item: Pick<ItemResponse, 'slug' | 'assetUrl' | 'layout' | 'isAnimated'>): string {
    if (item.layout === 'BACKGROUND') return item.slug ? itemAssetUrl(item.slug) : placeholderUrl
    if (isAssetUrl(item.assetUrl)) return item.assetUrl
    return item.slug ? itemAssetUrl(item.slug, item.isAnimated ? 'gif' : 'png') : placeholderUrl
  }

  /** <img @error> 핸들러 — 에셋 부재 시 placeholder 로 1회 폴백(무한루프 가드). */
  function onAssetError(e: Event): void {
    const img = e.target as HTMLImageElement | null
    if (img && !img.src.endsWith('/placeholder.png')) {
      img.src = placeholderUrl
    }
  }

  return { itemAssetUrl, placeholderUrl, resolveItemImage, onAssetError }
}
