# 아이템 에셋 (PNG 교체형)

낙서장 req 4: 아이템은 나중에 git 으로 올라올 예정. 여기에 `<slug>.png` (정령/식물 애니메이션은 `<slug>.gif`)
를 drop 하면 코드 변경 없이 반영된다. 해석 규약 = `useItemAsset().itemAssetUrl(slug)`
→ `${NUXT_PUBLIC_ASSET_BASE|'/items'}/<slug>.png`.

- `placeholder.png` — 에셋 부재 시 폴백(연파랑 타일 + 잎 실루엣, 256×256). 디자이너 플레이스홀더가 오면 교체.
- 네이밍: `stamp_{category}_{name}_{rarity}.png` 권장 (frontend/CLAUDE.md §12 디자인 에셋).
- 투명배경 PNG (2x retina). 디자이너 원본은 비정사각(400~520px)이라 정사각 규약을 강제하지 않는다 — 상점·병은 object-contain 으로 맞춘다.
- 프로덕션은 `NUXT_PUBLIC_ASSET_BASE` 를 R2 CDN URL 로 교체(req 8) — 코드 변경 없이 소스만 전환.

## 디자이너 식물 13종 (2026-08-26, Figma 상점 카탈로그)

backend V41 시드의 slug 와 1:1 — `tillandsia-ionantha`(이오난사) `round-leaf-acacia`(둥근잎 아카시아) `wind-orchid`(풍란)
`weed`(잡초) `humata-fern`(후마타 고사리) `scindapsus`(스킨답서스) `jeju-creeping-fig`(제주애기모람)
`pilea-peperomioides`(필레아 페페) `dischidia`(콩란) `red-star`(레드스타) `nandina`(남천) `pteris`(프테리스)
`stephania`(스테파니아). 원본은 400~520px 투명 PNG(디자이너 Drive `I_식물_*.png`), 이름만 slug 로 바꿔 그대로 둔다.
정령(`cat-spirit`)은 `/spirits/stage2.png` 를 asset_url 로 직접 가리킨다(이 폴더 규약 밖).

## 배경 아이템 — 병 색 변형 (2026-09-16, 디자이너 Drive `병N_배경_핑크.png`)

배경 아이템 `bg-pink`(backend V47) 는 병 뒤 그림이 아니라 **병 본체의 핑크 색 변형**이다. 프론트 규약(`utils/jarVariants.ts`):
slug `bg-<variant>` 에 대응하는 병 에셋 `public/jar/lv{1,2,3}-<variant>.webp`(800x1105, 원본 1000x1381 PNG 를 webp q90 변환).
이 폴더의 `bg-pink.png` 는 상점·관리 패널 썸네일(병1 핑크 400x552). 새 색 변형이 오면 `JAR_VARIANT_BACKGROUNDS` 에 한 줄 추가 + 병 webp 3장 + 썸네일 1장.
