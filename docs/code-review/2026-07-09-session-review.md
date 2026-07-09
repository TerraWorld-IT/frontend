# Code Review Report — 2026-07-09 세션 변경분

대상: frontend 최근 15커밋 (`ce74865..38f115c`), 6개 리뷰어 병렬 실행(lint/type/security/quality/architecture + Codex).

## Summary

| 카테고리 | Critical | High | Medium | Low | 합계 |
|----------|----------|------|--------|-----|------|
| Lint     | 0 | 0 | 0 | 0 (세션 무관 22건 별도) | 0 |
| Type     | 0 | 0 | 0 | 0 | 0 |
| Security | 0 | 0 | 0 | 0 (INFO 3건) | 0 |
| Quality  | 0 | 2 | 8 | 5 | 15 (대부분 세션 무관 기존 코드) |
| Architecture | 0 | 0 | 2 | 3 | 5 |
| Codex    | 0 | 0 | 1 | 2 | 3 |
| **합계** | **0** | **2** | **11** | **10** | **총 23건** |

## 수정 완료 (합의/실제 버그, 4건)

| id | 근거 | 조치 |
|---|---|---|
| CDX-001 | Codex: AdMob `FailedToShow` 이벤트 미처리 — 광고 표시 실패 시 60초 타임아웃까지 대기 | `useAdMob.ts`에 `RewardAdPluginEvents.FailedToShow` 리스너 추가, 즉시 `resolve(false)` |
| ARCH-005 / CDX-002 | Architecture+Codex 독립 합의: `showRewardVideoAd().catch()` 경로가 리스너 미정리 → reject 반복 시 전역 리스너 누적 | 3개 종료 경로(dismiss/failedToShow/timeout/reject)를 단일 `settle()` 함수로 통합, 모든 경로에서 리스너 정리 |
| ARCH-003/004, CDX-003 | Architecture+Codex 독립 합의: dailyType 표시 로직이 `Record<string,string>`(타입 소진검사 없음) + RecordCard.vue/calendar/index.vue 2곳 중복 구현 | `constants.ts`에 `NonNullable<RecordResponse['dailyType']>` 기반 타입 + `recordDisplayLabel()`/`recordDisplayIcon()` 헬퍼 신설, 양쪽에서 재사용 |
| ARCH-001 | 이 코드베이스 확립 관례(`usePayment`/`useWilting`) 위반 — setup 컨텍스트 밖 콜백에서 `useI18n()` 대신 `nuxtApp.$i18n` 사용해야 함 | `openapi.ts` 401 인터셉터를 `nuxtApp.$i18n` 패턴으로 통일 |

## 확인만 하고 미수정 (세션 스코프 밖, 4건)

| id | 사유 |
|---|---|
| QUAL-001~005 | `ranking/index.vue`, `friends/index.vue`의 기존(이번 세션 미작성) 수동 interface 중복 선언 — API Original Types First 위반이지만 제가 손댄 코드 아님, 범위 확장 전 확인 필요 |
| QUAL-006 | `constants.ts RARITY_LABELS`(dead code, 참조 0건) vs `shop/index.vue` 자체 희귀도 라벨 값 불일치 — 제품 문구 결정 필요, 범위 밖 |
| QUAL-007 | 오버레이 뒤로가기 등록 보일러플레이트가 3개 페이지에 반복 — 기존 코드, `index.vue`의 `registerOverlayBackClose()` 헬퍼로 통합 가능하나 이번 세션 범위 밖 |
| ARCH-002 | `admin.ts`의 `fetchMe()`가 auth.ts와 같은 fail-closed 타임아웃 패턴이 없음 — 실제 갭이지만 이번 세션에 건드리지 않은 파일이라 회귀 아님, 별도 확인 필요 |

## 확인 결과 문제없음

- Toast 단일 마운트(app.vue) — 중복 없음, `layout:false` 4개 페이지 전부 커버 확인(Architecture+Codex 둘 다 확인)
- `useAdMob`/`middleware/auth.ts`/`plugins/openapi.ts` 신규 로직 — 반응성/스멜/계약 위반 없음
- `auth.ts`의 `fetchOptions.timeout`이 실제로 `AbortController.abort()`를 트리거함을 Codex가 설치된 `@better-fetch/fetch` 소스로 재확인
- XSS/시크릿/인증 — 0건 (`v-html`/`innerHTML`/하드코딩 시크릿 없음, `.env` gitignore/dockerignore 양쪽 제외 확인)

## Action Items

- [x] Critical/High: 없음
- [x] 합의된 실제 버그 4건: 수정 완료(위 표)
- [ ] Medium(범위 밖 4건): 사용자 결정 대기 — 별도 트랙으로 진행할지 여부
- [ ] Low: 시간 될 때 개선(e2e 테스트 파일 console.log 22건 등)
