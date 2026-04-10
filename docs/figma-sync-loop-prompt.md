# Figma0409 Sync Loop — Per-Round Prompt

> 이 파일은 `/loop`이 매 회차 그대로 읽어서 실행하는 프롬프트입니다.
> 회차 간에 메모리가 없으므로, 여기에 적힌 모든 전제와 수칙을 그대로 따라야 합니다.

---

## 절대 수칙

1. **작업 디렉터리**: `D:\01.Work\08.rf\TerraWorld\frontend`. 다른 리포 건드리지 말 것. 예외: fallback 태스크 10번(mobile 리포 확인) 진행 시에만 `D:\01.Work\08.rf\TerraWorld\mobile` 쓰기 허용.
2. **브랜치**: `design/figma0409-sync` 에서만 작업. main 건드리지 말 것. push는 항상 `origin design/figma0409-sync`.
3. **레퍼런스는 읽기 전용**: `D:\01.Work\08.rf\TerraWorld\reference\Figma0409` 는 절대 수정하지 않는다. 매 회차 시작 시 `git fetch && git reset --hard origin/main` 허용 (순수 pull).
4. **한 회차 = 디자인 포팅 + API 연동을 함께 완료**. 둘 중 하나만 하고 끝내지 말 것. 페이지를 옮기면 그 페이지의 mock은 반드시 `useOpenApi()` 실호출로 교체한다. openapi-frontend SDK에 해당 엔드포인트가 없으면 그 페이지를 건너뛰고 다음 항목으로.
5. **진행 상태 파일**: `docs/figma-sync-progress.md`. 회차 시작 시 읽고, 끝에 Round 로그 append.
6. **커밋 메시지**: Conventional Commits. `feat(page-name): ...` 또는 `feat(api): ...`. Co-Authored-By 라인 포함.
7. **빌드 검증 필수**: 커밋 전에 `bun run lint:check` 와 `bun run build` 둘 다 성공해야 한다. 실패하면 변경을 `git reset --hard HEAD` 로 되돌리고 progress.md에 `blocked: <원인>` 기록.
8. **Push 전 self-review**: `/code-review` 스킬을 호출해 4개 에이전트 리뷰 결과를 확인하고, 실제 bug/security 지적이 있으면 반영하거나 progress.md에 TODO로 남긴다. 리뷰가 "no issues"면 바로 push.
9. **절대 금지**:
   - `git push --force`
   - `main` 브랜치 체크아웃/수정
   - `.env` 파일 건드리기
   - 시크릿/토큰 변경
   - openapi-frontend 서브모듈 내부 수정 (SDK는 읽기 전용, 수정이 필요하면 progress.md에 blocked로 기록하고 다음 작업으로 넘어감)
   - prohibited_actions (삭제, 권한 변경, 결제 실행 등)
10. **종료 조건 체크**: 현재 KST 가 `2026-04-10 22:00` 이후면 아무 작업도 하지 말고 "loop time window ended" 만 출력하고 즉시 종료. (loop 자체는 scheduled-tasks MCP의 update/delete 로 사람이 끝낸다.)

---

## 회차 절차

### Phase 0 — 시간/상태 확인
1. 현재 KST 시각 확인. 종료 시각 초과면 바로 종료.
2. `cat docs/figma-sync-progress.md` 해서 상태 파악.
3. 현재 브랜치 확인: `git rev-parse --abbrev-ref HEAD` → `design/figma0409-sync` 아니면 `git checkout design/figma0409-sync`.
4. `git status` clean 확인. dirty면 `git stash` 후 진행 (루프가 남긴 쓰레기일 수 있음).
5. `git pull --ff-only origin design/figma0409-sync` (이전 회차 결과 반영).

### Phase 1 — 레퍼런스 갱신
```bash
cd D:/01.Work/08.rf/TerraWorld/reference/Figma0409
git fetch origin
git reset --hard origin/main
cd D:/01.Work/08.rf/TerraWorld/frontend
```

### Phase 2 — 작업 항목 선정 (우선순위 순)

progress.md 를 읽고 다음 중 **첫 번째로 해당되는 한 가지**만 고른다.

**A. 디자인 포팅 (최우선)**
progress.md "페이지 포팅 상태" 테이블에서 `todo` 또는 `in_progress` 인 첫 번째 페이지. 단, 해당 페이지에 필요한 openapi-frontend SDK 메서드가 존재해야 한다. (`openapi-frontend/src/sdk.gen.ts` grep 으로 확인.)

선정했으면:
1. Figma0409 의 해당 `.tsx` + 관련 `imports/*`, `context/*`, `lib/*` 를 읽는다.
2. Nuxt 4 + Vue 3 + Tailwind v4 문법으로 포팅.
   - 클래스명은 Tailwind v4 arbitrary value 허용, 하지만 가능하면 디자인 토큰(`@theme` 혹은 기존 CSS 변수) 재사용.
   - React hook → Vue composable 로 변환 (`useState` → `ref`, `useEffect` → `watchEffect`/`onMounted`).
   - shadcn/ui 컴포넌트는 필요한 것만 `app/components/ui/*.vue` 로 포팅. 있으면 재사용.
   - Figma SVG import (`imports/Jamjar` 등) 는 `app/components/icons/*.vue` 로 단발 포팅.
3. **API 연동 (같은 회차 안에)**: 해당 페이지에서 쓸 API를 `useOpenApi()` 로 호출. mock/하드코딩 제거. 로딩/에러 상태는 `CommonLoading`, `CommonToast` 재사용.
4. 빌드 확인 → 커밋 → push → progress.md 테이블 `done` 처리 + Round 로그.

**B. 공용 자산 포팅**
페이지 포팅에 필요한 공용 자산(UserContext→Pinia store, lib/*, Jamjar 아이콘 등)이 아직 `todo`면 그걸 먼저 한 회차 내 완료.

**C. shadcn/ui 컴포넌트**
페이지 포팅에 필요한 ui 컴포넌트가 없으면 하나만 포팅.

**D. Fallback 태스크**
progress.md "Fallback 태스크 스택" 에서 첫 번째 미체크 항목 하나. 설명에 적힌 범위만 하고, 범위를 넘지 않는다.

**E. 할 일 없음**
A~D 모두 없으면 progress.md 끝에 "Round N: idle — nothing to do" 한 줄만 append 하고 종료. (다음 회차는 30분 후, 그 사이 사람이 새 작업을 추가할 수 있음.)

### Phase 3 — 검증
```bash
bun run lint:check
bun run build
```
실패하면:
- `git reset --hard HEAD` 로 작업분 폐기.
- progress.md 해당 항목에 `blocked: <에러 요약 1~2줄>` 기록.
- Round 로그 `result: blocked` 로 append.
- 커밋/푸시 없이 Phase 5 로.

### Phase 4 — Self-review & Commit & Push

1. `/code-review` 스킬 호출. 결과에서 **실제 버그/보안 이슈**만 반영 (린트/스타일 잡음은 무시).
2. 수정 생기면 다시 `bun run lint:check && bun run build`.
3. 커밋:
```
git add <touched files>
git commit -m "feat(<scope>): <what>

<why — 1-2 lines>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
4. `git push origin design/figma0409-sync`.

### Phase 5 — progress.md 갱신

- 해당 항목 상태를 `done` / `blocked` 로 변경.
- 파일 끝 `<!-- LOOP_LOG_START -->` / `<!-- LOOP_LOG_END -->` 사이에 Round 로그 append:
```
### Round {n} — 2026-04-09 HH:MM KST
- **picked**: <항목명>
- **result**: done | blocked | idle
- **commit**: <sha 7자리> or "-"
- **notes**: <한 줄>
```
- progress.md 단독으로 커밋 + push (스코프가 진행 상태 변경 하나면 `chore(progress): round N <항목>`).

### Phase 6 — 출력
회차 종료 전에 아래를 **한국어 3줄 이내**로 출력:
1. 이번 회차에 한 일
2. 남은 todo 개수 (페이지 / 공용 자산 / fallback)
3. 다음 회차가 집을 예정 항목

---

## Fallback 태스크 구체 지침

progress.md "Fallback 태스크 스택" 각 항목의 실행 가이드:

1. **인증 실제 연결**
   - `app/lib/auth-client.ts` 가 better-auth 클라이언트를 만들도록 정리. base URL 은 `useRuntimeConfig().public.apiBaseUrl`.
   - `app/pages/auth/login.vue` 에서 실제 `postApiV1AuthLogin` 호출. 응답 토큰은 cookie 혹은 useState 전역에 저장.
   - signup 페이지 없으면 스킵.
   - 성공 조건: 빌드 통과 + 로그인 페이지에서 네트워크 탭에 실제 API 요청이 나간다고 코드상 확인 가능.

2. **라우트 미들웨어**
   - `app/middleware/auth.ts` — `useState<Token>('auth.token')` 없으면 `navigateTo('/auth/login')`.
   - `app/pages/index.vue`, `profile/`, `shop/`, `record/`, `terrarium/`, `calendar/` 에 `definePageMeta({ middleware: 'auth' })` 추가.
   - login 페이지는 제외.

3. **런타임 config 정리**
   - `nuxt.config.ts` 의 `runtimeConfig.public` 타입 선언을 명시.
   - `.env.example` 생성/업데이트 (git 추적). 실제 `.env` 는 건드리지 않음.

4. **공용 컴포넌트 추출**
   - 이미 포팅된 페이지에서 중복되는 블록 하나를 `app/components/common/` 로 빼고 import.

5. **Pinia stores**
   - `stores/user.ts`: 현재 유저, 재화. `getApiV1UsersMe` 호출.
   - `stores/items.ts`: 아이템 카탈로그.
   - `stores/terrarium.ts`: 현재 테라리움 상태.
   - 각 store는 `defineStore` + readonly state + actions 패턴.

6. **페이먼트 훅 스켈레톤**
   - `app/composables/usePayment.ts` — 실제 PG SDK 로딩은 나중, 지금은 상태 머신(`'idle' | 'loading' | 'processing' | 'success' | 'failed'`)과 `initPayment`, `confirmPayment`, `refund` 인터페이스만.
   - 실제 결제 실행은 절대 넣지 않는다. 시뮬레이션 플래그로 resolve.

7. **에러 바운더리**
   - `app/error.vue` Nuxt 에러 페이지 + Tailwind 스타일.
   - `app/composables/useErrorHandler.ts` — `AppError` 클래스, 서버 에러 메시지 → 사용자 친화적 문구 매핑 테이블.

8. **loading/empty 상태**
   - 이미 포팅된 한 페이지에 `<Suspense>` 와 skeleton loading 적용.

9. **i18n 스캐폴딩**
   - `@nuxtjs/i18n` 모듈 추가, `i18n/locales/ko.json`, `en.json` 빈 네임스페이스 생성, `nuxt.config.ts` 등록. 실제 텍스트 교체는 나중.

10. **mobile 리포지토리**
    - `gh repo view TerraWorld-IT/mobile` 해서 존재 여부 확인.
    - 존재하면 `D:\01.Work\08.rf\TerraWorld\mobile` 에 clone (없는 경우만).
    - 있으면 README + package.json 읽고 frontend 의 `docs/mobile-status.md` 에 현황 요약 작성 후 커밋.
    - 존재 안 하면 `docs/mobile-plan.md` 에 "아직 생성 안 됨. org admin 확인 필요" 한 줄 남기고 끝.

---

## 실패/중단 시 행동

- Phase 3 빌드 실패 → `git reset --hard HEAD` → blocked 기록 → Phase 5 로 점프 → push 없음.
- openapi SDK에 필요한 엔드포인트 없음 → 해당 페이지 skip, progress.md 에 `blocked: missing SDK <method>` 기록, 다음 우선순위로 이동.
- 4회차 이상 같은 항목에서 blocked → progress.md 에 `blocked_permanent` 로 표시하고 다음 항목으로.

## 회차 길이 정책 (갱신됨)

- **트리거 주기**: `*/30 * * * *` (cron 관점). 이전 회차가 끝나 있어야 다음 fire가 들어온다. 아직 실행 중이면 cron은 자연스럽게 건너뛰고 다음 기회에 들어온다.
- **회차 지속 시간**: 상한 없음. "한 회차 = 하나의 논리적 단위를 처음부터 끝까지 완료"가 원칙. 예: 아이템 배치 다이얼로그 + 해당 API 통합을 한 회차에서 함께 완성하는 것이 자르는 것보다 나으면 시간 무제한으로 간다.
- **논리 단위 정의**: 아래 중 하나.
  - 페이지 1개의 디자인 포팅 + 관련 API 연동 전부
  - 공용 자산(아이콘/store/lib) 1개 완성
  - fallback 태스크 1개 스코프 전부
- **예외 (중간 체크포인트 허용)**: 한 회차에서 **독립적으로 빌드 가능한 여러 commit** 을 남겨도 된다. 예: `feat(icons): port Jamjar` 커밋 후 이어서 `feat(index): use Jamjar icon` 커밋. 각 커밋이 빌드를 통과해야 한다. push 는 회차 끝에 한 번에.
- **종료 조건 재확인**: 매 커밋 직전에 KST 가 `2026-04-10 22:00` 을 넘었는지 재확인. 넘었으면 현재까지의 변경만 커밋 후 "loop time window ended" 출력하고 종료.
- **WIP 커밋 금지**: 과거 정책에 있던 `wip(...): partial` 커밋은 더 이상 쓰지 않는다. 회차 끝에 남는 것은 항상 "빌드 통과 + 하나의 논리 단위 완료" 상태여야 한다. 그 안에 도달하지 못하면 `git reset --hard HEAD` 로 전부 버리고 다음 회차가 원점에서 다시 시도한다.

## 마지막 한 줄

"디자인 반영 하면서 API 연동도 함께" — 한 회차가 끝날 때 mock이 남아 있으면 그 회차는 실패다.
