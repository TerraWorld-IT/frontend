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
          <div class="text-6xl mb-3"><Icon name="lucide:at-sign" class="w-[1em] h-[1em]" aria-hidden="true" /></div>
          <h1 class="text-3xl font-bold tracking-tight" style="color: #5b6fa6">TERRAWORLD</h1>
        </div>

        <div class="rounded-3xl p-7 shadow-lg" style="background: rgba(255,255,255,0.75); backdrop-filter: blur(16px)">
          <h2 class="text-lg font-semibold mb-2 text-center" style="color: #5b6fa6">
            {{ t('auth.recovery.findEmail.title') }}
          </h2>
          <p class="text-xs text-center mb-5" style="color: #4f659c">
            {{ t('auth.recovery.findEmail.desc') }}
          </p>

          <!-- 찾기 성공: 마스킹된 이메일 -->
          <div v-if="foundEmail" class="text-center">
            <div class="text-4xl mb-3"><Icon name="lucide:badge-check" class="w-[1em] h-[1em]" style="color: #4a9b7f" aria-hidden="true" /></div>
            <p class="text-sm mb-1" style="color: #4f659c">{{ t('auth.recovery.findEmail.resultLabel') }}</p>
            <p class="text-lg font-semibold tracking-wide mb-5" style="color: #4a5580">{{ foundEmail }}</p>
            <NuxtLink to="/auth/login" class="inline-block rounded-xl py-3 px-6 text-sm font-semibold text-white transition-all active:scale-95" style="background: linear-gradient(135deg, #97a8f1 0%, #c4a0f0 100%)">
              {{ t('auth.login') }}
            </NuxtLink>
          </div>

          <!-- 입력 폼 -->
          <form v-else class="flex flex-col gap-3" @submit.prevent="onSubmit">
            <div>
              <label for="fe-nick" class="text-xs font-medium mb-1 block" style="color: #4f659c">
                {{ t('auth.nicknamePlaceholder') }}
              </label>
              <input
                id="fe-nick"
                v-model="nickname"
                type="text"
                autocomplete="nickname"
                autocapitalize="none"
                maxlength="20"
                :placeholder="t('auth.nicknamePlaceholder')"
                required
                class="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all tw-field"
              >
            </div>
            <div>
              <label for="fe-birth" class="text-xs font-medium mb-1 block" style="color: #4f659c">
                {{ t('auth.birthDateLabel') }}
              </label>
              <input
                id="fe-birth"
                v-model="birthDate"
                type="date"
                autocomplete="bday"
                required
                class="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all tw-field"
              >
            </div>

            <p v-if="message" class="text-xs text-center" :style="{ color: messageColor }" role="alert">
              {{ message }}
            </p>

            <button
              type="submit"
              class="w-full rounded-xl py-3 text-sm font-semibold text-white mt-2 transition-all active:scale-95 disabled:opacity-60"
              style="background: linear-gradient(135deg, #97a8f1 0%, #c4a0f0 100%); box-shadow: 0 4px 16px rgba(151,168,241,0.4)"
              :disabled="submitting"
            >
              {{ submitting ? t('auth.recovery.findEmail.submitting') : t('auth.recovery.findEmail.submit') }}
            </button>
          </form>

          <div v-if="!foundEmail" class="text-center mt-5 flex flex-col gap-2">
            <NuxtLink to="/auth/forgot-password" class="text-xs underline" style="color: #4a67b5">
              {{ t('auth.recovery.forgotPasswordLink') }}
            </NuxtLink>
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
definePageMeta({ layout: false })
useHead({ htmlAttrs: { style: '--apjek-scrim: #e8f4fd; --apjek-scrim-bottom: #ffe8f4' } })

const { t } = useI18n()

interface FindEmailResult {
  status: 'found' | 'not_found' | 'multiple' | 'too_many' | 'invalid' | 'error'
  email?: string
}

const nickname = ref<string>('')
const birthDate = ref<string>('')
const submitting = ref<boolean>(false)
const foundEmail = ref<string>('')
const message = ref<string>('')
const messageColor = ref<string>('#c2410c')

async function onSubmit() {
  if (submitting.value) return
  submitting.value = true
  message.value = ''
  try {
    const res = await $fetch<FindEmailResult>('/api/account-recovery/find-email', {
      method: 'POST',
      body: { nickname: nickname.value, birthDate: birthDate.value },
      // 4xx 응답도 throw 하지 않고 본문으로 받는다(상태별 안내 문구를 쓰기 위함).
      ignoreResponseError: true,
    })
    if (res.status === 'found' && res.email) {
      foundEmail.value = res.email
      return
    }
    const key: Record<FindEmailResult['status'], string> = {
      found: '',
      not_found: 'auth.recovery.findEmail.notFound',
      multiple: 'auth.recovery.findEmail.multiple',
      too_many: 'auth.recovery.findEmail.tooMany',
      invalid: 'auth.recovery.findEmail.invalidInput',
      error: 'auth.recovery.findEmail.error',
    }
    message.value = t(key[res.status] || 'auth.recovery.findEmail.error')
  }
  catch {
    message.value = t('auth.recovery.findEmail.error')
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
.tw-field[type='date'] {
  -webkit-appearance: none;
  appearance: none;
  display: block;
  box-sizing: border-box;
  min-width: 0;
  height: calc(1.25rem + 1.5rem + 3px);
  line-height: 1.25rem;
}
.tw-field[type='date']::-webkit-date-and-time-value {
  text-align: left;
  margin: 0;
}
</style>
