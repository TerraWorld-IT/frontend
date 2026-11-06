# 계정 복구 (비밀번호 재설정 + 이메일 찾기)

브랜치 `feat/account-recovery`. 로그인 아이디가 곧 이메일인 구조라, 두 가지를 추가했다.

1. **비밀번호 재설정** — better-auth 네이티브 `forgetPassword`/`resetPassword` + Resend 메일 발송
2. **이메일(계정) 찾기** — 닉네임 + 생년월일로 가입 이메일을 마스킹해 안내

## 추가/변경 파일

| 파일 | 내용 |
|---|---|
| `server/lib/email.ts` | Resend 메일 발송(의존성 없이 HTTP API 직접 호출). 키 없으면 콘솔 폴백, 실패해도 throw 안 함 |
| `server/lib/authDb.ts` | 이메일 찾기용 auth DB 읽기 전용 풀(lazy, max 3) |
| `server/api/account-recovery/find-email.post.ts` | 닉네임+생년월일 정확일치 → 마스킹 이메일. IP 레이트리밋(시간당 5회) |
| `server/lib/auth.ts` | `emailAndPassword.sendResetPassword` + `resetPasswordTokenExpiresIn: 3600` 추가 |
| `app/pages/auth/forgot-password.vue` | 이메일 입력 → 재설정 링크 발송 |
| `app/pages/auth/reset-password.vue` | 메일 링크 착지 페이지. 새 비밀번호 설정 |
| `app/pages/auth/find-email.vue` | 닉네임+생년월일 → 마스킹 이메일 |
| `app/middleware/auth.ts` | 새 3개 라우트를 public allowlist 에 추가 |
| `app/pages/auth/login.vue` | 로그인 폼 아래 "비밀번호를 잊으셨나요? · 이메일(계정) 찾기" 링크 |
| `i18n/locales/{ko,en}.json` | `auth.recovery.*` 문구 |

## 흐름

**비밀번호 재설정**
1. 로그인 → "비밀번호를 잊으셨나요?" → `/auth/forgot-password`
2. 이메일 입력 → `authClient.forgetPassword({ email, redirectTo: '/auth/reset-password' })`
3. better-auth 가 토큰 발급 → `sendResetPassword` → Resend 로 메일
4. 메일 링크 클릭 → better-auth 검증 엔드포인트 → `/auth/reset-password?token=...` 리다이렉트
5. 새 비밀번호 입력 → `authClient.resetPassword({ newPassword, token })` → 완료

**이메일 찾기**: `/auth/find-email` → 닉네임+생년월일 → 서버가 `"user"` 테이블 정확일치 조회 → `ja***@gm***.com` 형태로 안내

## 🙋 사람이 해야 할 일 (NEEDS-USER)

> 아래 키/자격증명은 **agent-bus 에 올리지 말 것.** 윈도우 세션/배포 환경변수로 직접 주입.

1. **Resend 계정 + API 키 발급** → https://resend.com
2. **발신 도메인 인증** — Resend 대시보드에서 발신 도메인(예: `terraworld.web-qplay.kr`) DNS(SPF/DKIM) 등록·검증. 검증 안 되면 메일이 안 나간다.
3. **환경변수 주입** (프론트 컨테이너 / `.env`):
   - `RESEND_API_KEY=re_...`
   - `MAIL_FROM="TerraWorld <noreply@terraworld.web-qplay.kr>"`  ← 인증된 도메인 주소
   - `BETTER_AUTH_URL` / `NUXT_PUBLIC_AUTH_BASE_URL` 가 **공개 도메인**인지 확인(메일 링크가 그 origin 으로 생성됨). 프로덕션 로그인이 이미 동작하므로 보통 설정돼 있음.
4. **DB 마이그레이션 불필요** — 이메일 찾기는 기존 `"user"`(name, email, "birthDate") 컬럼만 읽는다.
5. **배포 전 확인 사항**
   - 레이트리밋이 in-memory 라 프론트 컨테이너 **단일 replica** 전제(auth.ts rateLimit 주석과 동일 가정). replica 를 늘리면 find-email 리밋을 공유 스토리지로 옮겨야 한다.
   - 키 없이 배포하면 재설정 메일이 **발송되지 않고 콘솔에만** 찍힌다(흐름은 깨지지 않음).

## 로컬 테스트 (키 없이)

1. `pnpm dev` (또는 기존 dev 명령)
2. `/auth/forgot-password` 에서 가입된 이메일 입력
3. 서버 콘솔의 `[email:dev]` 로그에서 재설정 링크 복사 → 브라우저로 접속 → 새 비밀번호 설정
4. `/auth/find-email` 에서 그 계정의 닉네임+생년월일 입력 → 마스킹 이메일 확인

## 보안 메모

- `forgetPassword` 는 계정 존재 여부와 무관하게 항상 "보냈다"로 응답(열거 방지). 메일 발송 실패도 throw 안 함.
- `find-email` 은 본질적으로 열거 표면 → 정확일치 1건만 응답 + 전체 이메일 미노출(마스킹) + IP 레이트리밋 + 다건일치 시 고객센터 안내로 수렴.
