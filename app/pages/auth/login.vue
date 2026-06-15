<template>
  <div class="min-h-screen bg-riso-cream flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <!-- Glass jar container -->
      <div class="relative">
        <!-- Jar lid -->
        <div class="mx-auto w-32 h-5 bg-riso-walnut/30 rounded-t-lg border-2 border-riso-walnut/20" />
        <div class="mx-auto w-40 h-3 bg-riso-walnut/20 rounded-b-sm -mt-px" />

        <!-- Jar body -->
        <div
          class="relative mx-auto w-full bg-white/30 backdrop-blur-md border-2 border-white/50 rounded-[2rem] rounded-t-[1rem] px-8 pt-10 pb-10 riso-shadow"
          style="background: linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.2) 100%)"
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
              만 14세 미만 가입 차단 (정보통신망법 제50조의2 + 개인정보보호법).
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

// LEGAL-001 fix (Codex audit HIGH, 2026-05-18):
// date input 의 max 속성 — 14년 전 오늘. 브라우저 native 검증으로 만 14세 미만 자동 차단.
const maxBirthDate = computed<string>(() => {
  const today = new Date()
  const cutoff = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate())
  return cutoff.toISOString().slice(0, 10)
})

function toggleMode() {
  mode.value = mode.value === 'login' ? 'signup' : 'login'
}

/**
 * LEGAL-001 fix: 만 14세 이상 client-side 검증.
 * backend better-auth before hook 도 동일 검증 — 3중 방어.
 */
function isAtLeast14(birthDateStr: string): boolean {
  if (!birthDateStr) return false
  const dob = new Date(birthDateStr)
  if (Number.isNaN(dob.getTime())) return false
  const today = new Date()
  const cutoff = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate())
  return dob <= cutoff
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
      const { error } = await authClient.signUp.email({
        email: email.value,
        password: password.value,
        name: nickname.value,
        // better-auth 의 user create hook 이 본 field 를 받아 만 14세 미만 reject.
        // server/lib/auth.ts databaseHooks.user.create.before 참조.
        birthDate: birthDate.value,
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
