# Figma0409 → Nuxt 포팅 진행 체크포인트

> 이 문서는 `/loop`가 매 회차 읽고 갱신합니다. 사람이 수동으로 편집해도 됩니다.
> 상태 값: `todo` / `in_progress` / `done` / `blocked`

- **레퍼런스 리포**: `D:\01.Work\08.rf\TerraWorld\reference\Figma0409` (React + Vite + Tailwind)
- **타겟**: `frontend/app/` (Nuxt 4 + Vue 3 + Tailwind v4)
- **작업 브랜치**: `design/figma0409-sync`
- **시작 시각 (KST)**: 2026-04-09 22:38
- **종료 시각 (KST)**: 2026-04-10 22:00 (R3부터 새 창; 기존 10:00 창은 R2 후 세션 끊김으로 cron 유실)

## 스냅샷 고정
- 레퍼런스 리포는 `git fetch` 후 `origin/main` 기준으로만 읽는다. 루프가 레퍼런스를 수정하지 않는다.
- 최초 고정 커밋: `4197da3 Add files from Figma Make`

## 페이지 포팅 상태

| #  | Figma0409 소스                | Nuxt 타겟                        | 상태     | 메모 |
|----|-------------------------------|----------------------------------|----------|------|
| 1  | `app/pages/Root.tsx`          | `app/layouts/default.vue`        | done     | R2: 5탭/센터강조/route 배경색 전환/헤더 제거 (WalletBar mock 제거) |
| 2  | `app/pages/MyTerra.tsx`       | `app/pages/index.vue`            | partial  | R1: 헤더/슬롯/하트+API 완료. TODO: Jamjar SVG, motion, share, 3 dialogs, 배치 다이얼로그 |
| 3  | `app/pages/Record.tsx`        | `app/pages/record/index.vue`     | done     | R3: solo/friend 토글, 동적 카테고리, createRecord+reward toast, createInvite 클립보드 |
| 4  | `app/pages/Calendar.tsx`      | `app/pages/calendar/index.vue`   | done     | R4: 월달력/stats/day-detail/note CRUD, getRecordStatistics+listRecords+getNote+saveNote+deleteNote |
| 5  | `app/pages/Shop.tsx`          | `app/pages/shop/index.vue`       | todo     | 상점 / 재화 교환 |
| 6  | `app/pages/Profile.tsx`       | `app/pages/profile/index.vue`    | todo     | 프로필 / 설정 |

## 공용 자산 포팅 상태

| 분류         | 소스                                | 타겟                              | 상태  | 메모 |
|--------------|-------------------------------------|-----------------------------------|-------|------|
| UserContext  | `app/context/UserContext.tsx`       | `app/composables/useUser.ts` + Pinia store | todo | 재화/유저 상태 |
| exchange lib | `app/lib/exchange.ts`               | `app/lib/exchange.ts` (Vue용 포팅) | todo  | |
| items lib    | `app/lib/items.ts`                  | `app/lib/items.ts`                | todo  | |
| rewards lib  | `app/lib/rewards.ts`                | `app/lib/rewards.ts`              | todo  | |
| storage lib  | `app/lib/storage.ts`                | `app/composables/useStorage.ts`   | todo  | |
| Jamjar SVG   | `imports/Jamjar/*`                  | `app/components/icons/Jamjar.vue` | todo  | Figma 벡터 포팅 |
| PPJamjar     | `imports/Ppjamjar/*`                | `app/components/icons/PpJamjar.vue` | todo | |
| Terraworld 로고 | `imports/TerraworldCopy*/*`      | `app/components/icons/TerraworldLogo.vue` | todo | 여러 variant 통합 |

## shadcn/ui 컴포넌트 포팅

Figma0409는 shadcn/ui 48개를 그대로 export 해둠. Nuxt는 shadcn-vue를 쓰지 않는 방향으로 결정됨. **우선 쓰이는 것만 골라서 포팅**한다.

- [ ] button → `app/components/ui/Button.vue`
- [ ] card → `app/components/ui/Card.vue`
- [ ] dialog → `app/components/ui/Dialog.vue` (기존 `CommonModal`과 통합 검토)
- [ ] sheet (바텀시트) → `app/components/ui/Sheet.vue`
- [ ] tabs → `app/components/ui/Tabs.vue`
- [ ] badge → `app/components/ui/Badge.vue`
- [ ] input → `app/components/ui/Input.vue`
- [ ] avatar → `app/components/ui/Avatar.vue`
- [ ] skeleton → `app/components/ui/Skeleton.vue`
- [ ] toast/sonner → 기존 `CommonToast`와 통합 검토

## API 통합 상태 (openapi-frontend SDK)

루프는 포팅한 페이지마다 **mock 제거 + `useOpenApi()` 연결**을 병행한다.

| 페이지           | 사용할 API                                                   | 상태  |
|------------------|--------------------------------------------------------------|-------|
| index (MyTerra)  | `getMe`, `getTerrarium`, `clickTerrariumHeart`               | done  |
| record           | `listCategories`, `listRecords`, `createRecord`, `createInvite`    | done |
| calendar         | `getRecordStatistics`, `listRecords`, `getNote`, `saveNote`, `deleteNote` | done  |
| shop             | `getApiV1Items`, `postApiV1Purchases`, `postApiV1Exchange*`  | todo  |
| profile          | `getApiV1UsersMe`, `getApiV1Levels`, `postApiV1AuthLogout`   | todo  |

## Fallback 태스크 스택 (디자인 포팅 거리가 떨어졌을 때)

루프가 순서대로 집어든다. 완료 시 체크.

1. [ ] **인증 실제 연결**: `app/lib/auth-client.ts`를 better-auth + openapi SDK로 묶고, login/signup 페이지를 실제 API 호출로 전환
2. [ ] **라우트 미들웨어**: `app/middleware/auth.ts` 추가 — 토큰 없으면 `/auth/login` 리다이렉트
3. [ ] **런타임 config 정리**: `nuxt.config.ts`의 `NUXT_PUBLIC_API_BASE_URL` 기본값과 타입 선언 점검
4. [ ] **공용 컴포넌트 추출**: 페이지에서 중복되는 블록을 `app/components/common/*`로 분리
5. [ ] **Pinia stores**: `stores/user.ts`, `stores/terrarium.ts`, `stores/items.ts` 선제 스캐폴딩
6. [ ] **페이먼트 훅**: `app/composables/usePayment.ts` — PG SDK 로딩 + 결제 상태 머신 스켈레톤 (결제는 아직 시뮬레이션 플래그로)
7. [ ] **에러 바운더리**: `app/error.vue` + `useErrorHandler` 컴포저블
8. [ ] **loading/empty 상태**: 각 페이지 `<Suspense>` + `CommonLoading` 일관화
9. [ ] **i18n 스캐폴딩**: `@nuxtjs/i18n` 기본 구조 (ko/en 네임스페이스만 세팅)
10. [ ] **mobile 리포지토리 확인**: TerraWorld-IT org에 mobile 리포가 있으면 클론해서 상태 파악, 없으면 스펙 문서 초안

## 회차 로그

각 루프 회차는 아래 템플릿으로 append.

```
### Round {n} — {kst-timestamp}
- **picked**: <page or fallback item>
- **result**: done | partial | blocked
- **commit**: <sha short> or "-"
- **notes**: <one-liner>
```

<!-- LOOP_LOG_START -->
### Round 1 — 2026-04-09 ~23:05 KST
- **picked**: MyTerra → pages/index.vue (+API wiring)
- **result**: partial (core + API done, visual polish deferred)
- **commit**: afbb4c7
- **notes**: Replaced 8-concept demo with real Figma0409 port. getMe+getTerrarium on mount, clickTerrariumHeart on button. 3 action buttons + item placement stubbed with TODO toasts. Jamjar SVG still placeholder.

### Round 2 — 2026-04-09 ~23:15 KST
- **picked**: Root → layouts/default.vue
- **result**: done
- **commit**: 5c57aa3
- **notes**: Mobile-app shell: no top header, max-w-md centered, bottom nav 5 tabs (기록/캘린더/나의테라centered/상점/서랍) with lucide icons, per-route bg color. WalletBar mock (coin=128) removed — Figma design has no persistent wallet bar. /calendar tab will 404 until R4.

### Round 3 — 2026-04-10 ~13:55 KST
- **picked**: Record → pages/record/index.vue (+API wiring)
- **result**: done
- **commit**: 8cd0150
- **notes**: Figma Record.tsx port. Solo/friend toggle, dynamic category grid from listCategories, createRecord with real reward toast (basicCoins+categoryTokens from server response), recent records from listRecords, createInvite button copies link to clipboard. Session-only cron died after R2 (durable:false mistake); task now rearmed via scheduled-tasks MCP persistent task until KST 04-10 22:00.
### Round 4 — 2026-04-10 ~14:20 KST
- **picked**: Calendar → pages/calendar/index.vue (+API wiring)
- **result**: done
- **commit**: c49accf
- **notes**: Figma Calendar.tsx port. Monthly calendar grid, stats panel (today/week/total + byCategory progress bars), day-click detail showing records + note CRUD. APIs: getRecordStatistics, listRecords(year/month), getNote, saveNote, deleteNote. Fixed 5 TS type assertions (hey-api union resolution), stale noteMap cache on month nav, unsafe error casts. Architecture TODO: extract #e8ecfc/#97a8f1 as riso tokens (project-wide issue across all pages).
<!-- LOOP_LOG_END -->
