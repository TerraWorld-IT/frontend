# TerraWorld Frontend — 프로젝트 지침

> 일상 행동을 기록하면 리소페인트 스타일의 아이템을 모아 나만의 테라리움을 꾸미는 기록형 힐링 서비스
> **제4회 2026 IT 프로젝트 공모전** 출전작 (숭실대 디지털미디어학과)

---

## 1. 서비스 개요

### 핵심 경험 루프

```
기록(행동 입력) → 보상(코인/토큰/EXP) → 수집(아이템 구매) → 꾸미기(스탬프 연출 배치) → 공유 → 재방문
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
2D Rendering:   PixiJS v8 (multiply blending, stamp animation)
Auth:           better-auth (Nitro 서버, PostgreSQL 공유 DB)
Validation:     valibot
Date:           dayjs
Lint:           oxlint
Git Hooks:      lefthook (pre-commit lint)
Commit:         cocogito (cog.toml)
```

### Nuxt 모듈

```
@pinia/nuxt, @vueuse/nuxt, @nuxt/icon, @nuxt/image,
@nuxt/fonts, nuxt-gtag, @nuxtjs/color-mode
```

---

## 3. 디렉토리 구조

```
frontend/
├── app/
│   ├── assets/css/
│   │   └── tailwind.css            # Tailwind v4 @theme (리소 20색 + 애니메이션)
│   ├── components/
│   │   ├── common/                 # Toast, Modal, Loading, WalletBar, CurrencyDisplay,
│   │   │                           #   ExchangeModal, RewardToast, Onboarding
│   │   ├── icons/                  # JamjarSvg, PpJamjar (SVG 컴포넌트)
│   │   ├── record/                 # CategoryGrid, RecordForm, RecordCard
│   │   ├── terrarium/              # TerrariumCanvas, TerrariumSlot, ItemSelectDialog
│   │   └── shop/                   # ShopContent, ShopSkeleton
│   ├── composables/
│   │   ├── useAuth.ts              # JWT 메모리 캐시 (module-scoped), loadJwt/getJwt/clearJwt
│   │   ├── useGtagEvents.ts        # GA4 이벤트 트래킹 (8개 이벤트 헬퍼)
│   │   ├── useNative.ts            # Capacitor 네이티브 브릿지 (share, haptics, camera, push)
│   │   ├── useOpenApi.ts           # OpenAPI SDK 래퍼 + castData<T> 유틸리티
│   │   ├── usePayment.ts           # 구매/교환 트랜잭션 플로우
│   │   ├── useRecord.ts            # 기록 CRUD (OpenAPI SDK, PagedRecordResponse)
│   │   └── useToast.ts             # 토스트 알림 (SSR-safe, useState 기반)
│   ├── error.vue                   # 전역 에러 페이지 (404 등)
│   ├── layouts/
│   │   └── default.vue             # 헤더(WalletBar) + 하단 네비(5탭) + Toast + haptic
│   ├── lib/
│   │   └── auth-client.ts          # better-auth Vue 클라이언트 (createAuthClient)
│   ├── middleware/
│   │   ├── auth.ts                 # JWT 쿠키 라우트 가드 (protect-by-default, SSR+CSR)
│   │   └── admin.ts                # ADMIN 역할 체크 (useUserStore.role)
│   ├── pages/
│   │   ├── index.vue               # 홈 (테라리움 미리보기 + 오늘 기록 + 온보딩)
│   │   ├── auth/login.vue          # 로그인/가입 (layout: false)
│   │   ├── calendar/index.vue      # 캘린더 뷰
│   │   ├── record/index.vue        # 기록 입력/리스트 + 친구 초대
│   │   ├── terrarium/index.vue     # Jar 컨셉 테라리움 (5슬롯 + 하트 + 아이템 선택)
│   │   ├── shop/index.vue          # 아이템 상점 (Suspense + ClientOnly)
│   │   ├── profile/index.vue       # 프로필/통계/설정
│   │   ├── share/[code].vue        # 공유 수신 (SSR + OG 메타 + 초대 수락)
│   │   └── admin/                  # 어드민 (index, items, categories, exchange, levels)
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
│       └── constants.ts            # 카테고리 맵, 희귀도, STORAGE_KEYS, DEFAULTS
├── tests/
│   ├── api-contract.test.ts        # SDK 타입 shape 검증 (17 tests)
│   ├── composables/*.test.ts       # composable contract 검증
│   └── utils/*.test.ts             # format, constants 단위 테스트
├── i18n/locales/
│   ├── ko.json                     # 한국어 (83키, 7개 페이지 섹션)
│   └── en.json                     # 영어 (동일 구조)
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
    ├── ci.yml                      # lint → typecheck → build
    └── deploy.yml                  # docker build → push → SSH deploy
```

---

## 4. 도메인 모델

### 핵심 엔티티 (openapi-frontend/src/types.gen.ts 자동생성 기준)

> `app/types/` 디렉토리는 삭제됨. 모든 타입은 OpenAPI SDK에서 import.
> SDK 반환값은 hey-api union unwrap 이슈로 `castData<T>(data)` 유틸리티 사용.

```typescript
// 사용자
User { id, email, nickname, role, level, totalExp, basicCoin }

// 카테고리 (산책, 독서, 러닝, 낙서)
Category { id, name, iconUrl, color, tokenName, baseCoinReward, baseTokenReward, dailyLimit }

// 기록
ActivityRecord { id, userId, categoryId, memo, recordedDate, createdAt }

// 재화
WalletInfo { basicCoin, tokens: CategoryToken[] }
CategoryToken { categoryId, categoryName, amount }
WalletTransaction { id, currencyType, amount, balanceAfter, reason, createdAt }

// 아이템
Item { id, name, categoryId?, priceType, priceAmount, rarity, assetUrl, width, height }
UserItem { id, itemId, quantity, acquiredAt, item: Item }

// 테라리움
Terrarium { id, backgroundId, items: TerrariumItem[] }
TerrariumItem { id, itemId, posX(0~1), posY(0~1), rotation, scale, zIndex }
TerrariumBackground { id, name, assetUrl, unlockCondition, unlockValue }

// 레벨
LevelConfig { level, requiredExp, rewardType, rewardValue, maxItems }
```

### 재화 구조 (2층)

```
기본 코인 — 범용 구매, 기본 행동 보상
카테고리 토큰 — 행동별 전용 (산책토큰, 독서토큰, 러닝토큰, 낙서토큰)
토큰 교환: 1:2 비율 (어드민 조정 가능)
```

### 희귀도

```
COMMON — 일반 (기본 코인 구매)
RARE   — 레어 (카테고리 토큰 또는 높은 코인)
EPIC   — 에픽 (특별 조건 또는 이벤트)
```

---

## 5. API 엔드포인트 (Backend 연동)

### 인증 (better-auth → Nuxt Nitro 서버)
```
/api/auth/*              # better-auth 핸들러 (Nitro에서 처리)
```

### Business API (Spring Boot)
```
GET    /api/v1/categories
GET    /api/v1/records                 # 날짜 범위 필터
GET    /api/v1/records/today
POST   /api/v1/records                 # 생성 → 비동기 보상 이벤트
PUT    /api/v1/records/:id
DELETE /api/v1/records/:id             # soft delete
GET    /api/v1/records/stats
GET    /api/v1/records/calendar/:yearMonth

GET    /api/v1/wallet
GET    /api/v1/wallet/history
POST   /api/v1/wallet/exchange         # 멱등성 키 필수

GET    /api/v1/level

GET    /api/v1/shop/items
POST   /api/v1/shop/purchase           # 멱등성 키 필수
GET    /api/v1/inventory
GET    /api/v1/shop/backgrounds

GET    /api/v1/terrarium
POST   /api/v1/terrarium/items         # 아이템 배치
DELETE /api/v1/terrarium/items/:id
PUT    /api/v1/terrarium/items/:id     # 위치 수정
PUT    /api/v1/terrarium/background
GET    /api/v1/terrarium/user/:userId

POST   /api/v1/share
GET    /api/v1/share/:shareCode        # SSR + OG 메타

GET    /api/v1/profile
PUT    /api/v1/profile

CRUD   /api/v1/admin/items             # ADMIN only
PUT    /api/v1/admin/categories/:id/rewards
PUT    /api/v1/admin/exchange-rates
GET    /api/v1/admin/dashboard
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
| `/profile` | `pages/profile/index.vue` | 프로필/통계/설정 | 필수 |
| `/share/:code` | `pages/share/[code].vue` | 공유 수신 (SSR + OG + 초대 수락) | 불필요 |
| `/admin` | `pages/admin/index.vue` | 어드민 대시보드 | 필수 (ADMIN) |
| `/admin/items` | `pages/admin/items.vue` | 아이템 관리 | 필수 (ADMIN) |
| `/admin/categories` | `pages/admin/categories.vue` | 카테고리 보상 관리 | 필수 (ADMIN) |
| `/admin/exchange` | `pages/admin/exchange.vue` | 교환 비율 관리 | 필수 (ADMIN) |
| `/admin/levels` | `pages/admin/levels.vue` | 레벨 설정 | 필수 (ADMIN) |

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
- [x] i18n 번역 83키 × 2언어 (ko/en)
- [x] 6개 핵심 페이지 Figma→Nuxt 포팅 완료
- [x] Vitest 테스트 32개 (utils + composable + API contract)
- [x] 코드 리뷰 72건 전부 수정 (4차 리뷰 clean)

### Phase 2 (W5~W12, ~7월)

- [x] TerrariumCanvas (HTML/CSS jar + 5슬롯 + 하트 클릭 + 아이템 선택)
- [x] 공유 화면 /share/:code (SSR + OG 메타 + 초대 수락)
- [x] 토큰 교환 모달 (ExchangeModal: 스페셜→기본 + 토큰↔토큰)
- [x] 어드민 페이지 5개 (대시보드, 아이템, 카테고리, 교환, 레벨)
- [x] 온보딩 튜토리얼 5단계 (기록→보상→구매→꾸미기→공유)
- [x] GA4 이벤트 트래킹 (useGtagEvents, 5곳 연결)
- [x] Record 컴포넌트 추출 (CategoryGrid, RecordForm, RecordCard)
- [x] composable SDK 전환 (useRecord → OpenAPI SDK)
- [x] 보상 애니메이션 (RewardToast)
- [ ] PixiJS 전환 (현재 HTML/CSS → PNG 에셋 준비 시 PixiJS v8 교체)

### Phase 3~4 (W13~W30, ~11월)

- [ ] 소셜 로그인 (Google, Kakao)
- [ ] 결제 연동 (IAP/Play Billing)
- [x] Capacitor 모바일 래핑 (Android 빌드 완료, iOS는 macOS 필요)
- [x] 네이티브 브릿지 (useNative: share, haptics, camera, push)
- [x] 딥 링크 (AASA + assetlinks + App Links)
- [ ] 인스타 공유 최적화
- [ ] 시즌/이벤트 스탬프
