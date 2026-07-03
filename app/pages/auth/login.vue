<template>
  <div
    class="min-h-screen flex items-center justify-center relative overflow-hidden"
    style="background: linear-gradient(135deg, #e8f4fd 0%, #f0e8ff 40%, #ffe8f4 100%)"
  >
    <!-- 배경 장식 -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-16 left-12 text-5xl opacity-20 rotate-12">🌵</div>
      <div class="absolute top-32 right-16 text-4xl opacity-20 -rotate-6">🌸</div>
      <div class="absolute bottom-24 left-20 text-4xl opacity-20 rotate-6">🐱</div>
      <div class="absolute bottom-16 right-12 text-5xl opacity-20 -rotate-12">🌈</div>
      <div class="absolute top-1/2 left-6 text-3xl opacity-15">🍄</div>
      <div class="absolute top-1/4 right-6 text-3xl opacity-15">🐶</div>
    </div>

    <div class="w-full max-w-sm mx-4 relative z-10">
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
              v-model="email"
              type="email"
              :placeholder="t('auth.emailPlaceholder')"
              required
              class="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all tw-field"
              @focus="onFieldFocus"
              @blur="onFieldBlur"
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
              :placeholder="t('auth.passwordPlaceholder')"
              required
              class="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all tw-field"
              @focus="onFieldFocus"
              @blur="onFieldBlur"
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
              <NuxtLink to="/legal/terms" target="_blank" class="ml-auto shrink-0 text-[11px] underline" style="color: #97a8f1">
                {{ t('auth.consent.view') }}
              </NuxtLink>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="agreePrivacy" type="checkbox" class="w-4 h-4 rounded" style="accent-color: #97a8f1">
              <span class="text-xs" style="color: #4a5580">
                <span class="font-medium" style="color: #f092a0">[{{ t('auth.consent.required') }}]</span>
                {{ t('auth.consent.privacy') }}
              </span>
              <NuxtLink to="/legal/privacy" target="_blank" class="ml-auto shrink-0 text-[11px] underline" style="color: #97a8f1">
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
</template>

<script setup lang="ts">
import { authClient } from '~/lib/auth-client'

definePageMeta({ layout: false })

const { t } = useI18n()
const { loadJwt } = useAuth()
const toast = useToast()
const { trackLogin, trackSignup } = useGtagEvents()
const { registerPush } = useNative()

const mode = ref<'login' | 'signup'>('login')
const email = ref<string>('')
const password = ref<string>('')
const nickname = ref<string>('')
const birthDate = ref<string>('')
const submitting = ref<boolean>(false)

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
      await navigateTo('/')
    }
  }
  catch (e) {
    toast.error((e as Error).message)
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
