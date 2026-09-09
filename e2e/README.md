# UI 기하 회귀 검사

저장소 루트에서 기존 의존성과 Playwright Chromium을 사용한다. 기존 `playwright.config.ts`의 Pixel 5 프로젝트를 그대로 실행하며, 한 스펙의 순차 검사로 개발 서버 부하를 고정한다.

첫 번째 터미널에서 개발 서버를 시작하고 `Local: http://localhost:3000/` 로그를 확인한다.

```sh
DEPLOY_PROFILE=e2e bun run dev --port 3000
```

두 번째 터미널에서 실행한다.

```sh
PLAYWRIGHT_BASE_URL=http://localhost:3000 bunx playwright test e2e/ui-geometry.spec.ts
```

PowerShell에서는 각각 `$env:DEPLOY_PROFILE='e2e'`, `$env:PLAYWRIGHT_BASE_URL='http://localhost:3000'`을 지정한 다음 해당 `bun`/`bunx` 명령을 실행한다. 완료 후 첫 번째 터미널에서 개발 서버를 종료한다.

## 범위와 산출물

- 15개 라우트·인증 상태를 320/393/430px light 및 393px dark로 검사한다(60장).
- 393px light에서 관리, 힐링, 알림센터, 공유, 랭킹, 초대코드, 루비 부족 해금, 온보딩 1단계, 투두·일기·거리 시트, 습관 생성 1단계, 캘린더 날짜 시트, 공지를 검사한다(14장).
- 모든 캡처에 상단 47px·하단 34px·좌우 0px safe-area 변수를 주입한다.
- PNG 74장, `geometry.json`, `hit-area-candidates.json`, `clip-candidates.json`은 고정된 `e2e/output-screenshots/ui-geometry/`에 저장한다. 이 경로는 기존 `.gitignore` 규칙으로 제외되며 출력 경로 환경변수는 없다.
- JSON은 실행마다 새로 수집한다. 개별 캡처 실패도 `failures`에 남기고 테스트를 실패시킨다. 이전 PNG가 남아 있을 수 있으므로 현재 실행의 캡처 수는 `geometry.json`의 `results`를 기준으로 한다.

## 단언과 첨부

문서 가로 오버플로, 단일행 기대 요소의 텍스트 줄바꿈, 다이얼로그 콘텐츠끼리 또는 콘텐츠와 실제 토스트 루트의 사각형 교차는 실패한다. 줄바꿈은 고정 selector인 `nav a > span:last-child`(아이콘을 제외한 라벨), `[role=tab]`, `.apjek-chip`, `.apjek-cta`의 텍스트 노드에 `Range.getClientRects()`를 적용해 서로 다른 y 행을 검출한다. 계산된 `white-space` 값으로 검사 대상을 제외하지 않는다.

다이얼로그는 `.sheet-panel`, `[data-testid="modal-card"]`, HomeDialog의 `.relative > .rounded-3xl`, 알림 패널, 공지·온보딩 카드로 매핑한다. 힐링은 백드롭 셸 없이 스테이지가 전체 화면 콘텐츠이므로 힐링 바를 포함하는 `#my-terra-container` 자체를 명시적으로 사용한다. 알 수 없는 셸은 실패시켜 전체 화면 백드롭을 콘텐츠로 오인하지 않는다. `pageerror`는 항상 0건이어야 한다.

모든 상태는 목적 패널의 표시를 단언한 뒤 캡처한다. 관리는 `#home-manage-panel`, 힐링은 `home-healing-bar`와 `home-bgm-toggle` 표시 및 `.mode-intro-jar`가 있는 진입 안내의 소멸까지 기다린다. 공유·랭킹·초대·해금은 이름으로 지정한 HomeDialog 카드, 알림은 `notifications-panel`, 기록·습관·날짜 시트는 정확한 dialog 이름의 `.sheet-panel`, 공지는 `notices-title`을 참조하는 dialog의 콘텐츠를 사용한다.

`console.error`는 별도 수집한다. 달력 hydration 메시지는 정확한 원문을 허용하며 파생 `slice` 오류는 같은 캡처에서 해당 hydration 오류가 먼저 수집된 경우에만 허용한다. 없는 경로의 localStorage 거부는 정확한 원문으로, CSP는 해당 404 URL에서 관찰된 빈 격리 프레임 출처 `Framing ''`와 전체 `frame-src` 지시문 원문으로 한정한다. 요청한 404 리소스 오류도 해당 URL만 허용한다. 각 규칙에 한국어 사유 주석이 있으며 이 예외는 `pageerror`에 적용하지 않는다.

`hit-area-candidates`는 클릭 요소의 사각형에 포인터 입력을 받는 절대 배치 의사요소 확장과 부모 배율·클리핑을 반영해 어느 한 축이 48px 미만인 후보를 보고한다. 44px 미만은 `severe: true`로 표시한다. 후보 자체는 실패시키지 않으며, 캘린더 날짜·키우기 반짝이 칩·캐러셀 도트가 검출되는지는 대조군으로 확인한다. 회전·복잡한 비직사각형 도형과 다른 요소의 가림까지 확정하는 검사는 아니므로 실제 히트영역 수정 전 수동 확인이 필요하다.

`clip-candidates`는 `overflow-x:hidden`이며 직접 텍스트가 있는 요소의 `scrollWidth > clientWidth` 목록이다. 의도된 말줄임도 포함하므로 실패시키지 않는다. 두 후보 목록과 기하 JSON은 Playwright 첨부에도 포함된다.

검출기 대조군 4종은 `geometry.json.controls`에 남긴다. (1) 키우기 내비 라벨에 `whiteSpace='normal'`, `width='1px'`를 잠시 주입해 줄바꿈 검출과 원복 후 0건을 단언한다. (2) 초대코드 복사 성공 토스트와 초대 카드가 동시에 존재하고 떨어져 있을 때 교차 0건인지 확인한다. (3) 실측에 쓰는 순수 교차 함수에 겹친 합성 사각형을 넣어 50×60 교차를 검출하고 경계만 접하면 비교차인지 확인한다. (4) 소수점 border-box 크기로 배율을 계산한 놀러가기 버튼이 44px 이상이며 `severe:false`인지, 27~43px 캘린더 날짜가 여전히 후보인지 확인한다. 자신과 조상에 transform/scale이 없으면 배율은 1이다. 기존 키우기 칩·캐러셀 도트 후보 대조군도 유지한다. 돌연변이와 토스트 대조군은 원래 상태 PNG 캡처 후 실행하므로 74장 매트릭스를 바꾸지 않는다.

## 픽스처와 검증 경계

`fixtures/dense-data.ts`는 `safe-area.spec.ts`의 세션 쿠키·인증·API 응답 관례와 감사 하네스의 긴 닉네임, 고액 잔액, 식물 60개, 배치 40개, 친구 20명, 알림 30개, 기록 10개를 사용한다. 로그인은 비로그인 응답으로 전환한다. 외부 브라우저 요청과 미등록 로컬 API 전달을 차단하며, 개발 서버는 `http://localhost:3000`만 허용한다. 공유 경로는 SSR의 실백엔드 호출을 피하도록 `/legal/guide`에서 클라이언트 라우터로 이동한다.

해금·공지·습관 생성 상태는 실제 SFC를 개발 서버에서 불러와 앱 컨텍스트에 마운트한다. 거리 측정은 합성 위치를 사용한다. 이 검사는 로컬 Chromium·밀집 픽스처·합성 safe-area 검증이며, 실백엔드 연동·실기기 WebView·실제 GPS·Figma 픽셀 일치 결과를 뜻하지 않는다.
