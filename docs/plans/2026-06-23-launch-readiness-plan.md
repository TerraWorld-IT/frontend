# TerraWorld 출시 준비 실행 계획서 (Plan SoT)

- 문서 버전: **v1.1** (2026-06-23) — v1.0 합성 + 적대적 검수(needs-fixes) 반영
- 성격: **Plan SoT** — 출시 BLOCKING 작업의 단일 진실 공급원. 진행률·완료 판정은 본 문서 기준.
- 핵심 전제: AI 작성 코드는 **인간 QA/수동 테스트 통과 전까지 '완료'로 카운트하지 않는다** (human test gate). 녹색 빌드 ≠ 결함 없음.
- 검증 기반: 2026-06-23 worklist 재검증 워크플로우(57 후보) + 법무/코드 스코핑 + 적대적 plan 검수.

> **v1.1 검수 반영 요약**: ① 마이그레이션 번호 3-way deconflict(duration V23 / entitlement V24 / consent V25) ② P1-4 nonce entropy 점검 추가 ③ AdSsv 콜백 테스트 api/reward 배치 정정 ④ P2-1 User.kt 패키지 경로 정정 ⑤ GRAC·backfill 검증 LLM/외부 분리 ⑥ P3-1/P3-2 backend 의존 보강 ⑦ P4 품질·인프라 항목 출시 게이트 밖 carry-over 명시.

---

## §0. 분류 정정 — 법무 작업은 통째로 human-gate 가 아니다

기존 worklist 가 법무 전체를 `humanGate` 로 분류했던 것은 **과도한 보수**다. 법무 작업은 **LLM-doable** 과 **인간/외부 게이트**로 분리된다.

### LLM-doable (실제로 수행하는 작업)
- **조항 감사**: privacy.md / terms.md 의 PIPA·정보통신망법·전자상거래법 요건 충족 여부 점검, 누락 조항 식별
- **초안 작성**: 신규 조항(파기 절차·위치정보 미수집), 동의 분리 UI 코드 초안, 동의 이력 저장 스키마 초안, 번역 초안
- **정합성 검증**: 문서 선언 ↔ 실제 코드(DB 컬럼·gtag 로드·hook 메시지) drift 검출·정정
- **매핑**: App Store Data Safety / Play Data Safety 공시 항목 ↔ 문서 수집항목 매핑표
- **체크리스트**: 변호사 검토용 쟁점 리스트, 출시 전 동의 게이트 구현 체크리스트
- **GRAC 사전 분석**(v1.1 추가): 가상재화+IAP 의 게임산업법 등급분류 해당가능성 요건 대조 + 쟁점 체크리스트 초안

### 인간/외부 게이트 (내 작업 아님 — §7 핸드오프 트랙)
- 변호사 **binding 사인오프**(법적 효력 보증)
- 사업자 정보 / **CPO 지정** / 시행일 확정
- 통신판매업 신고 / **GRAC 등급분류 최종 신청·판정**(별도 BLOCKING 가능)
- App Store App Privacy / Play Data Safety **콘솔 공시값 최종 입력**
- 수집 사실값(광고ID·GA4를 '선택' vs '필수' 운영) **사업 정책 결정**

> 결론: 법무 = "LLM 이 초안·정합·매핑·체크리스트·사전분석까지 끌고 가고, 변호사/사업자/정부 신고는 핸드오프". 법무를 통째로 미루지 않는다.

---

## §1. Tier 우선순위 & 분류 원칙

- **Tier**: HIGH(출시 BLOCKING) / MEDIUM(출시 품질·심사 영향) / LOW(post-launch 정비)
- **Effort**: XS / S / M / L / XL (시간 환산 없음)
- **완료 판정**: 코드 작업은 `verify` 통과 + **인간 QA 게이트 통과** 시에만 완료. 인간 QA 미통과는 진행률 **0%** 반영(보수 산정).
- 인간/외부 의존은 **§7 핸드오프 트랙**으로 분리 — Phase 진행률 분모에서 제외.

---

## §2. Phase 0 — 독립 Quick-Win (병행 착수, 의존성 없음)

| ID | 작업 | Tier | Effort | Area | 근거 |
|----|------|------|--------|------|------|
| P0-1 | **RecordForm duration 저장 누락 fix** (silent-drop 실버그) | HIGH | M | backend | 데이터 손실 실버그. 의존성 0 |
| P0-2 | 만14세 법 근거 문구 통일 (`정보통신망법 §50조의2` → `개인정보보호법(아동)`) | MEDIUM | S | frontend/legal | privacy 본문은 정정됨, 코드·i18n·hook 만 잔존 불일치 |
| P0-3 | `server/lib/auth.ts:98` 주석 정리 (birthDate "광고 타겟팅/보호자 동의" 문구 삭제) | MEDIUM | S | frontend | 실제 코드 0건 + privacy §2.1 목적한정과 모순 |
| P0-4 | privacy.md 독립 '파기 절차·방법' 조항 초안 (PIPA §21) | MEDIUM | M | legal | 현재 §3에 분산 |
| P0-5 | '위치정보 미수집' 명시 조항 추가 | LOW | S | legal | 잔여 체크리스트 권고 |
| P0-6 | openapi `.source-sha` bump + 재번들 (off-spec `6c2d667` 반영) | MEDIUM | XS~S | openapi | drift-check behind:1 |

### P0-1 상세 — RecordForm duration silent-drop 실버그 ★

**이것은 silent-drop 실버그다.** request 는 frontend RecordForm → spec → `RecordController.kt:50` → `LocalCreateRecordRequest.duration` 까지 정상 흐르지만:
- `ActivityRecord` 엔티티에 컬럼 **부재**
- `RecordService.createRecord` 가 **저장 안 함**
- `toResponse()` (`RecordService.kt:292`) 에서 **`duration = null` 하드코딩**

**왜 위험한가**: create 응답은 `request.duration` 을 echo(`RecordService.kt:154`)하므로 **즉시 화면엔 정상 표시**된다. 목록 reload(`getRecords` → `toResponse` null) 시에만 소실 → **단순 create 스모크로는 절대 못 잡는다.**

- **touchFiles**: `V23__activity_record_duration.sql`(신규), `domain/record/ActivityRecord.kt`(durationMinutes 컬럼), `api/record/RecordService.kt`(createRecord line105·partner line128 + toResponse line292 + 응답 line154), `RecordServiceTest.kt`
- **steps**: ① `ALTER TABLE public.activity_records ADD COLUMN IF NOT EXISTS duration_minutes INT;` + COMMENT (V7 photo_url 패턴) ② `@Column(name="duration_minutes") val durationMinutes: Int? = null` ③ createRecord 본인·partner record 에 `durationMinutes = request.duration` 전달 ④ `toResponse()` `duration = null` → `duration = durationMinutes` ⑤ 응답 line154 도 `record.durationMinutes` 로 일관화 ⑥ Test: `CreateRecordRequest(duration=30)` → **getRecords/toResponse 경로**에서 `duration=30` assert (Fake findAll 이 empty 반환하므로 **store 기반 반환하도록 Fake 보강 필수**)
- **verify**: `./gradlew test --tests 'com.terraworld.api.record.RecordServiceTest'` + `./gradlew compileTestKotlin` + grep `duration = null` 잔존 0 + flyway validate(로컬 PG). **인간 QA: 기록 생성 → 목록 reload 시 RecordCard 에 '30분' 표시 유지 (reload 필수)**
- **dependsOn**: 없음. 마이그레이션 번호 = **V23** (§4 P2-1=V24, §3 P1-3=V25 와 3-way deconflict)
- **(v1.1) 회귀 risk**: Fake `findAll` 을 empty→store 기반으로 바꾸면 기존 RecordServiceTest 다른 케이스의 "조회 결과 없음" 가정이 깨질 수 있음 → **full-suite 재실행**(`./gradlew test`)로 blast-radius 확인 필수.

### P0-6 상세 — openapi sync 정정
**정정**: nonce 는 이미 현 source-sha(`8e911b1`)에 포함 → **SDK 는 nonce 기준 stale 아님**. 미반영분은 `6c2d667`(admin/social/placement off-spec 편입) **1건뿐**.
- **steps**: `cd openapi && bun install --frozen-lockfile && bun run check`(format+lint+bundle) → 정상 경로는 `sync.yml`(push to main)이 SYNC_TOKEN 으로 양 submodule 자동 재생성·push. 로컬 수동 시 양 submodule `.source-sha` 를 openapi HEAD 로 갱신 + 상위 repo submodule pointer 커밋
- **verify**: `cd openapi && bun run check` + `cd backend && ./gradlew compileKotlin` + `cd frontend && bun run typecheck`(vue-tsc — **nuxt-module-build 는 strict 타입 미실행, `tsc --noEmit` 별도 주의**). 양 submodule `.source-sha` 동일 + openapi HEAD 일치
- **risk**: openapi-ts 0.97 breaking 전례 → 버전 bump 동반 금지. 상위 repo submodule pointer 커밋 누락 시 fresh clone `ERR_MODULE_NOT_FOUND`. bun.lock + git-URL dep 는 atomic staging

---

## §3. Phase 1 — 출시 BLOCKING Critical Path (HIGH)

### P1-1 결제 검증기 단위·통합 테스트 (HIGH, M) — "녹색 빌드 ≠ 결함 없음"

**근거**: Billing/SSV/RTDN 검증기는 **workflow-batch 로 한 번에 구현된 코드**이며 billing 테스트 디렉토리가 **현재 0개**. 단위테스트/typecheck/lint 통과해도 **합성·정책·경계 결함(fail-open / 멱등 경계 / sandbox grant)이 잠복**(작성자=같은 AI 가정 내부만 검증 → false-pass). **적대적 케이스 위주** 테스트가 출시 BLOCKING.

- **touchFiles**: `backend/src/test/kotlin/com/terraworld/api/billing/`(신규) — `AppStorePurchaseVerifierTest.kt`, `PlayPurchaseVerifierTest.kt`, `IapVerifyControllerTest.kt`, `PlayBillingWebhookControllerTest.kt` + **`com/terraworld/api/reward/AdSsvCallbackControllerTest.kt` + `AdSsvSignatureVerifierTest.kt`** (v1.1 정정: AdSsvCallbackController 는 `api/reward` 에 있으므로 콜백 테스트도 reward 패키지)
- **적대적 케이스(보안 핵심)**:
  - AppStore **sandbox fallback(21007)**: `allowSandboxFallback` 기본 true → **prod 무결제 grant 표면**. 이 분기 테스트 필수
  - PlayBillingWebhook **순서 고정**: `503 은 dedup insert 前`, `malformed 는 200 ACK`(redelivery storm/은폐 방어)
  - IapVerifyController **fail-closed**: live + Disabled → INVALID_INPUT, testMode+prod 거부
  - AdSsv: tx_id>64→400, timestamp skew>tolerance→403, dedup insert=0→200
- **dependsOn**: 없음(기존 구현 검증만). `evaluate/parsePurchase` private 시 가시성 조정(internal) — **소폭 production 변경 가능, 최소화**
- **verify**: `./gradlew test --tests 'com.terraworld.api.billing.*' --tests 'com.terraworld.api.reward.*'` + jacoco 분기 커버. **미테스트 영역 명시: 실 Google Play API / Apple verifyReceipt / AdMob SSV 공개키 HTTP 실호출은 단위테스트 범위 밖 → §7 핸드오프**

### P1-2 가입 동의 분리 UI 구현 (HIGH, M) — 문서-구현 최대 갭

**근거**: privacy §2 / terms §9 가 전제한 '약관/필수개인정보/선택/마케팅 분리 동의 + 항목·버전·시각 기록'이 **UI·DB 양쪽 모두 미구현**. `login.vue` 가입폼 동의 체크박스 **0개**, Onboarding.vue 는 동의 화면 아님. PIPA §15 + 스토어 심사 직결.

- **추가 동의 항목**: [필수] 만14세 확인 / [필수] 이용약관 / [필수] 개인정보 수집·이용 / [선택] 사진(R2) / [선택] FCM / [선택] 광고ID(+iOS ATT) / [선택] GA4 분석 / [선택] 마케팅 수신 + 상단 '전체 동의'
- **touchFiles**: `login.vue`(가입 모드 체크박스 + 각 항목 Modal.vue 약관 링크 + onSubmit 필수 미체크 throw + i18n 에러), `i18n/locales/ko.json`·`en.json`(auth 블록 terms/privacy/marketing/consent 키 신규 — **현재 0건**)
- **dependsOn**: 없음(UI). **UI 변경이므로 사용자 승인 후 적용** (Integration Rules)
- **verify**: `vue-tsc` + 필수 미체크 시 가입 차단 + i18n 키 누락 0. **인간 QA: 실기기에서 동의 누락 가입 차단 + 약관 모달 열림 확인**

### P1-3 동의 이력 저장 배선 (HIGH, S) — 분쟁 시 동의 입증

**근거**: terms §9 가 '동의 항목·버전·시각 기록'을 선언했으나 auth 스키마·backend 도메인 어디에도 consent/agreed_at/policy_version 컬럼 **0건** → 동의 입증 불가.

- **touchFiles**: `consent` migration(**V25** — v1.1: P0-1/P2-1 과 3-way deconflict) `consent(user_id, policy_type, policy_version, agreed, agreed_at)` 또는 `auth.ts` additionalFields(`marketingConsent`/`consentVersion`/`consentedAt`) + `create.before` 검증 hook. **+ backend consent 조회/PATCH 엔드포인트**(P3-2 철회 UI 의존 — v1.1 추가)
- **dependsOn**: **P1-2(동의 UI)** — 동의값을 signUp payload 로 전달
- **verify**: 마이그레이션 dry-run(flyway/PG) + signUp 시 consent row 기록 + `grep consent` 백엔드/auth 매치. **인간 QA: 가입 후 DB 에 동의 row(버전·시각) 기록 확인**

### P1-4 광고보상 nonce SDK 연동 — ★ 이미 구현 완료 (검증 + entropy 점검만)

**정정**: "착수 가능"이 아니라 **이미 전부 구현 완료**. spec(`rewards-ad.yaml` + nonce minLength16/maxLength64), dual codegen(`types.gen.ts:815` + `sdk.gen.ts:1146` + `AdRewardRequest.kt:22`), frontend(`index.vue:605` `sdk.claimAdReward` + `useAdMob.ts generateNonce`), backend 멱등가드(`RewardController.kt:43` + `ad_reward_nonce_inbox V21` + `RewardServiceNonceTest` 11케이스) **모두 존재**.
- **(v1.1) 잔여 1줄**: `useAdMob.ts generateNonce()` 가 doc 주석의 'UUID v4' 와 달리 `nonce-${Date.now()}-${Math.random()...}`(비암호학적·예측가능) → **client nonce 예측가능 시 replay 방어 약화**. `crypto.randomUUID()`(웹/네이티브 지원) 또는 `crypto.getRandomValues` 로 교체 후 닫기.
- **verify**: `./gradlew test --tests 'com.terraworld.api.reward.*'` + frontend typecheck + `generateNonce` entropy 교체 확인. P0-6 sync 에 회귀 흡수. **이 항목은 '검증-only' 라 §10 진행률 분모에서 제외(이미 완료).**

---

## §4. Phase 2 — 데이터 정합·entitlement 정리 (HIGH/MEDIUM)

### P2-1 entitlement deprecated 컬럼 drop (HIGH, S) — destructive, 선행검증 BLOCKING

**근거**: V16 주석이 '컬럼은 backfill 검증 후 별 migration 으로 drop' 명시. DROP 은 **불가역 destructive**.

- **선행(2-part, v1.1 분리)**:
  - **LLM-doable**: 검증 SQL 작성 — `SELECT count(*) FROM users WHERE entitlement_free_placement=TRUE AND NOT EXISTS(SELECT 1 FROM user_entitlement ue WHERE ue.user_id=users.id AND ue.entitlement_key='free_placement')` (premium_themes 동일) + 결과 해석 로직.
  - **운영자(§7)**: prod DB 접속 후 실행 + **결과=0 캡처 첨부**. **1건이라도 있으면 그 사용자 entitlement 영구 소실 → rollback 불가.**
- **touchFiles**: `V24__drop_deprecated_entitlement_columns.sql`(신규), **`backend/src/main/kotlin/com/terraworld/domain/user/User.kt:27-32`**(v1.1 패키지 경로 정정 — `api.user` 아님) @Deprecated boolean 2필드 제거, `api/terrarium/TerrariumService.kt:113`(주석만 정리)
- **dependsOn**: V16 backfill prod 데이터 일치 **운영자 검증**(§7) + P0-1/P1-3 과 마이그레이션 번호 deconflict(V24)
- **verify**: `./gradlew compileKotlin compileTestKotlin`(필드 참조 컴파일 에러 0) + `grep -rn 'entitlementFreePlacement|entitlementPremiumThemes' src` 가 TerrariumService.kt 주석 1건만 + flyway validate
- **risk**: 라이브 read/write 0(grep 확인)이라 엔티티 제거 안전. DROP 전 backfill 적용 여부(flyway_schema_history)와 미반영 row 0 **둘 다** 확인

### P2-2 GA4/광고ID 정합 (MEDIUM) — 2단계 (v1.1: 정책결정 선행 분리)

**근거**: privacy §2.2/§9·terms §9의3 이 '선택' 동의로 표기하나 `nuxt.config.ts:163-167` gtag 는 `NODE_ENV==='production'`이면 **무조건 로드**, opt-in 게이트·consent mode·anonymize_ip 전무 → **동의 없이 자동 활성**. '선택' 표기와 구현 정면 불일치.

- **P2-2a 정책 결정(핸드오프 선행, §7)**: 광고ID/GA4 를 실제 '선택' opt-in 으로 운영할지 vs '필수'로 문서 표기 철회할지 **사업 정책 결정**. 이게 미결이면 구현 방향 자체가 미정 → 구현 착수 BLOCK.
- **P2-2b 게이트 구현(M, P2-2a 의존)**: `nuxt.config.ts`(nuxt-gtag → consent mode/런타임 opt-in 게이트), 분석/광고 거부 토글 컴포넌트, iOS ATT 연동 지점
- **dependsOn**: P2-2a(정책) + P1-3(동의 저장 — 동의값으로 게이트 제어)
- **verify**: `vue-tsc` + production 빌드에서 동의 전 gtag 미로드(런타임 — **빌드 후 `node` 부팅 확인**, `NODE_ENV` 인라인 dead-code 주의). **인간 QA: 미동의 시 GA4 네트워크 콜 미발생**

---

## §5. Phase 3 — 출시 품질·심사 보강 (MEDIUM)

| ID | 작업 | Effort | Area | dependsOn | verify |
|----|------|--------|------|-----------|--------|
| P3-1 | 마케팅 수신동의 opt-in + 야간(21~08시) 발송 제한 (정보통신망법 §50) | M | legal/backend | P1-3 동의저장 **+ backend 발송 컴포넌트(FCM/이메일) + KST timezone 게이트**(v1.1) | 발송 전 동의 게이트 단위테스트 + 야간 차단 timezone 테스트 + grep marketing 컬럼 |
| P3-2 | 동의 철회/수정 UI (profile 마케팅/분석/광고 토글) | M | frontend | P1-3 동의저장 **+ backend consent PATCH 엔드포인트**(v1.1) | vue-tsc + 토글 → consent row update 확인. 인간 QA |
| P3-3 | iOS ATT prompt 실배선 (requestTrackingAuthorization + useAdMob iOS early-return 해제) | M | mobile | P2-2b 광고ID 게이트 | Info.plist NSUserTracking 존재 확인 + 실기기(§7) |
| P3-4 | DR 백업 스크립트 실배선 (pg/redis-backup + cron + S3/R2) | M | infra | 없음 | 스크립트 dry-run + 복구 drill(§7) |
| P3-5 | Data Safety / App Privacy 공시 ↔ 문서 수집항목 매핑표 | S | legal | — | 매핑표 vs 코드 grep 교차 |
| P3-6 | privacy/terms 상호참조 정합 점검 | S | legal | P0-2~P0-5 | grep 상호참조 + 조항 번호 정합 |

---

## §6. Phase 4 — Post-launch 정비 (LOW) ⚠️ 출시 게이트 밖 carry-over

> **v1.1 명시**: 아래는 출시 BLOCKING worklist(법무 정합+결제검증+동의+entitlement)와 **직접 연결 안 되는** 일반 품질·인프라 정비(e2e screenshot backlog·ADR-005 i18n staged·UltraPlan S-AUDIT/PM carry-over). LOW 격리. 출시 게이트로 취급하지 않음.

| ID | 작업 | Effort | Area |
|----|------|--------|------|
| P4-1 | ARCH-008 cleanup `CurrencyBuilder`→`WalletBuilder` rename | XS | backend |
| P4-2 | i18n en.json 실번역 (463/504 미번역, ADR-005 staged) | L | frontend |
| P4-3 | script-side 한글 하드코딩 t() 치환 ~36건 | M | frontend |
| P4-4 | Tailwind v4 다크모드 전 컴포넌트 dark: variant | L | frontend |
| P4-5 | PM 불일치 정렬(npm↔bun) 또는 분리 문서화 | S | mobile |
| P4-6 | SAST CodeQL frontend 적용 | S | infra |
| P4-7 | RewardToast a11y assertion / stale 주석 / openapi 빌드타임 스키마검증 / orphan checkout gitignore | XS~S | misc |
| P4-8 | 법무 문서 영문/일문 번역 초안 (Phase 5+ EU/JP, 법적효력은 §7) | L | legal |

---

## §7. 핸드오프 트랙 — 인간/외부 게이트 (내 작업 아님, 진행률 분모 제외)

### 법무·사업·정부 (외부)
| 항목 | 담당 | 비고 |
|------|------|------|
| 변호사 binding 사인오프 (PIPA §15/17/22·정보통신망법·전자상거래법) | 변호사 | LLM 초안의 법적효력 보증 불가 |
| 사업자 정보 확정 (회사명/대표/등록번호/주소/연락처) | 사업자 | privacy §11·terms placeholder |
| CPO 지정 (이름·직책·연락처) | 사업자 | PIPA §31 필수 |
| 시행일 확정 + 시행 전 공고 | 사업자/법무 | |
| 통신판매업 신고 의무 판정 + 신고 | 사업자 | 관할 시군구 |
| **GRAC 등급분류 최종 신청·판정** | 사업자 | 가상재화+IAP → 해당 시 별도 BLOCKING. **사전 분석/쟁점 체크리스트는 LLM(§0)** |
| 청약철회(7일) 처리 주체 (자체 vs Apple/Google) | 사업 운영 | |
| GDPR 적용범위 (한국한정 vs EU) | 사업 전략 | |
| 광고ID/GA4 '선택' vs '필수' 운영 결정 (P2-2a) | 사업 정책 | 게이트 방향 결정 |
| App Store App Privacy / Play Data Safety 콘솔 공시값 입력 | 스토어 계정 보유자 | |

### QA·실기기·실키 (인간 게이트)
| 항목 | 의존 |
|------|------|
| entitlement V16 backfill prod 데이터 일치 **실행+캡처** (P2-1 선행) | **검증 SQL 은 LLM 작성, prod 실행만 운영자** |
| 실기기 스모크 QA (Android 서명빌드 + iOS TestFlight) / 베타·사용성 | |
| 실 결제 검증 (Play + Apple sandbox) / 시크릿·키 주입 / IAP 런타임 | P1-1 단위테스트는 검증기 로직만 |
| PlayPurchaseVerifier 실 Play API / AppStoreVerifier 실 verifyReceipt / AdMob SSV 실트래픽 / RTDN 실구독 | 각 시크릿 주입 |
| 딥링크 AASA/assetlinks 실 Team ID·SHA256 주입 후 nginx 배포 / DR 복구 drill | P3-4 |
| FCM 푸시 실기기 토큰 QA / AdMob·AdSense 실 운영ID 주입 | |
| 시각검증: asset placeholder·wilt 1/2/3·PixiJS WebGL·attendance streak | |

---

## §8. Critical Path & 의존성 그래프

```
[Phase 0 병행 — 의존성 0]
  P0-1 duration fix (HIGH, V23) ─┐
  P0-2~P0-5 법무 문구·조항          │  (마이그레이션 V23/V24/V25 3-way deconflict)
  P0-6 openapi sync ── P1-4 nonce 검증+entropy(이미 완료)
                                  │
[Phase 1 BLOCKING]
  P1-1 결제검증 테스트 (HIGH, 독립) ───────── 출시 BLOCKING
  P1-2 동의 분리 UI (HIGH) ──► P1-3 동의 저장(V25) ──► P2-2b GA4/광고ID 게이트
                                     │                      ▲ P2-2a 정책결정(핸드오프)
                                     ├──► P3-1 마케팅 opt-in(+backend 발송·KST)
                                     └──► P3-2 철회 UI(+backend consent PATCH)
[Phase 2 destructive]
  V16 backfill prod 검증(SQL=LLM / 실행=운영자) ──► P2-1 entitlement DROP (HIGH, V24)
[Phase 3] P2-2b ──► P3-3 iOS ATT;  P3-4 DR(독립)
[Phase 4] LOW carry-over — 출시 게이트 밖
```

**Critical Path(최장 사슬)**: `P1-2 동의 UI → P1-3 동의 저장 → P2-2b GA4/광고ID 정합 → P3-3 iOS ATT`
**병렬 독립 BLOCKING**: `P1-1 결제검증 테스트`, `P2-1 entitlement DROP`(V16 검증 선행), `P0-1 duration fix`
**마이그레이션 3-way deconflict**: 현 최고 V22 → **P0-1=V23 / P2-1=V24 / P1-3=V25**

---

## §9. 권장 착수 순서

1. **Phase 0 전부 병행** — 의존성 0 quick-win. 특히 **P0-1(duration silent-drop 실버그)** 최우선. P0-2~P0-5 법무 정합, P0-6 openapi sync(+P1-4 nonce entropy 교체).
2. **P1-1 결제검증 테스트**(독립 HIGH) — 적대적 케이스(sandbox fallback / webhook 순서 / fail-closed) 집중.
3. **P1-2 동의 분리 UI**(사용자 승인 후) → **P1-3 동의 저장(V25 + consent PATCH 엔드포인트)** 순차.
4. **V16 backfill prod 검증 SQL 작성(LLM) → 운영자 실행·캡처(§7) 수령** 후 **P2-1 entitlement DROP(V24)**.
5. **P2-2a 정책결정(핸드오프) → P2-2b 게이트** → Phase 3(마케팅 opt-in·철회 UI·iOS ATT·DR·매핑표).
6. **Phase 4 LOW** 는 출시 후.
7. **핸드오프 트랙(§7)은 병렬 즉시 트리거** — 변호사·사업자·**GRAC 등급분류**·실키 주입은 리드타임이 길고 GRAC 은 별도 출시 BLOCKING 가능. (GRAC 사전 분석·쟁점 체크리스트는 LLM 이 먼저 초안 작성해 외부 트리거 가속.)

---

## §10. 진행률 산정 (보수 — 인간 QA 0 반영)

- **출시 BLOCKING(HIGH)**: P0-1, P1-1, P1-2, P1-3, P2-1 — **인간 QA 게이트 통과 전까지 0% 카운트**.
- **P1-4 는 분모 제외**(이미 구현 완료, entropy 교체 + 회귀 검증만 = 검증-only).
- 코드 `verify`(gradle test / vue-tsc / flyway dry-run / grep) 통과 = **".env-ready"** 상태이며 **"완료" 아님**.
- 핸드오프 트랙(§7)은 분모 제외하되, **GRAC 등급분류·변호사 사인오프 미결 시 출시 자체 불가**임을 별도 게이트로 명시.

> 본 문서는 plan SoT. 작업·테스트·진행률·게이트 상태 변경 시 같은 turn 에 본 문서 + Notion 진척현황(공식 "Team 테라월드" inline DB)을 갱신. **인간 검증 통과 시에만 '완료'.**

---

## §11. 구현 상태 (2026-06-23 implementation cycle)

> `/goal 전부 구현` cycle 결과. 아래 "코드 구현 완료" = `verify` 통과(.env-ready) 상태이며 **인간 QA 미통과 = '완료' 아님**(§10).

### 코드 구현 완료 (verify green)

| 항목 | 산출물 | verify |
| --- | --- | --- |
| **P0-1** duration silent-drop fix | V23 migration + ActivityRecord.durationMinutes + RecordService(create/partner/toResponse) + 테스트 2건 | BE test green |
| **P0-2** 만14세 법 근거 정정 | 정보통신망법§50의2→개인정보보호법 (i18n ko/en + auth.ts 3곳 + login.vue + migration + CLAUDE.md) | grep 0 |
| **P0-3** birthDate 목적 과장 주석 제거 | auth.ts:98 + 002 migration COMMENT | — |
| **P0-4/P0-5** privacy 파기 절차(§3의2)·위치정보 미수집(§9의2) | privacy.md | — |
| **P0-6** openapi sync | dist 재번들(40 paths) + spec/.source-sha → 6c2d667 (양 submodule) | bun run check 통과 |
| **P1-1** 결제 검증기 적대적 테스트 | billing 4 + AdSsv 2 테스트 (sandbox-block/parsePurchase/fail-closed/503-before-dedup/malformed-200) — **50 tests** | BE test green |
| **P1-2** 가입 동의 분리 UI | login.vue 동의 fieldset(필수 2+선택 5+전체동의) + i18n consent + legal/terms·privacy 페이지 + e2e helper | FE typecheck green |
| **P1-3** 동의 이력 저장 | auth.ts additionalFields 9 + create.before 필수동의 검증 + 003 migration | FE typecheck green |
| **P1-4** nonce entropy | useAdMob generateNonce → crypto CSPRNG (getRandomValues 경로 추가) | FE typecheck green |
| **P2-1** entitlement 컬럼 drop | V24 (backfill-누락 시 RAISE EXCEPTION fail-closed) + User 엔티티 필드 제거 + 주석 정리 | BE compile green |
| **P2-2b** GA4 opt-in 게이트 | nuxt.config initMode:'manual' + analytics-consent.client.ts (analyticsConsent 시에만 initialize) | FE typecheck green |
| **P3-1** 마케팅 발송 정책 | MarketingSendPolicy (동의 게이트 + KST 21~08 야간 제한) + 테스트 4건 | BE test green |
| **P3-2** 동의 철회/수정 UI | profile 동의 항목 관리 카드 + authClient.updateUser + i18n | FE typecheck green |
| **P3-3** iOS ATT | useAdMob.requestTrackingAuthorization + capacitor.client.ts iOS 시작 시 호출 | FE typecheck green |
| **P3-4** DR 백업 스크립트 | deploy/scripts/pg-backup.sh·redis-backup.sh·crontab.terraworld-backup + runbook 갱신 | bash -n green |
| **P3-5** Data Safety 매핑표 | docs/legal/data-safety-mapping.md (12 항목 × Play/Apple 매핑) | — |
| **P3-6** privacy/terms 정합 | cross-ref 검증 + "출시 전 제공 예정" stale 노트 3곳을 구현 반영으로 갱신 | — |
| **P4-6** frontend CodeQL | frontend/.github/workflows/codeql.yml (javascript-typescript) | — |
| **P4-7** misc | RewardToast a11y 더미 assert → 실 검증 / free-placement stale 주석 정리 | FE test green |

**Verify 종합 (2026-06-23)**: backend `./gradlew test` = **311 tests, 0 failures/0 errors** · frontend `typecheck` = **EXIT 0** · `vitest` = **93 tests pass** · `oxlint` = **0 errors** · i18n ko/en = **521=521 symmetric** · openapi `bun run check` = valid.

### 미검증 (§7 인간/외부 게이트 — '완료' 아님)
실 키 주입·실기기 QA·실 결제 검증·prod DB(V24 backfill 0-row 확인 후 적용)·변호사 binding 검토·스토어 콘솔 공시 입력·DR drill. **위 코드는 .env-ready 이며 런타임 미검증.**

### P4 전체 구현 완료 (2026-06-23 cycle 2~3 — Stop hook 재검토 후)
- **P4-1** ✅ CurrencyBuilder→WalletBuilder rename (14파일 + 파일명, word-boundary로 CurrencyResponse DTO 보존) — BE 311 tests green.
- **P4-2** ✅ i18n en.json **전체 영문 번역**(541 keys, 한글 잔여 0, placeholder 보존). **+ `detectBrowserLanguage: false`**: en.json 번역이 en-browser 를 미검수 영문 UX 로 자동 전환시키는 회귀를 차단 — 전 사용자 ko 고정(Korean-first launch 유지), en.json 은 Phase 5+ 언어 전환 UI 도입 시 활성.
- **P4-3** ✅ 하드코딩 한글 → i18n: useWilting / EVOLUTION_STAGE_META(labelKey/descKey) + UpgradeModal consumer / useEvolution·useAttendance·useCustomCategory·usePayment(errMsg·toast). setup 밖 직접 단위테스트 호환 위해 `useNuxtApp().$i18n` 패턴 사용(useEvolution/usePayment). 잔여 dead const(RARITY_LABELS 미사용)·dayjs 날짜포맷은 비대상.
- **P4-4** ✅ Tailwind 다크모드: `colorMode.classSuffix=''`(.dark 클래스) + `@custom-variant dark` + **comprehensive `.dark` override**(bg-white/text-black/border-black/gray·neutral 스케일/회색 hex + riso-cream 페이지 bg, unlayered 우선) + 인라인 light 표면 3곳 `dark:` 변환. 강조색·text-white·모달 백드롭 유지. **build green**. (실 시각 QA 는 §7 인간 게이트 — 다크 팔레트 디자인 정합은 디자이너 검토 권장.)
- **P4-5** ✅ 이미 문서화됨 — mobile/README.md "PM 선택 — npm intentional".
- **P4-6** ✅ frontend CodeQL.
- **P4-7** ✅ RewardToast a11y assertion + stale 주석 정리.
- **P4-8** ✅ 법무 en/ja 전문 번역 draft 4종: `terms.en.md`·`privacy.en.md`·`terms.ja.md`·`privacy.ja.md` (모두 "DRAFT, 한국어 원본 번역, 법적효력 없음·변호사 검토 전제" 헤더 명시). 법적 효력/binding 검토는 §7 변호사.

> **결론**: plan.md 의 **모든 구현 항목(Phase 0~3 + P4-1~P4-8) 코드/문서 구현 완료 + 자동 verify green**. 남은 것은 §7 의 **인간/외부 게이트만** (AI 실행 불가): prod DB V24 적용 · 변호사 binding 사인오프 · 스토어 콘솔 공시 입력 · 실 결제/실기기 QA · push 실기기 QA · DR drill · 실 시크릿/키 주입.
