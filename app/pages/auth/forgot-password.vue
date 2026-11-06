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
        <!-- 로고 -->
        <div class="text-center mb-8">
          <div class="text-6xl mb-3"><Icon name="lucide:key-round" class="w-[1em] h-[1em]" aria-hidden="true" /></div>
          <h1 class="text-3xl font-bold tracking-tight" style="color: #5b6fa6">TERRAWORLD</h1>
        </div>

        <div class="rounded-3xl p-7 shadow-lg" style="background: rgba(255,255,255,0.75); backdrop-filter: blur(16px)">
          <h2 class="text-lg font-semibold mb-2 text-center" style="color: #5b6fa6">
            {{ t('auth.recovery.forgot.title') }}
          </h2>
          <p class="text-xs text-center mb-5" style="color: #4f659c">
            {{ t('auth.recovery.forgot.desc') }}
          </p>

          <!-- 발송 완료 -->
          <div v-if="sent" class="text-center">
            <div class="text-4xl mb-3"><Icon name="lucide:mail-check" class="w-[1em] h-[1em]" style="color: #8a9bc4" aria-hidden="true" /></div>
            <p class="text-sm leading-relaxed mb-5" style="color: #4a5580">
              {{ t('auth.recovery.forgot.sent') }}
            </p>
            <NuxtLink to="/auth/login" class="text-xs underline" style="color: #4e62bc">
              {{ t('auth.recovery.backToLogin') }}
            </NuxtLink>
          </div>

          <!-- 입력 폼 -->
          <form v-else class="flex flex-col gap-3" @submit.prevent="onSubmit">
            <div>
              <label for="fp-email" class="text-xs font-medium mb-1 block" style="color: #4f659c">
                {{ t('auth.email') }}
              </label>
              <input
                id="fp-email"
                v-model="email"
                type="email"
                inputmode="email"
                autocomplete="email"
                enterkeyhint="send"
                :placeholder="t('auth.emailPlaceholder')"
                required
                class="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all tw-field"
              >
            </div>

            <button
              type="submit"
              class="w-full rounded-xl py-3 text-sm font-semibold text-white mt-2 transition-all active:scale-95 disabled:opacity-60"
              style="background: linear-gradient(135deg, #97a8f1 0%, #c4a0f0 100%); box-shadow: 0 4px 16px rgba(151,168,241,0.4)"
              :disabled="submitting"
            >
              {{ submitting ? t('auth.recovery.forgot.sending') : t('auth.recovery.forgot.submit') }}
            </button>
          </form>

          <div v-if="!sent" class="text-center mt-5">
            <NuxtLink to="/auth/login" class="text-xs underline" style="color: #4a67b5">
              {{ t('auth.recovery.backToLogin') }}
            </NuxtLink>
          </div>
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
const toast = useToast()

const email = ref<string>('')
const submitting = ref<boolean>(false)
const sent = ref<boolean>(false)

async function onSubmit() {
  if (submitting.value) return
  submitting.value = true
  try {
    // redirectTo = 메일 링크 클릭 후 사용자가 도착할 재설정 페이지. better-auth 가 토큰을 쿼리로 붙인다.
    await authClient.requestPasswordReset({ email: email.value, redirectTo: '/auth/reset-password' })
    // 계정 열거 방지: 결과(존재/미존재)와 무관하게 항상 "보냈다"고 안내한다.
    sent.value = true
  }
  catch {
    // 네트워크 등으로 호출 자체가 실패한 경우에만 재시도 안내.
    toast.error(t('auth.recovery.forgot.error'))
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
