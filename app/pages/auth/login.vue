<template>
  <div class="min-h-screen bg-riso-cream flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <!-- Glass jar container -->
      <div class="relative">
        <!-- Jar lid -->
        <div class="mx-auto w-32 h-5 bg-riso-walnut/30 rounded-t-lg border-2 border-riso-walnut/20" />
        <div class="mx-auto w-40 h-3 bg-riso-walnut/20 rounded-b-sm -mt-px" />

        <!-- Jar body -->
        <!-- M4 (code-review): 인라인 white 그라데이션을 Tailwind gradient + dark: 변형으로 교체
             (인라인 style 은 .dark override 가 안 먹어 다크모드에서 흰 유리병이 남던 누수 차단). -->
        <div
          class="relative mx-auto w-full backdrop-blur-md border-2 border-white/50 dark:border-white/15 rounded-[2rem] rounded-t-[1rem] px-8 pt-10 pb-10 riso-shadow bg-gradient-to-br from-white/45 to-white/20 dark:from-white/10 dark:to-white/[0.04]"
        >
          <!-- Glass highlights -->
          <div class="absolute top-6 left-6 w-16 h-2 bg-white/60 rounded-full rotate-[-20deg]" />
          <div class="absolute top-12 left-4 w-8 h-1.5 bg-white/40 rounded-full rotate-[-20deg]" />

          <!-- Logo -->
          <div class="text-center mb-8">
            <div class="text-4xl mb-2">🪻</div>
            <h1 class="text-xl font-bold text-riso-dark">TerraWorld</h1>
            <p class="text-xs text-riso-dark/40 mt-1">{{ $t('auth.tagline') }}</p>
          </div>

          <!-- Form -->
          <form class="space-y-3" @submit.prevent="onSubmit">
            <!-- Signup fields (only visible in signup mode) -->
            <input
              v-if="mode === 'signup'"
              v-model="nickname"
              type="text"
              :placeholder="t('auth.nicknamePlaceholder')"
              required
              class="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl text-sm text-riso-dark placeholder-riso-dark/30 focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
            >

            <!--
              LEGAL-001 fix (Codex audit HIGH, 2026-05-18):
              만 14세 미만 가입 차단 (개인정보보호법 — 만 14세 미만 아동의 개인정보).
              date input 의 max 속성 = 14년 전 오늘 (브라우저 native 검증) + onSubmit 의 추가 검증 + backend better-auth before hook 의 최종 검증 (3중 방어).
            -->
            <input
              v-if="mode === 'signup'"
              v-model="birthDate"
              type="date"
              :max="maxBirthDate"
              :placeholder="t('auth.birthDatePlaceholder')"
              required
              :aria-label="t('auth.birthDateLabel')"
              class="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl text-sm text-riso-dark placeholder-riso-dark/30 focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
            >

            <input
              v-model="email"
              type="email"
              :placeholder="t('auth.email')"
              required
              class="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl text-sm text-riso-dark placeholder-riso-dark/30 focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
            >

            <input
              v-model="password"
              type="password"
              :placeholder="t('auth.password')"
              required
              class="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl text-sm text-riso-dark placeholder-riso-dark/30 focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
            >

            <!--
              P1-2 (PIPA 제15조): 가입 동의 분리 — 약관/필수 개인정보/선택 항목을 각각 구분 동의.
              필수(이용약관·개인정보 수집·이용) 미동의 시 가입 차단. 동의 항목·버전·시각은
              signUp payload 로 전달돼 서버에 기록(P1-3).
            -->
            <fieldset
              v-if="mode === 'signup'"
              class="rounded-xl bg-white/40 border border-white/70 p-3 space-y-2 text-left"
            >
              <legend class="sr-only">{{ t('auth.consent.legend') }}</legend>

              <!-- 전체 동의 -->
              <label class="flex items-center gap-2 cursor-pointer pb-2 border-b border-white/60">
                <input
                  type="checkbox"
                  :checked="agreeAll"
                  class="w-4 h-4 accent-riso-sage rounded"
                  @change="toggleAgreeAll(($event.target as HTMLInputElement).checked)"
                >
                <span class="text-sm font-semibold text-riso-dark">{{ t('auth.consent.agreeAll') }}</span>
              </label>

              <!-- 필수 -->
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="agreeTerms" type="checkbox" class="w-4 h-4 accent-riso-sage rounded">
                <span class="text-xs text-riso-dark">
                  <span class="text-riso-poppy font-medium">[{{ t('auth.consent.required') }}]</span>
                  {{ t('auth.consent.terms') }}
                </span>
                <NuxtLink to="/legal/terms" target="_blank" class="ml-auto shrink-0 text-[11px] text-riso-sage underline">
                  {{ t('auth.consent.view') }}
                </NuxtLink>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="agreePrivacy" type="checkbox" class="w-4 h-4 accent-riso-sage rounded">
                <span class="text-xs text-riso-dark">
                  <span class="text-riso-poppy font-medium">[{{ t('auth.consent.required') }}]</span>
                  {{ t('auth.consent.privacy') }}
                </span>
                <NuxtLink to="/legal/privacy" target="_blank" class="ml-auto shrink-0 text-[11px] text-riso-sage underline">
                  {{ t('auth.consent.view') }}
                </NuxtLink>
              </label>

              <!-- 선택 -->
              <label
                v-for="opt in optionalConsents"
                :key="opt.key"
                class="flex items-center gap-2 cursor-pointer"
              >
                <input v-model="opt.value" type="checkbox" class="w-4 h-4 accent-riso-sage rounded">
                <span class="text-xs text-riso-dark/80">
                  <span class="text-riso-dark/40 font-medium">[{{ t('auth.consent.optional') }}]</span>
                  {{ t(`auth.consent.${opt.key}`) }}
                </span>
              </label>
            </fieldset>

            <button
              type="submit"
              class="w-full py-3 bg-riso-sage text-white font-semibold rounded-xl riso-shadow-sm hover:brightness-110 active:riso-shadow-press transition disabled:opacity-50"
              :disabled="submitting"
            >
              {{ submitting ? $t('auth.submitting') : (mode === 'login' ? $t('auth.login') : $t('auth.signupAction')) }}
            </button>
          </form>

          <!-- Toggle mode -->
          <div class="mt-6 text-center">
            <button
              type="button"
              class="text-xs text-riso-dark/40 hover:text-riso-sage transition"
              @click="toggleMode"
            >
              {{ mode === 'login' ? $t('auth.noAccount') + ' ' + $t('auth.signupAction') : $t('auth.hasAccount') + ' ' + $t('auth.login') }}
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
