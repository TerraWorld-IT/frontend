<template>
  <div
    class="h-dvh w-full relative overflow-hidden"
    style="background: linear-gradient(135deg, #e8f4fd 0%, #f0e8ff 40%, #ffe8f4 100%)"
  >
    <div
      class="apjek-page-scroll h-full w-full flex items-start justify-center overflow-y-auto"
      style="padding-left: var(--sal); padding-right: var(--sar); padding-top: max(1.5rem, var(--sat)); padding-bottom: max(1.5rem, var(--sab))"
    >
      <div class="w-full max-w-sm mx-4 relative z-10 my-auto">
        <div class="text-center mb-8">
          <div class="text-6xl mb-3"><Icon name="lucide:lock-keyhole" class="w-[1em] h-[1em]" aria-hidden="true" /></div>
          <h1 class="text-3xl font-bold tracking-tight" style="color: #5b6fa6">TERRAWORLD</h1>
        </div>

        <div class="rounded-3xl p-7 shadow-lg" style="background: rgba(255,255,255,0.75); backdrop-filter: blur(16px)">
          <!-- 토큰 없음/무효 -->
          <div v-if="tokenError" class="text-center">
            <div class="text-4xl mb-3"><Icon name="lucide:link-2-off" class="w-[1em] h-[1em]" style="color: #c2410c" aria-hidden="true" /></div>
            <p class="text-sm leading-relaxed mb-5" style="color: #4a5580">
              {{ t(missingToken ? 'auth.recovery.reset.missingToken' : 'auth.recovery.reset.invalidToken') }}
            </p>
            <NuxtLink to="/auth/forgot-password" class="inline-block rounded-xl py-3 px-6 text-sm font-semibold text-white transition-all active:scale-95" style="background: linear-gradient(135deg, #97a8f1 0%, #c4a0f0 100%)">
              {{ t('auth.recovery.reset.requestAgain') }}
            </NuxtLink>
          </div>

          <!-- 완료 -->
          <div v-else-if="done" class="text-center">
            <div class="text-4xl mb-3"><Icon name="lucide:check-circle-2" class="w-[1em] h-[1em]" style="color: #4a9b7f" aria-hidden="true" /></div>
            <p class="text-sm leading-relaxed mb-5" style="color: #4a5580">
              {{ t('auth.recovery.reset.success') }}
            </p>
            <NuxtLink to="/auth/login" class="inline-block rounded-xl py-3 px-6 text-sm font-semibold text-white transition-all active:scale-95" style="background: linear-gradient(135deg, #97a8f1 0%, #c4a0f0 100%)">
              {{ t('auth.login') }}
            </NuxtLink>
          </div>

          <!-- 새 비밀번호 입력 -->
          <template v-else>
            <h2 class="text-lg font-semibold mb-2 text-center" style="color: #5b6fa6">
              {{ t('auth.recovery.reset.title') }}
            </h2>
            <p class="text-xs text-center mb-5" style="color: #4f659c">
              {{ t('auth.recovery.reset.desc') }}
            </p>

            <form class="flex flex-col gap-3" @submit.prevent="onSubmit">
              <div>
                <label for="rp-pw" class="text-xs font-medium mb-1 block" style="color: #4f659c">
                  {{ t('auth.recovery.reset.newPassword') }}
                </label>
                <input
                  id="rp-pw"
                  v-model="password"
                  type="password"
                  autocomplete="new-password"
                  :placeholder="t('auth.recovery.reset.newPasswordPlaceholder')"
                  required
                  minlength="8"
                  class="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all tw-field"
                >
              </div>
              <div>
                <label for="rp-pw2" class="text-xs font-medium mb-1 block" style="color: #4f659c">
                  {{ t('auth.recovery.reset.confirmPassword') }}
                </label>
                <input
                  id="rp-pw2"
                  v-model="confirm"
                  type="password"
                  autocomplete="new-password"
                  :placeholder="t('auth.recovery.reset.confirmPasswordPlaceholder')"
                  required
                  minlength="8"
                  class="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all tw-field"
                >
              </div>

              <button
                type="submit"
                class="w-full rounded-xl py-3 text-sm font-semibold text-white mt-2 transition-all active:scale-95 disabled:opacity-60"
                style="background: linear-gradient(135deg, #97a8f1 0%, #c4a0f0 100%); box-shadow: 0 4px 16px rgba(151,168,241,0.4)"
                :disabled="submitting"
              >
                {{ submitting ? t('auth.recovery.reset.submitting') : t('auth.recovery.reset.submit') }}
              </button>
            </form>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { authClient } from '~/lib/auth-client'

definePageMeta({ layout: false })
useHead({ htmlAttrs: { style: '--apjek-scrim: #e8f4fd; --apjek-scrim-bottom: #ffe8f4' } })

const { t } = useI18n()
const route = useRoute()
const toast = useToast()

// better-auth 검증 엔드포인트가 callbackURL 로 리다이렉트하며 ?token= 또는 ?error= 를 붙인다.
const token = computed<string>(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const hasQueryError = computed<boolean>(() => typeof route.query.error === 'string' && route.query.error.length > 0)
const missingToken = computed<boolean>(() => !token.value && !hasQueryError.value)
const tokenError = computed<boolean>(() => hasQueryError.value || missingToken.value)

const password = ref<string>('')
const confirm = ref<string>('')
const submitting = ref<boolean>(false)
const done = ref<boolean>(false)

async function onSubmit() {
  if (submitting.value) return
  if (password.value.length < 8) {
    toast.error(t('auth.errorCode.PASSWORD_TOO_SHORT'))
    return
  }
  if (password.value !== confirm.value) {
    toast.error(t('auth.recovery.reset.mismatch'))
    return
  }
  submitting.value = true
  try {
    const { error } = await authClient.resetPassword({ newPassword: password.value, token: token.value })
    if (error) {
      // 만료/무효 토큰 등 — 재요청 안내로 수렴.
      toast.error(t('auth.recovery.reset.invalidToken'))
      return
    }
    done.value = true
  }
  catch {
    toast.error(t('auth.recovery.reset.invalidToken'))
  }
  finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.tw-field {
  background: rgba(240, 236, 255, 0.6);
  border: 1.5px solid rgba(151, 168, 241, 0.3);
  color: #4a5580;
}
.tw-field::placeholder {
  color: #4a67b5;
}
.tw-field:focus {
  border-color: rgba(151, 168, 241, 0.9);
}
</style>
