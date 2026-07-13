# TerraWorld Frontend — 프로젝트 지침

> 일상 행동을 기록하면 리소페인트 스타일의 아이템을 모아 나만의 테라리움을 꾸미는 기록형 힐링 서비스
> **제4회 2026 IT 프로젝트 공모전** 출전작 (숭실대 디지털미디어학과)

> ⚠️ **2026-07-09 코드 정합 안내**: 2026-07 앱 전면 개편으로 아래 일부 서술이 stale입니다. 특히 **`useEvolution.ts`·`UpgradeModal`·5단계 진화(POT/BOTTLE/…)·레벨/EXP·WalletBar EXP는 제거됨**(테라리움은 tier 4단계로 대체). 기록 화면은 습관 트래커 + 일상 기록(투두/일기/집중/거리)으로 재편, 재화 7종(코인·루비·반짝이·활동토큰4), 성장(정령)·테마 갤러리 신규. **현재 코드 설계 SoT = `docs/analyze/2026-07-09-webapp-native-status.md`** (repo root). 아래 코드 구조 트리/모달 목록의 진화 관련 항목은 무효.

---

## 1. 서비스 개요

### 핵심 경험 루프

```
기록(행동 입력) → 보상(코인/토큰/반짝이) → 수집(아이템 구매) → 꾸미기(스탬프 연출 배치) → 공유 → 재방문
```

- **기록**이 본체, 꾸미기/리워드는 기록 지속 동기 장치
- 기능은 "아이템 배치", 시각 연출은 **"스탬프 찍기"**

### 공모전 심사 기준

| 항목 | 비중 | 프론트 관련 포인트 |
|------|------|-------------------|
| 창의성 | 40% | 리소페인트 아트 × 테라리움 세계관 × 스탬프 인터랙션 |
| 기술성 | 30% | UI/UX 완성도, PixiJS 캔버스, 반응형, 성능 |
| 성과지표 | 28% | 공유 바이럴, GA4 이벤트 트래킹, DAU/잔존율 |
| 팀 다양성 | 2% | — |

### 핵심 일정 (프론트 기준)

| 마일스톤 | 날짜 | FE 목표 |
|----------|------|---------|
| 기획 서면 제출 | 5/15 | 와이어프레임 + 디자인 컨셉 확정 |
| 1차 중간점검 | 7월 중순 | 핵심 루프 동작 (기록→보상→구매→꾸미기→공유) |
| 2차 중간점검 | 9월 중순 | 프로덕션 배포 완료 |
| 성과지표 측정 | 11/1~11/8 | DAU 추적, GA4 리포트, 공유 바이럴 |
| 최종 발표 | 11월 중순 | 발표 자료, 데모 |

---

## 2. 기술 스택

```
Framework:      Nuxt 4.4.2 (Vue 3.5, Nitro, Vite 7)
Package Mgr:    bun
Styling:        Tailwind CSS v4.2 (CSS-first @theme, @tailwindcss/vite)
State:          Pinia
2D Rendering:   PixiJS v8 (multiply blending, stamp animation, RainParticles)
Auth:           better-auth (Nitro 서버, PostgreSQL 공유 DB)
Validation:     미도입 (valibot 없음 — 폼 검증은 네이티브 제약 + 서버측 better-auth hook)
Icons:          @nuxt/icon + @iconify-json/lucide (clientBundle 로 번들 — 런타임 fetch 없음)
Date:           dayjs
Lint:           oxlint (3 rules: no-unused-vars, no-console, eqeqeq)
Format:         미적용 (Option A) — 상세 결정은 `docs/decisions/ADR-004-prettier-policy.md` 참조 (2026-05-16 격상).
                요약: oxlint 만 사용, prettier 미도입. 재도입 조건은 ADR-004 § 3.
Git Hooks:      lefthook (pre-commit lint)
Commit:         cocogito (cog.toml)
Capture:        html2canvas (테라리움 → PNG)
Confetti:       canvas-confetti (기록 저장 후 연출)
Native:         Capacitor 8 (Android + iOS scaffold 완료, 2026-05-07 mobile #4 SPM 빌드)
                +@capacitor/filesystem (스크린샷 임시 저장)
                +@capacitor-community/admob (보상형 광고)
                +@capacitor/share, app, camera, haptics, keyboard, push, splash, statusbar
                iOS 잔여: Xcode UI 에서 App.entitlements / release.xcconfig link
                + Package.resolved 커밋 (macOS swift package resolve)
```

### Nuxt 모듈

```
@pinia/nuxt, @vueuse/nuxt, @nuxt/icon, @nuxt/image,
@nuxt/fonts, nuxt-gtag, @nuxtjs/color-mode, @nuxtjs/i18n
```

---

## 3. 디렉토리 구조

```
frontend/
├── app/
│   ├── app.vue                     # 루트 — NuxtLayout 형제로 Toast 마운트 (layout:false 페이지에서도 표시되도록, 2026-07-09)
│   ├── assets/css/
│   │   └── tailwind.css            # Tailwind v4 @theme (리소 20색 + 애니메이션)
│   ├── components/
│   │   ├── common/                 # Toast, Modal, Loading, CurrencyDisplay, ExchangeModal,
│   │   │                           #   RewardToast, Onboarding, AdSenseBanner, AttendanceWidget,
│   │   │                           #   CustomCategoryManager, ThemeGallery, TierModal, RarityBadge,
│   │   │                           #   OfflineBanner, AppUpdateGate
│   │   ├── icons/                  # CurrencyIcon, JamjarSvg, Jar1, PpJamjar (SVG 컴포넌트)
│   │   │   └── jar1/               #   Jar1.vue 가 쓰는 path 데이터 (jar1Paths.ts, feedSvg.ts)
│   │   ├── record/                 # CategoryGrid, RecordForm, RecordCard, PartnerSelect (joint record)
│   │   └── terrarium/              # TerrariumCanvas, TerrariumBottle, TerrariumSlot, ItemSelectDialog,
│   │                               #   WiltingOverlay
│   │                               #   PixiJS 파티클: RainParticles + SnowParticles + FireflyParticles + BubbleParticles
│   ├── composables/
│   │   ├── useAuth.ts              # JWT 메모리 캐시 (module-scoped) + 4분 preemptive refresh timer
│   │   ├── useAdMob.ts             # AdMob 보상형 광고 (Android native, 웹/iOS dev fallback)
│   │   ├── useAttendance.ts        # 출석 체크인 (7일 streak 보너스 5→20 이슬)
│   │   ├── useCustomCategory.ts    # 커스텀 카테고리 CRUD (사용자당 10개 한도)
│   │   ├── useEvolution.ts         # 5단계 진화 (POT/BOTTLE/PALUDARIUM/WORLD/CUSTOM, 레벨 1/5/10/20/30)
│   │   ├── useGtagEvents.ts        # GA4 이벤트 트래킹 (15개 이벤트 헬퍼)
│   │   ├── useNative.ts            # Capacitor 네이티브 브릿지 (share, shareFile, shareToInstagram, haptics, camera, push)
│   │   ├── useOpenApi.ts           # OpenAPI SDK 래퍼 + castData<T> 유틸리티
│   │   ├── usePayment.ts           # startPurchase() IAP — Play(Android) + App Store(iOS) 플랫폼 분기 + 백엔드 verify (2026-06-23 iOS 추가, 키 대기)
│   │   ├── useRecord.ts            # 기록 CRUD (OpenAPI SDK, PagedRecordResponse, partnerUserId 지원)
│   │   ├── useTimeAwareColorMode.ts # 06:00~18:00 light, 그 외 dark 자동 전환
│   │   ├── useToast.ts             # 토스트 알림 (SSR-safe, useState 기반)
│   │   ├── useWilting.ts           # 시들기 stage 0~3 → CSS filter + 메시지 매핑
│   │   ├── useThemeSelection.ts    # 프리미엄 테마 선택 + localStorage persist (entitlements.premiumThemes 게이트, SoT 레이어 검증)
│   │   ├── useDialogFocusTrap.ts   # bespoke 오버레이 focus trap + 배경 스크롤 잠금(useOverlayScrollLock 합성). 14 오버레이 일괄
│   │   └── useOverlayScrollLock.ts # 모달/시트 열림 시 배경 스크롤 잠금 (<html>.scroll-locked + 참조카운트). 실 스크롤러=main 이라 body 잠금은 무효
│   ├── error.vue                   # 전역 에러 페이지 (404 / 500-class 분기 + 재시도 버튼)
│   ├── layouts/
│   │   └── default.vue             # 헤더(WalletBar) + 하단 네비(5탭) + haptic (Toast는 app.vue 루트로 이동, 2026-07-09)
│   ├── lib/
│   │   └── auth-client.ts          # better-auth Vue 클라이언트 (createAuthClient)
│   ├── middleware/
│   │   ├── auth.ts                 # JWT 쿠키 라우트 가드 (protect-by-default, SSR+CSR)
│   │   └── admin.ts                # ADMIN 역할 체크 (useUserStore.role)
│   ├── pages/
│   │   ├── index.vue               # 홈 (테라리움 + 4종 파티클 cycle + 진화 모달 + AttendanceWidget + AdMob)
│   │   ├── auth/login.vue          # 로그인/가입 (layout: false)
│   │   ├── calendar/index.vue      # 캘린더 뷰
│   │   ├── record/index.vue        # 기록 입력/리스트 + 사진 첨부 + confetti + 친구 함께 기록(partner)
│   │   ├── terrarium/index.vue     # Jar 컨셉 테라리움 (5슬롯 + 하트 + 아이템 선택)
│   │   ├── terrarium/free.vue      # 자유배치 (entitlements.freePlacement 게이트 + 안내)
│   │   ├── shop/index.vue          # 아이템 상점 (Suspense + ClientOnly)
│   │   ├── profile/index.vue       # 프로필/통계/설정 + CustomCategoryManager
│   │   ├── friends/index.vue       # 친구 초대 코드 발급/입력 (햇살 +5)
│   │   ├── ranking/index.vue       # 월간 랭킹 (engagement / decoration)
│   │   ├── share/[code].vue        # 공유 수신 (SSR + OG 메타 + 초대 수락)
│   │   ├── upgrade/free-placement.vue # 자유배치 권리 결제 placeholder (Phase 4 IAP)
│   │   └── admin/                  # 어드민 (index, items, categories) — ssr:false
│   ├── plugins/
│   │   ├── openapi.ts              # @hey-api/client-fetch + 401 리프레시 인터셉터
│   │   └── capacitor.client.ts     # 네이티브 앱 라이프사이클 (딥링크, 푸시, 키보드)
│   ├── stores/
│   │   ├── user.ts                 # 프로필/레벨/재화 (OpenAPI SDK, castData<T>)
│   │   ├── items.ts                # 상점 아이템 카탈로그
│   │   └── terrarium.ts            # 테라리움 배치 상태
│   └── utils/
│       ├── format.ts               # dayjs 기반 날짜/숫자 포맷
│       ├── error.ts                # errMsg() 공유 에러 메시지 추출
│       ├── constants.ts            # 카테고리 맵, 희귀도, STORAGE_KEYS, DEFAULTS
│       ├── fetchGuard.ts           # TTL + in-flight dedup + 세대 펜스 (Pinia store 캐시. store setup 안에서 생성 필수 — 모듈 스코프면 SSR 교차사용자 누출)
│       └── withTimeout.ts          # Promise 하드 데드라인 + AbortController abort (better-fetch timeout 이 헤더까지만 커버하는 body-stall 대응)
├── tests/
│   ├── api-contract.test.ts        # SDK 타입 shape 검증 (17 tests)
│   ├── composables/*.test.ts       # composable contract 검증
│   ├── components/*.test.ts        # Modal / RewardToast / Loading a11y 등 (2026-05-18 Round 2 fix)
│   └── utils/*.test.ts             # format, constants 단위 테스트
├── e2e/                             # Playwright e2e smoke (M6, 2026-05-16~17)
│   └── *.spec.ts                   # login / record / share 3 smoke
├── scripts/
│   └── measure-bundle.mjs          # M11 번들 baseline 측정 (warn +10KB/+20%, fail +50KB/+50%)
├── playwright.config.ts            # Playwright 설정 (M6)
├── bundle-baseline.json            # 번들 baseline lock (~1.2MB / gzip 392KB / 55 chunks, ADR-005 i18n 재도입 후)
├── i18n/locales/                    # @nuxtjs/i18n ko.json + en.json (ADR-005 — i18n 유지 + 단계적 다국어, 2026-05-18 ADR-003 supersede)
├── server/
│   ├── api/auth/[...all].ts        # better-auth Nitro 핸들러
│   └── lib/auth.ts                 # better-auth 서버 (PostgreSQL, crash on missing env)
├── docs/
│   ├── figma-sync-progress.md      # Figma→Nuxt 포팅 진행 기록
│   └── mobile-status.md            # 모바일 래핑 계획
├── nuxt.config.ts
├── lefthook.yml
├── cog.toml
├── .oxlintrc.json
├── Dockerfile                      # Multi-stage (build + runtime)
└── .github/workflows/
    ├── ci.yml                      # lint → typecheck → test → build
    ├── codeql.yml                  # CodeQL 보안 스캔
    └── deploy-selfhosted.yml       # ubuntu 러너 빌드 → ghcr push → 맥 러너 pull + compose up
```

> **배포 모델 (2026-07-10 변경)**: 이미지는 GitHub-hosted ubuntu 러너에서 빌드해 ghcr 로 push 하고,
> 맥 self-hosted 러너는 그것을 pull 해서 컨테이너만 교체한다.
> 맥에서 빌드하지 않는 이유는 Docker VM 메모리 한도 안에서 Nitro 빌드가 커널 SIGKILL 을 받기 때문이고,
> 맥 호스트에서 빌드해 산출물만 넣지 않는 이유는 `.output/server/node_modules` 에 `@img/sharp-*`,
> `@esbuild/*`, oxc 바인딩 등 **플랫폼 종속 네이티브 패키지**가 포함되기 때문이다(빌드 OS = 배포 OS).

---

## 4. 도메인 모델

### 핵심 엔티티 (openapi-frontend/src/types.gen.ts 자동생성 기준)

> `app/types/` 디렉토리는 삭제됨. 모든 타입은 OpenAPI SDK에서 import.
> SDK 반환값은 hey-api union unwrap 이슈로 `castData<T>(data)` 유틸리티 사용.

> 낙서장 리팩토링(2026-07)으로 레벨/경험치(EXP)·진화(evolution)·구 2층 재화(basicCoin/카테고리토큰)는 **제거**되고
> 7화폐 정규화 substrate + 티어(화폐 잠금해제)로 대체됨. 아래는 현재(생성 SDK) 기준.

```typescript
// 사용자 (level/totalExp/basicCoin 제거)
UserMeResponse { userId, email, nickname, role, currency: CurrencyResponse, ownedItems: string[] }

// 카테고리 (산책, 독서, 러닝, 낙서 + 커스텀)
Category { id, name, iconUrl, color, tokenName, baseCoinReward, baseTokenReward, dailyLimit }

// 기록 (dailyType: PHOTO/DIARY/FOCUS/DISTANCE — 일상 하위타입별 토큰 라우팅 + 일일한도 SoT)
// 주의: categoryId/categoryName 은 라우팅용으로 dailyType→고정 카테고리 강제매핑됨(예: DIARY→"독서") — 화면 표시는
// dailyType 이 있으면 그걸 우선하고(recordDisplayLabel/Icon, utils/constants.ts) categoryName 은 폴백으로만 사용 (2026-07-09)
RecordResponse { id, categoryId, categoryName, categoryEmoji?, dailyType?, memo?, duration?, photoUrl?, recordedDate, createdAt }
RewardInfo { basicCoins, categoryTokens }   // EXP 없음

// 재화 (정규화 balances[])
CurrencyResponse { balances: CurrencyBalance[] }
CurrencyBalance { code, amount }            // code ∈ COIN/RUBY/SPARKLE/DEW/SUN/BOLT/WIND

// 아이템
Item { id, name, categoryId?, priceType, priceAmount, rarity, assetUrl, width, height }
UserItem { id, itemId, quantity, acquiredAt, item: Item }

// 테라리움 (진화 → 티어: 화폐로 슬롯 잠금해제)
TerrariumResponse { terrariumId, background, placedItems, maxSlots, tier }
// 티어: GLASS_JAR/LARGE_JAR/GRAND_TANK/HOUSE_TANK (GET /terrarium/tiers, POST /terrarium/tier)

// 습관 (7일 cycle → SPARKLE)
HabitTrackerResponse { id, title, currentStreakDays, cycleLengthDays, completedCycles, status, lastCheckedDate?, friendLinked? }
```

### 재화 구조 (7화폐 정규화)

```
COIN 코인 — 범용 구매/기본 행동 보상    RUBY 루비 — 유료 소비성(IAP)    SPARKLE 반짝이 — 습관 7일 완주 / 정령 육성
DEW 이슬(산책) · SUN 햇살(독서) · BOLT 번개(러닝) · WIND 바람(낙서) — 활동별 토큰
교환: directed exchange (GET /currencies, POST /exchange) — 비율/수수료/일일캡은 백엔드 exchange_rates SoT (어드민 조정)
```

### 희귀도

```
COMMON — 일반 (기본 코인 구매)
RARE   — 레어 (카테고리 토큰 또는 높은 코인)
EPIC   — 에픽 (특별 조건 또는 이벤트)
```

---

## 5. API 엔드포인트 (Backend 연동)

> **Source of truth**: `openapi/spec/openapi.yaml` (TerraWorld-IT/openapi). 본 표는 요약본으로 spec과 어긋날 수 있다 — 신규/변경 시 `openapi-frontend/src/sdk.gen.ts` 와 `openapi-backend/src/main/kotlin/io/terraworld/api/api/*.kt` 가 SoT.

### 인증 (better-auth → Nuxt Nitro 서버)
```
/api/auth/*              # better-auth 핸들러 (Nitro에서 처리)
```

### Business API (Spring Boot, /api/v1 prefix)

```
GET    /health

GET    /users/me
PUT    /users/me                       # 프로필 수정

GET    /categories                     # 시스템 4종 + 본인 커스텀
POST   /categories                     # 커스텀 카테고리 생성 (10개 한도)
DELETE /categories/{categoryId}        # 본인 커스텀만 soft-delete

GET    /records                        # year/month 필터 + Paged
POST   /records                        # 생성 + partnerUserId(joint record) 지원
DELETE /records/{recordId}             # soft delete
GET    /records/statistics

POST   /exchange/special-to-basic      # 햇살↔이슬 1:2
POST   /exchange/tokens                # 카테고리 토큰↔토큰

GET    /items
GET    /items/{itemId}
POST   /purchases                      # 아이템 구매

GET    /terrarium                      # evolutionStage + unlockedStages 포함
PUT    /terrarium/placements           # 5슬롯 배치 갱신
POST   /terrarium/heart                # +0.1 이슬
POST   /terrarium/upgrade              # 진화 단계 전환 (Phase 3)

GET    /levels
GET    /notes/{date}, PUT, DELETE      # 캘린더 메모

POST   /invites                        # 8자 코드 + 7일 만료
POST   /invites/{code}/accept          # 양쪽 햇살 +5

POST   /rewards/ad                     # 광고 보상 (일일 5회)
GET    /rewards/attendance             # 출석 현황 (Phase 3)
POST   /rewards/attendance             # 출석 체크인 (7일 streak +20)

GET    /rankings/monthly               # engagement / decoration

POST   /uploads/photo                  # multipart, magic byte 검증
```

---

## 6. 페이지 라우팅

| 경로 | 파일 | 설명 | 인증 |
|------|------|------|------|
| `/` | `pages/index.vue` | 홈 (테라리움 미리보기 + 오늘 기록) | 선택 |
| `/auth/login` | `pages/auth/login.vue` | 로그인/가입 (layout: false) | 불필요 |
| `/calendar` | `pages/calendar/index.vue` | 캘린더 뷰 | 필수 |
| `/record` | `pages/record/index.vue` | 기록 입력/리스트 | 필수 |
| `/terrarium` | `pages/terrarium/index.vue` | 테라리움 꾸미기/감상 | 필수 |
| `/shop` | `pages/shop/index.vue` | 아이템 상점 (Suspense + ClientOnly) | 선택 |
| `/profile` | `pages/profile/index.vue` | 프로필/통계/설정 (친구·랭킹 진입) | 필수 |
| `/share/:code` | `pages/share/[code].vue` | 공유 수신 (SSR + OG + 초대 수락) | 불필요 |
| `/friends` | `pages/friends/index.vue` | 친구 초대 코드 발급/입력 (햇살 +5) | 필수 |
| `/ranking` | `pages/ranking/index.vue` | 월간 랭킹 (engagement / decoration) | 필수 |
| `/terrarium/free` | `pages/terrarium/free.vue` | 자유배치 PoC (DnD, PointerEvent) | 필수 |
| `/admin` | `pages/admin/index.vue` | 어드민 대시보드 | 필수 (ADMIN) |
| `/admin/items` | `pages/admin/items.vue` | 아이템 관리 | 필수 (ADMIN) |
| `/admin/categories` | `pages/admin/categories.vue` | 카테고리 보상 관리 | 필수 (ADMIN) |

> `/admin/exchange` 와 `/admin/levels` 는 존재하지 않는다. 레벨 체계는 2026-07 개편에서 제거됐고,
> 교환 비율은 백엔드 `exchange_rates` 가 SoT 다. `/terrarium/free` 도 `routeRules` 로 `/` 에 redirect 된다.

---

## 7. 디자인 컨셉 — Jar (확정)

> Figma0409 참조 디자인 기준으로 **jar** 컨셉 확정. 나머지 7개 컨셉(postcard, shelf, window, garden, storybook, windowsill, bubble)은 삭제됨.
> `useLayoutVariant.ts` + `LayoutSelector.vue` 삭제 완료.

### 컨셉 목록

| # | ID | 이름 | 메타포 | 참고 |
|---|-----|------|--------|------|
| 0 | `jar` | Jar View | 유리병 속 세상 | 나의 작은 테라리움 |
| 1 | `postcard` | Postcard | 오늘의 엽서 | colormytree |
| 2 | `shelf` | Cozy Shelf | 나무 선반/책장 | — |
| 3 | `window` | Window | 창가의 아침 | Chill Pulse |
| 4 | `garden` | Garden Map | 나의 정원 지도 | — |
| 5 | `storybook` | Storybook | 동화책 챕터 | 나의 작은 테라리움 |
| 6 | `windowsill` | Windowsill | 창틀 위 화분 | Terrarium Garden Idle |
| 7 | `bubble` | Bubble Pop | 둥글둥글 방울 | — |

### 사용법

```vue
<template>
  <div>
    <CommonLayoutSelector />
    <div v-if="is('jar')">...</div>
    <div v-if="is('postcard')">...</div>
    <!-- ... 8개 모두 -->
  </div>
</template>

<script setup>
const { is } = useLayoutVariant()
</script>
```

- `useLayoutVariant()`: 전역 상태, localStorage 저장
- 한 페이지에서 컨셉 변경 → 모든 페이지 동일 컨셉 적용
- 디자이너가 방향 확정 후, 선택되지 않은 컨셉은 제거 예정

---

## 8. 리소페인트 디자인 시스템

### 컬러 팔레트 (tailwind.css @theme)

| 이름 | 값 | 용도 |
|------|-----|------|
| `riso-cream` | #FFF8EB | 배경 기본 |
| `riso-dark` | #2D2D2D | 텍스트 기본 |
| `riso-sage` | #7B9E6B | 프라이머리 (산책, 성공) |
| `riso-pink` | #E8A0BF | 액센트 (공유, 강조) |
| `riso-walnut` | #8B6F4E | 나무/선반/따뜻한 요소 |
| `riso-navy` | #2D3A6E | 셀렉터 활성, 진한 텍스트 |
| `riso-poppy` | #E07A5F | 위험/강조/세일 |
| `riso-butter` | #F4E4BA | 골드/코인/따뜻한 배경 |
| `riso-terracotta` | #C67B5C | 화분/따뜻한 액센트 |
| `riso-sky` | #A8D8EA | 하늘/창문/상쾌한 요소 |
| `riso-peach` | #FFD4B2 | 아침/따뜻한 그라데이션 |
| `riso-lavender` | #C3AED6 | 저녁/차분한 톤 |
| `riso-green` | #00A95C | 산책 카테고리 |
| `riso-blue` | #0078BF | 독서 카테고리 |
| `riso-red` | #E3505F | 러닝 카테고리 |
| `riso-orange` | #FF6C2F | 낙서 카테고리 |

### 유틸리티 클래스

```css
riso-grain        /* 전역 SVG 노이즈 오버레이 (opacity 0.03) */
riso-dots         /* 리소 하프톤 도트 패턴 */
riso-shadow       /* 3px 4px 오프셋 그림자 */
riso-shadow-sm    /* 2px 2px 오프셋 그림자 */
riso-shadow-press /* 1px 1px (눌린 상태) */
scrollbar-hide    /* 스크롤바 숨기기 */
```

### 애니메이션

```css
animate-sway     /* 식물 흔들림 (3s ease-in-out) */
animate-float    /* 위아래 부유 (4s ease-in-out) */
animate-drift    /* 구름 이동 (20s linear) */
```

---

## 9. 스탬프 연출 (PixiJS)

아이템 배치 시 스탬프 찍기 효과:

```
1. 인벤토리에서 아이템 선택 → 고스트 이미지 따라다님
2. 캔버스 탭 → "꾹" 찍히는 애니메이션
3. 미세 랜덤: rotation ±10°, scale 0.95~1.05
4. multiply 블렌딩으로 겹침 시 리소 효과
5. 최근 찍은 것이 위 레이어 (z_index 자동 증가)
```

PixiJS v8 선택 이유:
- WebGL/Canvas 자동 선택 (저사양 대응)
- Sprite `MULTIPLY` 블렌딩 네이티브 지원
- 터치 이벤트 내장
- ~150KB gzipped

---

## 10. 인증 (better-auth + RS256 JWKS)

### 아키텍처

```
Browser
  ↓ authClient.signIn.email() / signUp.email()
Nitro: /api/auth/*                    ← better-auth 핸들러
  ├ auth.user, auth.session, auth.account INSERT
  ├ databaseHooks.user.create.after → Spring /api/v1/internal/users/bootstrap
  │                                       (X-Internal-Token 검증, JIT profile)
  └ tw.session_token 쿠키 설정 (HttpOnly, SameSite=Strict, 7일)
  ↓
useAuth().loadJwt() → GET /api/auth/token
  ↓ better-auth jwt 플러그인이 RS256 JWT 발급 (5분 TTL)
  ↓ 서명 키는 auth.jwks 테이블 (BETTER_AUTH_SECRET으로 암호화)
module-scoped clientJwt 변수 캐시 (절대 useState/cookie에 넣지 않음 — SSR 누출 방지)
  ↓
plugins/openapi.ts 요청 인터셉터가 Authorization: Bearer 헤더 부착
  ↓
Spring Boot /api/v1/*
  ├ JwtAuthenticationFilter가 JwtTokenProvider로 검증
  │   (iss=terraworld, aud=terraworld-api, exp 필수, 30s clock skew)
  ├ JWKS는 GET http://frontend/api/auth/jwks에서 캐시
  │   (kid rate-limit 30s, negative cache 60s, 단일 in-flight)
  └ SecurityContext에 AuthenticatedUser(id, email) 설정
```

### 파일

| 파일 | 역할 |
|------|------|
| `server/lib/auth.ts` | better-auth 설정 + jwt(RS256)+bearer 플러그인 + databaseHooks → Spring bootstrap |
| `server/api/auth/[...all].ts` | Nitro 핸들러 (사인인/사인업/토큰/JWKS/세션) |
| `server/db/migrations/001_better_auth_init.sql` | auth 스키마 DDL (수동 1회 적용) |
| `app/lib/auth-client.ts` | better-auth Vue 클라이언트 + jwtClient 플러그인 |
| `app/composables/useAuth.ts` | JWT 메모리 캐시 (module-scoped) + loadJwt/getJwt/clearJwt/signOutAndClear |
| `app/plugins/openapi.ts` | 요청 Bearer 부착 + 401 단일 재시도 (loop 방지) |
| `app/middleware/auth.ts` | tw.session_token 쿠키 presence 체크 (경로 가드) |
| `app/middleware/admin.ts` | CSR 전용 role 체크 (admin 페이지는 `ssr: false`) |

### 주요 원칙

- **Admin 페이지는 CSR 전용**: `nuxt.config.ts`의 `routeRules['/admin/**'].ssr = false`. SSR payload에 role-gated 데이터가 절대 들어가지 않게 하기 위함 (SEC-017 mitigation). 트레이드오프 — 차가운 로드 시 ~100ms 동안 빈 셸이 보인 뒤 `admin` middleware가 redirect. 이걸 "고치기" 위해 SSR로 되돌리지 말 것 — 보안 결정이지 성능 최적화의 빈틈이 아님.
- **대칭 시크릿 없음**: Spring과 프론트 사이에 HS256 공유 시크릿이 없음. 프론트가 RS256 키페어를 `auth.jwks`에 저장하고 `/api/auth/jwks`로 public key만 노출 → Spring이 fetch해서 캐시
- **JWT TTL 5분**: ADMIN → USER 강등이 최대 5분 뒤에 반영됨. 프론트는 필요 시 자주 refresh
- **JWT 저장소 원칙**: `useState`/쿠키에 저장 금지 (SSR payload 누출). module-scoped 변수만 사용
- **JIT bootstrap은 fallback**: primary는 signup 시점의 `databaseHooks.user.create.after`가 Spring 내부 엔드포인트 호출. filter JIT은 hook 실패 시의 안전망
- **role 강제**: bootstrap 시 role은 무조건 USER. JWT claim의 role은 bootstrap에서 무시됨
- **email 필수**: blank email claim이 있는 JWT는 필터에서 거부
- **세션 쿠키**: `tw.session_token` (HttpOnly, Strict, 7일). 세션 재검증은 better-auth가 5분 쿠키 캐시로 처리

### 인증 플로우

1. **가입**: `authClient.signUp.email({ email, password, name })`
   - Nitro: auth.user + auth.account 생성 + tw.session_token 쿠키 설정
   - databaseHooks.user.create.after → Spring `/api/v1/internal/users/bootstrap` → public.users + 4 UserTokens + Terrarium 생성
   - 클라이언트: `loadJwt()` → 첫 JWT 메모리 캐시
2. **로그인**: `authClient.signIn.email()` → 동일 흐름 (bootstrap은 skip, 이미 존재)
3. **API 호출**: `sdk.getMe({ client })` → 요청 인터셉터가 module-scoped JWT 부착
4. **401 수신**: 인터셉터가 `loadJwt()` 호출 → JWT 재발급 → 원본 요청을 `x-tw-retried: 1` 헤더와 함께 한 번 재시도 → 재시도 실패 시 `/auth/login`으로 redirect
5. **로그아웃**: `useAuth().signOutAndClear()` → better-auth signOut + memory JWT 삭제

### 환경변수

| 이름 | 소유자 | 용도 |
|------|--------|------|
| `DATABASE_URL` | FE | 공유 PG (search_path=auth,public) |
| `BETTER_AUTH_SECRET` | FE | 쿠키 서명 + auth.jwks 개인키 wrap (Spring과 공유 아님) |
| `INTERNAL_API_TOKEN` | FE+BE | 동일값. databaseHooks → Spring internal endpoint 호출 시 X-Internal-Token 헤더 |
| `INTERNAL_API_BASE_URL` | FE | Spring internal endpoint base (기본 `http://localhost:8080`) |
| `AUTH_JWKS_URL` | BE | Spring이 JWKS를 가져올 URL (기본 `http://localhost:3000/api/auth/jwks`) |
| `AUTH_JWT_ISSUER` / `AUTH_JWT_AUDIENCE` | BE | Spring이 강제할 claim 값 (`terraworld` / `terraworld-api`) |
| `CORS_ALLOWED_ORIGINS` | BE | 콤마 분리. prod 프로파일에서 localhost 포함 시 부팅 실패 |

### 지원 인증 방식

- ✅ 이메일/비밀번호 (활성)
- ⏸️ Google OAuth (추후 — server/lib/auth.ts의 socialProviders 블록 활성화)
- ⏸️ Kakao OAuth (추후)

### 만 14세 차단 3중 방어 (LEGAL-001, 2026-05-18)

개인정보보호법(만 14세 미만 아동의 개인정보 보호) 준수. signup form 에서 birthDate (ISO YYYY-MM-DD) 추가 필드를 수집해 3 layer 로 검증:

1. **Frontend UI 게이트** — `pages/auth/login.vue:43-52` `<input type="date" :max="maxBirthDate">` + computed `maxBirthDate` (오늘 - 14년) + `isAtLeast14()` 함수 (`:127-134`)
2. **Backend before hook** — `server/lib/auth.ts:156` `databaseHooks.user.create.before(user, context)` 에서 birthDate 재검증 + `throw new Error('만 14세 미만은 가입할 수 없습니다 …')` 시 transaction rollback
3. **정책 정합** — privacy.md §8 의 만 14세 차단 선언

**주의 — before hook return type**: better-auth 시그니처는 `(user, context) => Promise<boolean | void | { data: Optional<User> & Record<string, any> }>`. `return user` 직접 반환 시 type error → `return { data: user }` 또는 `return true` (passthrough) 또는 throw (rollback) 중 하나로 작성.

---

## 11. 코드 컨벤션

### 파일 네이밍

```
pages/          → kebab-case (index.vue, login.vue)
components/     → PascalCase (Toast.vue, WalletBar.vue)
composables/    → camelCase with use prefix (useApi.ts, useRecord.ts)
stores/         → camelCase (auth.ts, wallet.ts)
types/          → camelCase (index.ts, api.ts)
utils/          → camelCase (format.ts, constants.ts)
```

### Vue 컴포넌트 구조

```vue
<template>...</template>
<script setup lang="ts">
// 1. imports (auto-import 우선)
// 2. props & emits
// 3. composables
// 4. reactive state
// 5. computed
// 6. methods
// 7. lifecycle
</script>
<style scoped>...</style>
```

### API 호출 패턴 (주력: OpenAPI SDK)

```typescript
// 인증 — better-auth 클라이언트 (OpenAPI SDK가 아님)
import { authClient } from '~/lib/auth-client'
const { error } = await authClient.signIn.email({ email, password })
if (error) throw new Error(error.message ?? '로그인 실패')
await useAuth().loadJwt()  // 메모리 JWT 캐시 워밍

// 비즈니스 API — OpenAPI SDK
const { sdk, client } = useOpenApi()
const { data, error } = await sdk.getMe({ client })
if (error) throw error
me.value = castData<UserMeResponse>(data)
```

### 레거시: useApi() (비권장)

```typescript
// useApi() — 제네릭 래퍼 (신규 코드에서 사용 금지)
const { get, post } = useApi()
const records = await get<ActivityRecord[]>('/records', { from, to })
```

### 멱등성 (구매/교환)

```typescript
await sdk.purchaseItem({ client, body: { itemId, idempotencyKey: crypto.randomUUID() } })
```

---

## 12. 주의사항

### 프로덕션 빌드

- `console.log`, `debugger` → vite esbuild drop 설정으로 자동 제거
- 환경변수: `.env.example` 참고, `.env` 파일은 gitignore

### 함정 (2026-05-18 analyze 발견)

- **WalletBar.vue progressPercent (RESOLVED 2026-06-15)** — 과거 선형 hardcoded 계산이 음수/100%+ 출력 가능했던 함정. 현재 `WalletBar.vue:69-77` 는 선형 컨벤션((N-1)×100) + `Math.min(100, Math.max(0, …))` clamp + MAX_LEVEL 가드 적용으로 **해결됨**. (backend EXP 곡선이 2차면 표시 의미만 달라질 뿐 음수/초과는 clamp 로 차단.)
- **`useUserStore` 자동 import 미작동** — Pinia `defineStore('user', …)` 의 export 이름 또는 `stores/` 디렉토리 자동 등록 timing 에 따라 컴파일 타임 `Cannot find name 'useUserStore'` 가능. `import { useUserStore } from '~/stores/user'` 명시 import 로 회피.
- **better-auth hook `return user` 직접 반환 금지** — § 10 만 14세 차단 3중 방어 참조. `return { data: user }` / `return true` / throw 중 하나로 작성.

### 함정 (2026-07-10 발견 — 셋 다 빌드·타입체크·테스트 통과 후에만 드러남)

- **Tailwind v4 의 `-translate-x-1/2` 는 `transform` 이 아니라 개별 `translate` 속성** — CSS 는 개별 translate 를 먼저 적용하고 transform 을 합성하므로, 트랜지션 CSS 에 `transform: translate(-50%, 100%)` 를 쓰면 X 가 두 번 걸려 패널이 자기 폭만큼 왼쪽에서 대각선으로 날아든다. `transform: translateY(100%)` 로 쓰고 X 중앙정렬은 `translate` 에 맡긴다. 이 레포에서 5곳 동시 발생(바텀시트 8 + RewardToast). 탐지: `grep -rn "translate(-50%" app/` 후 해당 요소의 `-translate-x-1/2` 여부 확인. 부수: Vue `<Transition>` 은 **루트** 엘리먼트의 computed transition 으로 종료를 판정하므로 자식 duration 이 더 길면 잘린다.
- **`@nuxt/icon` 은 `/api/_nuxt_icon` 으로 런타임 fetch** — 프로덕션 nginx 가 `/api/` 를 Spring 으로 프록시하므로 401 을 받아 **클라이언트에서 처음 마운트되는 아이콘만** 빈다("일부만 안 보임"이 신호). 로컬 dev 는 nginx 가 없어 재현 안 됨. `nuxt.config.ts` 의 `icon.clientBundle` 로 굽고 `localApiEndpoint` 를 `/api/` 밖으로 옮겨 해결. **동적 `:name` 바인딩은 `scan` 이 못 잡으므로 `icons` 배열에 명시 나열**해야 한다 — 하나라도 빠지면 그 아이콘만 조용히 빈다.
- **모달 바텀시트는 하단 nav 를 덮어야 한다** — `role="dialog" aria-modal` + 백드롭 `inset-0` 을 선언해 놓고 패널만 nav 위에 띄우면, nav 가 "보이지만 탭이 백드롭에 먹혀 동작하지 않는" 미끼가 된다. Material 3·Apple HIG 모두 모달 시트가 하단 내비를 덮도록 규정한다. `index.vue` 의 시트 3종은 전부 `bottom-0`.

### 함정 (2026-07-13 발견 — 배경 스크롤 잠금 + 콜드 스타트 로그인)

- **이 앱의 실제 스크롤러는 `body` 가 아니라 `layouts/default.vue` 의 `<main overflow-y-auto>`** — 모달/시트 배경 스크롤을 `document.body.style.overflow='hidden'` 으로 잠그면 무효다(과거 `Modal.vue` 방식). 새 오버레이는 자체 잠금을 만들지 말고 `useDialogFocusTrap(root, isOpen)`(focus trap + 스크롤 잠금 동시) 또는 `useOverlayScrollLock(isOpen)` 을 쓴다. `aria-modal` 을 선언한 모든 오버레이가 잠금 대상인지 union diff 로 확인할 것.
- **스크롤 잠금 CSS 는 `@layer` 밖 + `!important` 여야 한다** — `main` 의 `.overflow-y-auto` 유틸은 Tailwind `utilities` 레이어에서 나오고, CSS 레이어는 선언 순서상 utilities 가 base 보다 나중이라 특이성과 무관하게 이긴다. `@layer base` 안에 잠금 규칙을 두면 무력화된다(빌드된 entry.css 의 byte offset 으로 실측: 잠금@31274 < 유틸@43625). unlayered `!important` 로만 이긴다. 회귀 테스트는 런타임(happy-dom 은 layer cascade 미계산)이 아니라 소스 CSS 의 layer 위치·`!important` 를 검사. 상세: solutions/tailwind-v4-custom-css-in-layer-loses-to-utilities.
- **`better-auth`/`better-fetch` 의 `fetchOptions.timeout` 은 응답 헤더까지만 잰다** — 서버가 헤더만 주고 body 를 안 흘리는 half-open 연결에서 `getSession()` 이 안 끝나 미들웨어 hang / 로딩 베일 고착. 해결: 외부 `AbortController` 를 `fetchOptions.signal` 로 넘기고(그러면 better-fetch 가 자기 타이머 대신 그 signal 로 전 구간 통제) `withTimeout(getSession, ms, ac)` 로 감싼다. `app/utils/withTimeout.ts`. 상세: solutions/better-fetch-timeout-covers-headers-not-body-stall.
- **콜드 스타트 로그인 깜빡임 + 세션 확인 베일** — 네이티브 셸 첫 top-level 네비게이션에 세션 쿠키가 안 실려 SSR 이 `/auth/login` 으로 302 → 폼이 떴다가 클라 `getSession`(same-origin XHR, 쿠키 실림)이 홈으로 되돌림. `login.vue` 의 클라이언트 전용 베일(`checkingSession`, false 로 시작해 SSR 미노출→하이드레이션 안전)이 가린다. "떠났는지" 판정은 `navigateTo` 반환값·페이지 주입 `useRoute` 가 아니라 **전역 `useRouter().currentRoute.value.path`(trailing slash 정규화)** 로 한다. 남는 한계: SSR 이 폼을 그리는 한 하이드레이션 직후 최대 1프레임 플래시는 못 없앤다(웹 직접 방문 한정).

### 성능

- PixiJS 캔버스: 스탬프 수 상한 (LevelConfig.maxItems, 초기 20~40개)
- 이미지 에셋: `@nuxt/image`로 최적화, WebP/AVIF
- 폰트: `@nuxt/fonts`로 빌드 시 번들링
- Tailwind v4: Oxide 엔진 (v3 대비 5x 빠른 빌드)

### 보안

- better-auth 세션 기반 (httpOnly cookie)
- CORS: `nuxt.config.ts`에서 관리 (Spring Boot 별도 설정)
- 어드민: role 기반 접근 제어

### 디자인 에셋

```
스탬프: PNG, 투명배경, 512x512px (2x retina)
컬러: 리소 잉크 팔레트 (최대 3~4색/스탬프)
배경: 1080x1080 (1:1) / 1080x1920 (9:16 공유)
아이콘: SVG (UI) + PNG (대체)
네이밍: stamp_{category}_{name}_{rarity}.png
```

### Git

```bash
bun run lint        # oxlint 린트
bun run dev         # 개발 서버
bun run build       # 프로덕션 빌드
bun run typecheck   # TypeScript 체크
```

- lefthook: `git commit` 시 자동 lint
- cocogito: `cog commit feat "기능 설명"` 권장
- push: RoastFried-RF 토큰 필요 (remote URL에는 포함하지 않음)

---

## 13. TODO (구현 예정)

### Phase 1 (W2~W4, ~5/15)

- [x] better-auth 로그인/가입 폼 연동 (JWT 기반, OpenAPI SDK)
- [x] 기록 입력 폼 → API 연동 (record/index.vue)
- [x] 기록 캘린더/리스트 → API 연동 (calendar/index.vue)
- [ ] 보상 획득 애니메이션 (코인 +N, EXP 바 증가)
- [x] 상점 구매 플로우 → API 연동 (ShopContent + Suspense)
- [x] 디자인 컨셉 1개 확정 → jar 확정, 7개 삭제 (-809줄)
- [~] i18n 번역 ko/en — **2026-05-18 재도입 (ADR-005, ADR-003 supersede)**: 사용자 결정 #3 (i18n 유지 + 단계적 다국어). I-T-MIGRATE-001 (한글 하드코딩 → t() 일괄 치환) **미착수** — `useI18n()` / `$t(` runtime call 0건 (2026-05-18 analyze 검증). en/ja 본문은 Phase 5+
- [x] 6개 핵심 페이지 Figma→Nuxt 포팅 완료
- [x] Vitest 테스트 32개 (utils + composable + API contract)
- [x] 코드 리뷰 72건 전부 수정 (4차 리뷰 clean)

### Phase 2 (W5~W12, ~7월)

- [x] TerrariumCanvas (HTML/CSS jar + 5슬롯 + 하트 클릭 + 아이템 선택)
- [x] 공유 화면 /share/:code (SSR + OG 메타 + 초대 수락)
- [x] 토큰 교환 모달 (ExchangeModal: 스페셜→기본 + 토큰↔토큰)
- [x] 어드민 페이지 5개 (대시보드, 아이템, 카테고리, 교환, 레벨)
- [x] 온보딩 튜토리얼 5단계 (기록→보상→구매→꾸미기→공유)
- [x] GA4 이벤트 트래킹 (useGtagEvents, 15개 헬퍼 / 9곳 연결)
- [x] Record 컴포넌트 추출 (CategoryGrid, RecordForm, RecordCard)
- [x] composable SDK 전환 (useRecord → OpenAPI SDK)
- [x] 보상 애니메이션 (RewardToast)
- [x] 기록 저장 confetti (canvas-confetti)
- [x] 시들기 CTA (WiltingOverlay stage ≥ 2 시 "지금 기록하러 가기")
- [x] JWT 4분 preemptive refresh (useAuth)
- [x] 스크린샷 캡처 + 시스템 공유 (html2canvas + Capacitor filesystem)
- [x] AdMob 보상형 광고 wiring (useAdMob)
- [x] AdSense PC 웹 배너 (AdSenseBanner)
- [ ] PixiJS 전환 (현재 HTML/CSS → PNG 에셋 준비 시 PixiJS v8 교체)
- [x] PixiJS 4종 파티클 (Rain / Snow / Firefly / Bubble — 홈 effect cycle 버튼)

### Phase 3~4 (W13~W30, ~11월)

- [x] 친구 초대 UI (`/friends`, 초대 코드 발급/입력, 햇살 +5)
- [x] 친구와 함께 기록 (RecordForm partner select, 양측 보상 가산, 수락된 invite 관계 검증)
- [x] 월간 랭킹 페이지 (`/ranking`, engagement / decoration, myRank)
- [x] 자유배치 PoC (`/terrarium/free`, DnD PointerEvent)
- [x] 자유배치 entitlement 게이트 + 안내 페이지 (`/upgrade/free-placement`)
- [x] 5단계 진화 모달 (Modal G — POT/BOTTLE/PALUDARIUM/WORLD/CUSTOM)
- [x] 커스텀 카테고리 UI (`/profile` 임베드, CRUD, 사용자당 10개 한도)
- [x] 일일 출석 위젯 + 7일 streak 보너스 (`/rewards/attendance`)
- [x] 사진 첨부 (record/index.vue + multipart 업로드, magic byte 검증)
- [x] 다크모드 시간 연동 (useTimeAwareColorMode, 06:00~18:00)
- [△] 소셜 로그인 (Google, Kakao) — better-auth `socialProviders` env-gated 활성 (AUTH_GOOGLE_*, AUTH_KAKAO_*); OAuth 콘솔 등록 + 환경변수 설정 필요
- [△] 결제 연동 (IAP — Play Billing + Apple App Store) — `usePayment.startPurchase` 플랫폼 분기(Android→Play purchaseToken / iOS→StoreKit transactionId+receipt) → 백엔드 `/billing/iap/verify`(platform 라우팅: PlayPurchaseVerifier / AppStorePurchaseVerifier verifyReceipt) → entitlement (2026-06-23 iOS 추가); Play Console + App Store Connect 상품 등록 + 키 주입 시 실작동
- [x] Capacitor 모바일 래핑 (Android 빌드 완료, AdMob + Filesystem plugin)
- [x] 네이티브 브릿지 (useNative: share, shareFile, haptics, camera, push)
- [x] 딥 링크 (AASA + assetlinks + App Links)
- [△] 인스타 공유 — `useNative.shareToInstagram` 시스템 공유 시트 위임(공유 시트에 Instagram 노출). 네이티브 Stories 딥링크(이미지 주입)는 표준 Capacitor 로 불가 → 별도 pasteboard 플러그인 필요 (후속)
- [ ] 시즌/이벤트 스탬프
- [△] 메모지/테마 해금 UI — `ThemeGallery.vue` + `useThemeSelection` 기본형 구현 (카탈로그/미리보기/적용/localStorage persist, `entitlements.premiumThemes` 게이트). 실제 테마 색/레이아웃은 디자이너 검토 대기
