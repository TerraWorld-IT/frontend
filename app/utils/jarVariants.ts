/**
 * 병 색상 변형 배경 — 디자이너 "병N_배경_핑크" 처럼 배경 아이템이 병 뒤 그림이 아니라
 * **병 본체 자체의 색 변형**(레벨별 1장)인 경우의 매핑.
 *
 * 규약: 배경 아이템 slug `bg-<variant>` 에 대응하는 병 에셋 `/jar/lv{N}-<variant>.webp`(public/jar).
 * 상점 썸네일은 아이템 규약대로 `/items/bg-<variant>.png`.
 * 여기 없는 배경 아이템(bg-meadow 등)은 기존처럼 병 뒤 글로우 안의 이미지 레이어로 그린다.
 */
export const JAR_VARIANT_BACKGROUNDS: Readonly<Record<string, string>> = {
  'bg-pink': 'pink',
}

/** 배경 asset_url(`…/items/bg-pink.png` 또는 slug 규약 경로)에서 병 변형 이름을 얻는다. 변형 배경이 아니면 null. */
export function jarVariantFromAssetUrl(assetUrl: string | null | undefined): string | null {
  if (!assetUrl) return null
  const m = /\/items\/(bg-[a-z0-9-]+)\.png$/i.exec(assetUrl)
  if (!m) return null
  return JAR_VARIANT_BACKGROUNDS[m[1]!.toLowerCase()] ?? null
}

/** 아이템 slug 기준 판정(상점·관리 패널 타일에서 사용). */
export function isJarVariantBackground(slug: string | null | undefined): boolean {
  return !!slug && slug in JAR_VARIANT_BACKGROUNDS
}
