# 아이템 에셋 (PNG 교체형)

낙서장 req 4: 아이템은 나중에 git 으로 올라올 예정. 여기에 `<slug>.png` (정령/식물 애니메이션은 `<slug>.gif`)
를 drop 하면 코드 변경 없이 반영된다. 해석 규약 = `useItemAsset().itemAssetUrl(slug)`
→ `${NUXT_PUBLIC_ASSET_BASE|'/items'}/<slug>.png`.

- `placeholder.png` — 에셋 부재 시 폴백(아직 미포함, 디자이너 제공 예정).
- 네이밍: `stamp_{category}_{name}_{rarity}.png` 권장 (frontend/CLAUDE.md §12 디자인 에셋).
- 512×512 투명배경 PNG (2x retina), 리소 팔레트.
- 프로덕션은 `NUXT_PUBLIC_ASSET_BASE` 를 R2 CDN URL 로 교체(req 8) — 코드 변경 없이 소스만 전환.
