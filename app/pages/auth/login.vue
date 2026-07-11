<template>
  <div
    class="h-dvh w-full relative overflow-hidden"
    style="background: linear-gradient(135deg, #e8f4fd 0%, #f0e8ff 40%, #ffe8f4 100%)"
  >
    <!-- 콜드 스타트 세션 확인 베일.
         네이티브 셸의 첫 top-level 네비게이션에 세션 쿠키가 안 실려(SameSite 또는 WebView 특성)
         SSR 이 이 로그인 페이지를 렌더하지만, 같은 출처 XHR(getSession)에는 쿠키가 실린다.
         그 확인이 끝날 때까지 폼을 가려, "로그인 폼이 떴다가 대시보드로 튀는" 깜빡임을 없앤다.
         `checkingSession` 은 false 로 시작하므로 SSR 출력엔 베일이 없다 → 하이드레이션 미스매치 없음.
         onMounted 가 클라이언트에서만 true 로 올린 뒤 세션을 묻는다. -->
    <div
      v-if="checkingSession"
      class="absolute inset-0 z-50 flex items-center justify-center"
      style="background: linear-gradient(135deg, #e8f4fd 0%, #f0e8ff 40%, #ffe8f4 100%)"
      role="status"
      aria-live="polite"
      aria-label="세션 확인 중"
    >
      <div class="w-9 h-9 rounded-full border-[3px] border-[#c3aed6]/30 border-t-[#8a9bc4] animate-spin" />
    </div>

    <!-- 배경 장식 -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-16 left-12 text-5xl opacity-20 rotate-12">🌵</div>
      <div class="absolute top-32 right-16 text-4xl opacity-20 -rotate-6">🌸</div>
      <div class="absolute bottom-24 left-20 text-4xl opacity-20 rotate-6">🐱</div>
      <div class="absolute bottom-16 right-12 text-5xl opacity-20 -rotate-12">🌈</div>
      <div class="absolute top-1/2 left-6 text-3xl opacity-15">🍄</div>
      <div class="absolute top-1/4 right-6 text-3xl opacity-15">🐶</div>
    </div>

    <!--
      h-dvh(고정 높이) 컨테이너 안에서 실제 로그인/가입 폼만 자체 스크롤 영역으로 분리.
      가입 모드(닉네임+생년월일+동의 5종)는 작은 화면에서 뷰포트보다 콘텐츠가 길어질 수 있는데,
      이전엔 바깥 div가 min-h-screen(하한만 있고 상한 없음)이라 그대로 늘어나며 body 전체가
      스크롤돼 iOS에서 화면 전체가 밀리는 오류가 있었다(default.vue 의 <main overflow-y-auto>
      패턴과 동일하게 스크롤 영역을 명시적으로 감싼다).

      items-start + 자식의 my-auto = "safe centering" (Codex 감사 지적): overflow-y-auto 컨테이너에
      items-center(unsafe alignment)를 그대로 쓰면 콘텐츠가 컨테이너보다 클 때 상단이 음수 방향으로
      밀려 스크롤해도 닿을 수 없어진다. 콘텐츠가 짧을 땐 my-auto 가 기존과 동일하게 중앙 정렬한다.
    -->
    <!-- layout:false 라 default.vue 의 세이프에어리어 패딩을 상속받지 못한다. 네이티브 셸이
         contentInset:'never' 로 뷰포트를 노치까지 확장하므로 여기서 직접 처리해야 한다.
         legal/*.vue 는 calc(32px + env(...)) 를 쓰지만 여기서는 max() 를 쓴다 — 현재 배포된 앱은
         아직 contentInset:'always' 라, calc 면 네이티브 인셋 위에 패딩이 더해져 이중이 된다.
         max() 는 두 경우 모두 안전하다(env 가 0 이면 기존 24px 유지). -->
    <div
      class="h-full w-full flex items-start justify-center overflow-y-auto"
      style="padding-top: max(1.5rem, env(safe-area-inset-top, 0px)); padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 0px))"
    >
    <div class="w-full max-w-sm mx-4 relative z-10 my-auto">
      <!-- 로고 영역 -->
      <div class="text-center mb-8">
        <div class="text-6xl mb-3">🌍</div>
        <h1 class="text-3xl font-bold tracking-tight" style="color: #5b6fa6">
          TERRAWORLD
        </h1>
        <p class="text-sm mt-1" style="color: #8a9bc4">
          {{ $t('auth.tagline') }}
        </p>
      </div>

      <!-- 로그인 / 회원가입 폼 -->
      <div
        class="rounded-3xl p-7 shadow-lg"
        style="background: rgba(255,255,255,0.75); backdrop-filter: blur(16px)"
      >
        <h2 class="text-lg font-semibold mb-5 text-center" style="color: #5b6fa6">
          {{ mode === 'login' ? $t('auth.login') : $t('auth.signup') }}
        </h2>

        <form class="flex flex-col gap-3" @submit.prevent="onSubmit">
          <!-- 닉네임 (가입 전용) -->
          <div v-if="mode === 'signup'">
            <label class="text-xs font-medium mb-1 block" style="color: #8a9bc4">
              {{ $t('auth.nicknamePlaceholder') }}
            </label>
            <input
              v-model="nickname"
              type="text"
              autocomplete="nickname"
              :placeholder="t('auth.nicknamePlaceholder')"
              required
              maxlength="50"
              class="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all tw-field"
              @focus="onFieldFocus"
              @blur="onFieldBlur"
            >
          </div>

          <!--
            LEGAL-001 fix (Codex audit HIGH, 2026-05-18):
            만 14세 미만 가입 차단 (개인정보보호법 — 만 14세 미만 아동의 개인정보).
            date input 의 max 속성 = 14년 전 오늘 (브라우저 native 검증) + onSubmit 의 추가 검증 +
            backend better-auth before hook 의 최종 검증 (3중 방어).
          -->
          <div v-if="mode === 'signup'">
            <label class="text-xs font-medium mb-1 block" style="color: #8a9bc4">
              {{ $t('auth.birthDateLabel') }}
            </label>
            <input
              v-model="birthDate"
              type="date"
              autocomplete="bday"
              :max="maxBirthDate"
              :placeholder="t('auth.birthDatePlaceholder')"
              required
              :aria-label="t('auth.birthDateLabel')"
              class="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all tw-field"
              @focus="onFieldFocus"
              @blur="onFieldBlur"
            >
          </div>

          <!-- 이메일 -->
          <div>
            <label class="text-xs font-medium mb-1 block" style="color: #8a9bc4">
              {{ $t('auth.email') }}
            </label>
            <input
              ref="emailInput"
              v-model="email"
              type="email"
              autocomplete="email"
              :placeholder="t('auth.emailPlaceholder')"
              required
              :aria-invalid="formError"
              class="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all tw-field"
              @focus="onFieldFocus"
              @blur="onFieldBlur"
              @input="formError = false"
            >
          </div>

          <!-- 비밀번호 -->
          <div>
            <label class="text-xs font-medium mb-1 block" style="color: #8a9bc4">
              {{ $t('auth.password') }}
            </label>
            <input
              v-model="password"
              type="password"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
              :placeholder="t('auth.passwordPlaceholder')"
              required
              :aria-invalid="formError"
              class="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all tw-field"
              @focus="onFieldFocus"
              @blur="onFieldBlur"
              @input="formError = false"
            >
          </div>

          <!--
            P1-2 (PIPA 제15조): 가입 동의 분리 — 약관/필수 개인정보/선택 항목을 각각 구분 동의.
            필수(이용약관·개인정보 수집·이용) 미동의 시 가입 차단. 동의 항목·버전·시각은
            signUp payload 로 전달돼 서버에 기록(P1-3).
          -->
          <fieldset
            v-if="mode === 'signup'"
            class="rounded-xl p-3 space-y-2 text-left"
            style="background: rgba(240,236,255,0.6); border: 1.5px solid rgba(151,168,241,0.3)"
          >
            <legend class="sr-only">{{ t('auth.consent.legend') }}</legend>

            <!-- 전체 동의 -->
            <label
              class="flex items-center gap-2 cursor-pointer pb-2 border-b"
              style="border-color: rgba(151,168,241,0.25)"
            >
              <input
                type="checkbox"
                :checked="agreeAll"
                class="w-4 h-4 rounded"
                style="accent-color: #97a8f1"
                @change="toggleAgreeAll(($event.target as HTMLInputElement).checked)"
              >
              <span class="text-sm font-semibold" style="color: #4a5580">{{ t('auth.consent.agreeAll') }}</span>
            </label>

            <!-- 필수 -->
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="agreeTerms" type="checkbox" class="w-4 h-4 rounded" style="accent-color: #97a8f1">
              <span class="text-xs" style="color: #4a5580">
                <span class="font-medium" style="color: #f092a0">[{{ t('auth.consent.required') }}]</span>
                {{ t('auth.consent.terms') }}
              </span>
              <NuxtLink to="/legal/terms" class="ml-auto shrink-0 text-[11px] underline" style="color: #97a8f1">
                {{ t('auth.consent.view') }}
              </NuxtLink>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="agreePrivacy" type="checkbox" class="w-4 h-4 rounded" style="accent-color: #97a8f1">
              <span class="text-xs" style="color: #4a5580">
                <span class="font-medium" style="color: #f092a0">[{{ t('auth.consent.required') }}]</span>
                {{ t('auth.consent.privacy') }}
              </span>
              <NuxtLink to="/legal/privacy" class="ml-auto shrink-0 text-[11px] underline" style="color: #97a8f1">
                {{ t('auth.consent.view') }}
              </NuxtLink>
            </label>

            <!-- 선택 -->
            <label
              v-for="opt in optionalConsents"
              :key="opt.key"
              class="flex items-center gap-2 cursor-pointer"
            >
              <input v-model="opt.value" type="checkbox" class="w-4 h-4 rounded" style="accent-color: #97a8f1">
              <span class="text-xs" style="color: #7683a8">
                <span class="font-medium" style="color: #a0afd8">[{{ t('auth.consent.optional') }}]</span>
                {{ t(`auth.consent.${opt.key}`) }}
              </span>
            </label>
          </fieldset>

          <button
            type="submit"
            class="w-full rounded-xl py-3 text-sm font-semibold text-white mt-2 transition-all active:scale-95 disabled:opacity-60"
            :style="submitButtonStyle"
            :disabled="submitting"
          >
            {{ submitting ? $t('auth.submitting') : (mode === 'login' ? $t('auth.login') : $t('auth.signupAction')) }}
          </button>
        </form>

        <!-- 모드 전환 -->
        <div class="text-center mt-5">
          <button
            type="button"
            class="text-xs transition-all hover:opacity-70"
            style="color: #a0afd8"
            @click="toggleMode"
          >
            <template v-if="mode === 'login'">
              {{ $t('auth.noAccount') }}
              <span class="font-semibold underline underline-offset-2" style="color: #97a8f1">{{ $t('auth.signupAction') }}</span>
            </template>
            <template v-else>
              {{ $t('auth.hasAccount') }}
              <span class="font-semibold underline underline-offset-2" style="color: #97a8f1">{{ $t('auth.login') }}</span>
            </template>
          </button>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { authClient } from '~/lib/auth-client'

definePageMeta({ layout: false })

const { t } = useI18n()
const { loadJwt } = useAuth()
const toast = useToast()
const { trackLogin, trackSignup } = useGtagEvents()
const { registerPush } = useNative()

/**
 * 콜드 스타트 세션 복구.
 *
 * `middleware/auth.ts` 의 SSR 분기는 요청 헤더에 세션 쿠키가 없으면 바로 여기로 보낸다.
 * 그런데 네이티브 WebView 의 **첫** top-level 네비게이션에는 쿠키가 실리지 않을 수 있다
 * (`server/lib/auth.ts` 의 bearer 플러그인 주석이 "clients that cannot use cookies
 * (Capacitor WebView on iOS)" 라고 적어 둔 바로 그 상황). 그러면 7일짜리 세션이 멀쩡한데도
 * 앱을 켤 때마다 로그인 화면에 갇힌다.
 *
 * 같은 출처로 나가는 XHR 에는 쿠키가 정상적으로 실리므로, 마운트 직후 세션을 한 번 물어보고
 * 살아 있으면 원래 가려던 곳으로 되돌린다. 세션이 진짜 없으면 폼이 그대로 남는다.
 *
 * 확인이 끝날 때까지 `checkingSession` 베일로 폼을 가린다(위 템플릿). false 로 시작하므로
 * SSR 출력엔 베일이 없어 하이드레이션 미스매치가 없고, onMounted 가 클라이언트에서만 켠다.
 * 이렇게 해야 "로그인 폼이 잠깐 떴다가 대시보드로 튀는" 깜빡임이 사라진다.
 */
// half-open 모바일 연결에서 getSession 이 영영 안 끝나면 베일이 안 걷혀 로그인 폼에 갇힌다.
// middleware/auth.ts 와 같은 5초 fail-open 타임아웃을 건다. 데드라인 초과 시 withTimeout 이
// ac.abort() 로 원본 요청을 취소하고, race 는 자기 Error('deadline exceeded')로 reject 한다
// (underlying fetch 의 AbortError 가 아니라 이 Error 가 catch 로 온다) → 아래 catch 가 fail-open.
const SESSION_CHECK_TIMEOUT_MS = 5_000
const router = useRouter()
const checkingSession = ref<boolean>(false)
onMounted(async () => {
  checkingSession.value = true
  // 데드라인에 요청 자체를 abort 하려고 자체 AbortController 를 쓴다. better-fetch 는 외부
  // signal 이 있으면 자기 timeout 타이머를 안 걸고 이 signal 로 헤더·본문 전 구간을 통제한다.
  const ac = new AbortController()
  try {
    // withTimeout 이 body stall 까지 포함한 5초 데드라인을 강제하고, 초과 시 ac.abort() 로
    // 원본 요청을 취소한다(그러지 않으면 stalled 요청이 orphan 으로 남는다 — Codex 감사).
    const { data } = await withTimeout(
      authClient.getSession({ fetchOptions: { signal: ac.signal } }),
      SESSION_CHECK_TIMEOUT_MS,
      ac,
    )
    // 세션이 있으면 베일을 유지한 채로 홈으로 간다 — 폼이 한 프레임도 노출되지 않는다.
    if (data) {
      await navigateTo('/', { replace: true })
      // navigateTo 반환값으로 "떠났는지"를 판정하면 안 된다(리다이렉트 체인이 성공으로 보고됨).
      // 페이지에 주입된 useRoute() 도 떠나는 컴포넌트에선 stale 할 수 있다. 그래서 **전역 라우터**
      // 의 최종 경로를 보고, trailing slash 를 정규화해 비교한다. 여전히 로그인이면(= `/`
      // 미들웨어가 되돌려보냄) 아래로 떨어져 베일을 걷고, 실제로 떠났으면 이 컴포넌트는 언마운트된다.
      const finalPath = router.currentRoute.value.path.replace(/\/+$/, '') || '/'
      if (finalPath !== '/auth/login') return
    }
  }
  catch {
    // 세션 확인 실패(네트워크/타임아웃)는 로그인 페이지에서 fail-open 이 맞다 — 폼을 그대로 보여준다.
  }
  // 세션이 없거나 / 확인 실패 / 홈 이동이 되돌려진 경우 베일을 걷어 폼을 드러낸다.
  checkingSession.value = false
})

const mode = ref<'login' | 'signup'>('login')
const email = ref<string>('')
const password = ref<string>('')
const nickname = ref<string>('')
const birthDate = ref<string>('')
const submitting = ref<boolean>(false)
// better-auth 에러는 필드 단위 세분화가 없어(예: "잘못된 이메일 또는 비밀번호") 어느 input 이
// 원인인지 구분 못 함 — 로그인/가입 공통 원인 필드(email/password)를 invalid 로 표시하고
// 첫 필드로 focus 이동해 스크린리더/키보드 사용자가 토스트 메시지 읽고 수동으로 탭백 안 해도
// 되게 한다(Codex 감사 지적).
const formError = ref<boolean>(false)
const emailInput = ref<HTMLInputElement | null>(null)

// P1-2 (PIPA 제15조): 분리 동의 상태. 필수(약관·개인정보) + 선택 5종.
// 동의 버전 — privacy.md/terms.md 갱신 시 함께 올려 동의 이력의 정책 버전을 식별.
const CONSENT_VERSION = '2026-06-23'
const agreeTerms = ref<boolean>(false)
const agreePrivacy = ref<boolean>(false)
const optionalConsents = ref<Array<{ key: string; value: boolean }>>([
  { key: 'photo', value: false },
  { key: 'push', value: false },
  { key: 'adId', value: false },
  { key: 'analytics', value: false },
  { key: 'marketing', value: false },
])

// 전체동의 = 필수 2 + 선택 전부 체크 여부 (반응형 — 개별 변경 시 자동 반영)
const agreeAll = computed<boolean>(
  () => agreeTerms.value && agreePrivacy.value && optionalConsents.value.every((o) => o.value),
)

// TW2 제출 버튼 그라데이션 — 로그인은 블루→퍼플, 가입은 핑크→퍼플.
const submitButtonStyle = computed<Record<string, string>>(() =>
  mode.value === 'login'
    ? {
        background: 'linear-gradient(135deg, #97a8f1 0%, #c4a0f0 100%)',
        boxShadow: '0 4px 16px rgba(151,168,241,0.4)',
      }
    : {
        background: 'linear-gradient(135deg, #f092f0 0%, #c4a0f0 100%)',
        boxShadow: '0 4px 16px rgba(240,146,240,0.35)',
      },
)

// TW2 input focus/blur border 색 전환 (인라인 style 재현).
function onFieldFocus(e: FocusEvent) {
  ;(e.target as HTMLInputElement).style.borderColor = '#97a8f1'
}
function onFieldBlur(e: FocusEvent) {
  ;(e.target as HTMLInputElement).style.borderColor = 'rgba(151,168,241,0.3)'
}

function toggleAgreeAll(checked: boolean) {
  agreeTerms.value = checked
  agreePrivacy.value = checked
  optionalConsents.value.forEach((o) => {
    o.value = checked
  })
}

function consentValue(key: string): boolean {
  return optionalConsents.value.find((o) => o.key === key)?.value ?? false
}

// LEGAL-001 fix (Codex audit HIGH, 2026-05-18):
// date input 의 max 속성 — 14년 전 오늘. 브라우저 native 검증으로 만 14세 미만 자동 차단.
const maxBirthDate = computed<string>(() => {
  const today = new Date()
  // M6 (code-review): 로컬 날짜를 직접 YYYY-MM-DD 로 조립 — toISOString() 의 UTC 변환으로 인한
  // ±1일 시프트(로컬 자정 → UTC 날짜) 방지.
  return `${today.getFullYear() - 14}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
})

function toggleMode() {
  // signup 전용 필드(닉네임/생년월일/동의)가 포커스를 유지한 채 mode 전환으로 즉시
  // 사라지면 키보드가 안 닫힐 수 있음 (utils/keyboard.ts 참조).
  void dismissKeyboard()
  mode.value = mode.value === 'login' ? 'signup' : 'login'
}

/**
 * LEGAL-001 fix: 만 14세 이상 client-side 검증.
 * backend better-auth before hook 도 동일 검증 — 3중 방어.
 */
function isAtLeast14(birthDateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateStr)) return false
  // M6 (code-review): YYYY-MM-DD 문자열 사전식 비교(=달력일 비교)로 UTC parse vs local cutoff
  // 불일치(±1일 오판) 제거. 서버 auth.ts before hook 과 동일 로직.
  const today = new Date()
  const cutoff = `${today.getFullYear() - 14}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return birthDateStr <= cutoff
}

async function onSubmit() {
  if (submitting.value) return
  submitting.value = true
  try {
    if (mode.value === 'login') {
      const { error } = await authClient.signIn.email({
        email: email.value,
        password: password.value,
      })
      if (error) throw new Error(error.message ?? t('auth.loginFailed'))

      const token = await loadJwt()
      if (!token) throw new Error(t('auth.tokenError'))

      trackLogin('email')
      // FCM: 로그인 직후 디바이스 토큰 등록 재시도. 부팅 시 미로그인이라 401 났던 토큰을
      // 인증 상태에서 재등록 (native 전용 — 웹/iOS sim 은 no-op). 네비게이션 차단 방지 위해 fire-and-forget.
      void registerPush().catch(() => {})
      toast.success(t('auth.welcomeBack'))
      // 로그인 폼 전체가 페이지 이동으로 언마운트되기 전 키보드 해제 (utils/keyboard.ts 참조).
      void dismissKeyboard()
      await navigateTo('/')
    }
    else {
      // LEGAL-001 fix (Codex audit HIGH, 2026-05-18): 만 14세 미만 가입 차단.
      if (!isAtLeast14(birthDate.value)) {
        throw new Error(t('auth.underageError'))
      }
      // P1-2 (PIPA 제15조): 필수 동의(이용약관·개인정보 수집·이용) 미체크 시 가입 차단.
      if (!agreeTerms.value || !agreePrivacy.value) {
        throw new Error(t('auth.consent.requiredError'))
      }
      const { error } = await authClient.signUp.email({
        email: email.value,
        password: password.value,
        name: nickname.value,
        // better-auth 의 user create hook 이 본 field 를 받아 만 14세 미만 reject.
        // server/lib/auth.ts databaseHooks.user.create.before 참조.
        birthDate: birthDate.value,
        // P1-2/P1-3: 동의 항목·버전·시각 — server better-auth additionalFields 로 기록.
        agreeTerms: agreeTerms.value,
        agreePrivacy: agreePrivacy.value,
        marketingConsent: consentValue('marketing'),
        analyticsConsent: consentValue('analytics'),
        adConsent: consentValue('adId'),
        photoConsent: consentValue('photo'),
        pushConsent: consentValue('push'),
        consentVersion: CONSENT_VERSION,
        consentedAt: new Date().toISOString(),
      } as Parameters<typeof authClient.signUp.email>[0])
      if (error) throw new Error(error.message ?? t('auth.signupFailed'))

      // better-auth signs the user in automatically after signUp.email.
      // Pull the JWT immediately so the next API call has a bearer token.
      const token = await loadJwt()
      if (!token) throw new Error(t('auth.tokenError'))

      trackSignup('email')
      // FCM: 가입 직후 디바이스 토큰 등록 (위 로그인 분기와 동일 — fire-and-forget, native 전용).
      void registerPush().catch(() => {})
      toast.success(t('auth.signupSuccess'))
      void dismissKeyboard()
      await navigateTo('/')
    }
  }
  catch (e) {
    toast.error((e as Error).message)
    formError.value = true
    await nextTick()
    emailInput.value?.focus()
  }
  finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* TW2 Login.tsx input 스타일 재현 (rgba lavender bg + 1.5px border + #4a5580 텍스트).
   date input 등 여러 필드에 공통 적용하기 위해 scoped 클래스로 추출. */
.tw-field {
  background: rgba(240, 236, 255, 0.6);
  border: 1.5px solid rgba(151, 168, 241, 0.3);
  color: #4a5580;
}
.tw-field::placeholder {
  color: #a0afd8;
}
</style>
