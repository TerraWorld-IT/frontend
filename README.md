# TerraWorld Frontend

> Nuxt 4 web + mobile app for the TerraWorld habit-tracking + terrarium-decorating service.
> 제4회 2026 IT 프로젝트 공모전 출전작 (숭실대 디지털미디어학과)

## Stack

- **Nuxt 4.4.2** (Vue 3.5, Nitro, Vite 7)
- **bun** package manager
- **Tailwind CSS v4** (CSS-first `@theme`, `@tailwindcss/vite`)
- **Pinia 3** (도메인 상태) + composables (UI/auth state)
- **PixiJS 8** (스탬프 연출 / 테라리움 캔버스)
- **better-auth 1.6** (Nitro 서버) + RS256 JWKS (Spring 검증)
- **@hey-api/client-fetch** + auto-generated SDK from `@terraworld-it/openapi-frontend` (submodule)
- **Capacitor 8** (Android/iOS native shell — Phase 3+)
- **i18n** ko/en
- **Vitest** (32 tests — utils + composable + API contract)

자세한 구조와 컨벤션은 [CLAUDE.md](./CLAUDE.md) 참조.

## Setup

### 1. 환경변수

`.env.example`을 복사해 `.env`로 저장하고 채웁니다:

```env
# 공유 dev PG (search_path=auth,public)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/TERA_WORLD?search_path=auth,public

# better-auth 쿠키 + jwks 개인키 wrap (32+ 문자, openssl rand -hex 32)
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000

# Spring backend internal endpoint 호출용 공유 토큰 (BE와 동일값, OOB 전달)
INTERNAL_API_TOKEN=...
INTERNAL_API_BASE_URL=http://localhost:8080

# 클라이언트 노출
NUXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
NUXT_PUBLIC_AUTH_BASE_URL=http://localhost:3000
```

### 2. 의존성

```bash
bun install
```

### 3. DB 초기화 (최초 1회)

`auth` 스키마는 better-auth가 소유하므로 Spring Flyway가 건드리지 않습니다.
이 명령으로 한 번만 적용:

```bash
bun run db:init
bun run db:verify   # auth.user, session, account, verification, jwks 확인
```

그 다음 backend(`cd ../backend && ./gradlew bootRun`)가 V1~V5 Flyway를 적용합니다 (V5에서 `public.users` → `auth."user"` FK 연결).

### 4. Dev server

```bash
bun run dev   # http://localhost:3000
```

## Scripts

```bash
bun run dev          # Nuxt dev server
bun run build        # 프로덕션 빌드
bun run preview      # 빌드 결과 로컬 프리뷰
bun run lint         # oxlint --fix
bun run lint:check   # oxlint (수정 없음)
bun run typecheck    # vue-tsc (nuxi typecheck)
bun run test         # Vitest 단발 실행
bun run test:watch   # Vitest watch
bun run db:init      # auth 스키마 SQL 적용 (DATABASE_URL 사용)
bun run db:verify    # auth 테이블 5개 존재 여부
```

## 인증 흐름 요약

```
authClient.signIn.email() / signUp.email()
  ↓ Nitro: /api/auth/* (better-auth)
  ├ auth.user / session / account INSERT
  ├ databaseHooks.user.create.after → POST Spring /api/v1/internal/users/bootstrap
  └ tw.session_token 쿠키 (HttpOnly, Strict, 7d)
  ↓
useAuth().loadJwt() → GET /api/auth/token
  ↓ RS256 JWT (5m TTL)
clientJwt (module-scoped 변수, useState/cookie 금지)
  ↓
plugins/openapi.ts 인터셉터 → Authorization: Bearer
  ↓
Spring API → JwtAuthenticationFilter (JWKS 검증) → SecurityContext
```

> **보안 주의**: `useAuth.ts`의 `import.meta.server` 가드는 load-bearing 보안 코드입니다.
> 풀면 SSR payload에 JWT가 누출돼 CDN 캐시를 통해 cross-user leak이 발생할 수 있습니다.

## 주요 디렉토리

```
app/
├── components/      # 5개 카테고리 (common, icons, record, shop, terrarium)
├── composables/     # useAuth, useOpenApi, useNative, usePayment, ...
├── lib/             # auth-client.ts (better-auth Vue client + jwtClient plugin)
├── middleware/      # auth (cookie presence) + admin (CSR-only role check)
├── pages/           # 13 페이지 (홈, 기록, 캘린더, 테라리움, 상점, 프로필, 공유, 어드민 5개)
├── plugins/         # openapi.ts (Bearer + 401 retry) + capacitor.client.ts
├── stores/          # Pinia: user, items, terrarium
└── utils/           # format, error, constants
server/
├── api/auth/[...all].ts   # better-auth Nitro 핸들러
├── lib/auth.ts            # better-auth 설정 (jwt+bearer, databaseHooks)
└── db/migrations/         # auth 스키마 SQL (Spring Flyway가 안 건드림)
tests/                     # Vitest
```

## 모바일 (Capacitor)

Android는 빌드 통과. iOS는 macOS 필요로 보류.

```bash
cd ../mobile
bunx cap sync android
bunx cap open android
```

`server.url`로 Nuxt dev server를 직접 띄우는 hot-reload 구조이므로 코드 동기화가 필요 없습니다 (web === app).

## 더 읽기

- 프로젝트 컨벤션 / 디자인 시스템 / 인증 상세: [CLAUDE.md](./CLAUDE.md)
- 전체 개발 계획 / 마일스톤: [../DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md)
- 결제/스토어 보강안: [../DEVELOPMENT_PLAN_v2.md](../DEVELOPMENT_PLAN_v2.md)
- API 스펙 (단일 SoT): [TerraWorld-IT/openapi](https://github.com/TerraWorld-IT/openapi)
