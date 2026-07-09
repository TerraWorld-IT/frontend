# eosikahair 참고 기반 WebView 조작성 점검 리스트 + 반영 계획

## 배경

`webapp-ios`/`webapp-android`(순수 네이티브 WKWebView/Android WebView 래퍼)를 참고자료로 삼아, TerraWorld(Capacitor 8 원격 WebView 셸)의 iOS/Android WebView 환경에서 발생 가능한 문제를 점검하고 반영한 기록. eosikahair 레포 자체는 다른 클라이언트 프로젝트라 분석만 하고 수정하지 않음 — 발견한 패턴 클래스를 TerraWorld 소스에 대조해 해당하는 것만 반영.

## 1. eosikahair 네이티브 브릿지 인벤토리 (참고, 소스 간접 확인)

`webapp-ios/webapp/ContentView.swift`가 등록하는 11개 핸들러(Keychain/DeviceInfo/FIDO/Browser/AppControl/SafeAreaColor/CaptureProtection/PushNotification/Camera/PushService/BackButton) 중, TerraWorld(Capacitor 표준 플러그인 기반)와 문제 클래스가 겹치는 항목만 아래 §2에서 대조.

## 2. 리스트업 — 항목별 TerraWorld 대조 결과 + 반영 여부

| # | eosikahair 참고 항목 | TerraWorld 대조 결과 | 반영 여부 |
|---|---|---|---|
| 1 | `BrowserScriptHandler`(외부 링크 네이티브 브라우저 호출) | TerraWorld는 외부 링크 자체가 없음(grep 0건), `@capacitor/browser` 미설치가 정상 | 해당없음 |
| 2 | `useNativeBridge` 전역 초기화 지점 부재 → 싱글톤 브릿지가 페이지 unmount마다 테어다운되는 회귀 클래스 | TerraWorld엔 동일 패턴의 전역 브릿지 싱글톤 cleanup 코드 없음(grep 0건) | 해당없음 |
| 3 | 인증 미들웨어가 세션 로딩 상태를 그냥 통과시키는 버그 클래스(딥링크 직접 진입 시 플리커/인증 우회) | TerraWorld `middleware/auth.ts`의 CSR `authClient.getSession()`에 타임아웃이 없어 네트워크 hang 시 네비게이션 무기한 정지 위험 확인 | **반영** — 5초 fail-closed 타임아웃 (frontend `54a56e8`) |
| 4 | `BackButtonHandler`(하드웨어 뒤로가기 웹↔네이티브 계약) | TerraWorld는 이미 `useBackButtonStack`(Codex 감사로 이전 세션에 구현) 보유, 모달/바텀시트 우선 처리 확인됨 | 기구현 확인, 추가조치 없음 |
| 5 | `CaptureProtectionScriptHandler`(스크린샷 방지) | TerraWorld에 결제/의료정보 화면 없음, 개인 루틴 화면도 법적 요구사항 미명시 | 보류(정책 결정 필요, 이번 스코프 아님) |
| 6 | `SafeAreaColorScriptHandler`(상태바 동적 색상 동기화) | TerraWorld는 `colorMode.client.ts`에서 다크모드 전환 시 `StatusBar.setStyle/setBackgroundColor` 이미 연동됨(Codex 감사로 이전 세션에 구현) | 기구현 확인, 추가조치 없음 |

## 3. 웹서칭 기반 Capacitor 8 / WebView 일반 문제 점검 (eosikahair와 별개, 이번 세션 신규)

15개 이상 카테고리 직접 소스 검증 + GitHub 이슈 기반 리서치. 상세는 세션 기록 참조, 요약:

| 카테고리 | 결과 | 반영 |
|---|---|---|
| Capacitor 8 Android 16 키보드/edge-to-edge 회귀(ionic-team/capacitor#8329/#8432) | 코어 fix 8.3.0 포함, TerraWorld는 8.3.1 — 주 증상 해결됨. Android 9 이하 잔여 부작용 확인 | **반영** — MainActivity.java 조건부 처리 (mobile `0417617`) |
| AdMob 보상 프라미스 무기한 대기 위험(Dismissed 이벤트 미발생 시) | 실제 소스 확인, hang 위험 존재 | **반영** — 60초 fail-closed 타임아웃 (frontend `d21affc`) |
| 클립보드 복사 실패 에러 미처리 | `friends/index.vue`에서 확인 | **반영** — try/catch + fallback (frontend `d21affc`) |
| 세션만료 시 설명 UX 부재 | 기능은 정상(즉시 리다이렉트), 설명 메시지만 없음 | **반영** — 안내 토스트 (frontend `8c1640c`) |
| 쿠키 영속성 / resume JWT 갱신 / WKWebView 프로세스종료 복구 / 딥링크 검증 / configChanges·targetSdk / capacitor.config 핀치줌·키보드 / windowSoftInputMode / 원격디버깅 게이팅 / 파일업로드 / 오프라인 감지 / 스플래시-hydration 타이밍 | 전부 이미 정상 구현 확인(소스 검증) | 해당없음 |
| Push 알림 권한 즉시요청(iOS 옵트인율 저하 anti-pattern) | 확인됨, 실제 fix는 플러그인/미들웨어 실행 순서 보장이 필요해 실기기 검증 없이 손대면 회귀 위험(권한 영구 미요청) | **미반영** — human QA 필요 |
| KST 야간 다크모드 첫 페인트 flicker | 원인 특정(`colorMode.preference:'light'` 고정 SSR + 클라이언트 전용 시간대 전환) | **미반영** — 전역 렌더링 변경 필요, 브라우저 검증 없이 진행 시 회귀 위험 |
| AdMob 오버레이 중 pause/resume 상호작용 | Codex가 QA 카테고리로 분류(명백한 버그 아님) | **미반영** — 실기기 QA |
| 저사양기기 process kill 시 기록/타이머 draft 미복구 | Pinia store가 메모리 전용, persist 없음 확인 | **미반영** — 별도 기능(persist) 필요, 버그 아닌 신규 요구사항 |

## 4. 최종 반영 커밋 (5건, 2개 레포)

1. `frontend` `54a56e8` — auth 미들웨어 세션 체크 타임아웃
2. `mobile` `0417617` — MainActivity Android 9 이하 키보드 방어
3. `frontend` `d21affc` — AdMob 타임아웃 + 클립보드 fallback
4. `frontend` `8c1640c` — 세션만료 설명 토스트

## 5. 미반영 항목 — Human QA 백로그 (사용자 확인, 2026-07-09)

실기기/에뮬레이터 검증 인프라가 이 환경에 없음(GitHub Actions에 Android 에뮬레이터 러너·Firebase Test Lab·BrowserStack 부재, `ios-lan-test.yml`은 사용자 PC+아이폰 필요한 수동 workflow). 아래 5건은 코드 결함이 아니라 실기기 확인 또는 제품 설계 판단이 필요해 이번 세션 스코프에서 제외:

- Push 알림 권한 요청 타이밍(온보딩 UX 설계)
- KST 야간 다크모드 첫 페인트 flicker(브라우저 확인)
- Android 16 키보드/edge-to-edge 실동작(Capacitor 8.3.1 코어 fix 신뢰, 실기기 확인 권장)
- AdMob 오버레이 pause/resume(실기기 QA)
- 저사양기기 기록 draft 미복구(신규 기능 요구사항, 버그 아님)

## Codex 페어링 기록

- Round 1~2: auth.ts fix 검증 — Agent 기반 codex-rescue, 성공(net-positive 판정 + orphaned-request 지적 반영)
- Round 3~5 (광범위 감사): Agent 브로커 4회 불안정 실패(`cli_unavailable`) → 메인 스레드에서 companion script(`node codex-companion.mjs setup --json`) 직접 워밍 후 `codex exec` 직접 호출로 우회, 성공 — AdMob/클립보드 2건 신규 발견 + MainActivity fix 안전성 확인
