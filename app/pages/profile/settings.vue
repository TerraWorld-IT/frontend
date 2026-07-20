<template>
  <div class="flex flex-col gap-[20px] pb-4">
    <!-- 헤더 (뒤로가기 + 제목 — profile/index.vue 헤더 스타일 준수) -->
    <div class="py-[10px] flex items-center gap-[8px]">
      <button
        type="button"
        class="p-[4px] -ml-[4px] transition-all active:scale-95"
        aria-label="뒤로가기"
        @click="goBack"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <h1 class="font-bold text-[29px] text-black tracking-[-0.9px] leading-[28px]">설정</h1>
    </div>

    <!-- 동의 항목 관리 (FE 실기능 보존, TW2 카드 스타일) -->
    <div class="bg-white rounded-[16px] w-full relative border border-black/10">
      <div class="p-[21px] flex flex-col gap-[16px]">
        <div class="flex items-center gap-[8px]">
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
            <g clip-path="url(#clip_user_c)">
              <path :d="P.user.circle" stroke="black" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
              <path :d="P.user.head" stroke="black" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
              <path :d="P.user.body" stroke="black" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
            </g>
            <defs><clipPath id="clip_user_c"><rect fill="white" width="20" height="20" /></clipPath></defs>
          </svg>
          <span class="font-bold text-[18px] text-black tracking-[-0.44px] leading-[27px]">{{ $t('profile.consentSection') }}</span>
        </div>
        <p class="text-[12px] text-[#525252]">{{ $t('profile.consentDesc') }}</p>
        <div class="flex flex-col gap-[8px]">
          <label
            v-for="item in consentToggles"
            :key="`${item.key}-${consentRenderKey}`"
            class="w-full flex items-center justify-between p-[13px] bg-white border border-black/10 rounded-[12px] cursor-pointer"
          >
            <span class="text-[14px] font-semibold text-black tracking-[-0.15px]">{{ t(`auth.consent.${item.key}`) }}</span>
            <input
              type="checkbox"
              :checked="item.value"
              :disabled="consentSaving"
              class="w-5 h-5 accent-riso-sage disabled:opacity-50"
              @change="onConsentToggle(item.key, ($event.target as HTMLInputElement).checked)"
            >
          </label>
        </div>
      </div>
    </div>

    <!-- 계정 -->
    <div class="bg-white rounded-[16px] w-full relative border border-black/10">
      <div class="p-[21px] flex flex-col gap-[24px]">
        <div class="flex items-center gap-[8px] pb-0">
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
            <g clip-path="url(#clip_user_a)">
              <path :d="P.user.circle" stroke="black" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
              <path :d="P.user.head" stroke="black" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
              <path :d="P.user.body" stroke="black" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
            </g>
            <defs><clipPath id="clip_user_a"><rect fill="white" width="20" height="20" /></clipPath></defs>
          </svg>
          <span class="font-bold text-[18px] text-black tracking-[-0.44px] leading-[27px]">{{ $t('profile.accountSection') }}</span>
        </div>

        <div class="flex flex-col gap-[8px]">
          <!-- 이용 안내 -->
          <button
            type="button"
            class="w-full bg-white rounded-[12px] flex items-center justify-between p-[13px] text-left transition-all active:scale-[0.98] border border-black/10"
            @click="toast.info(t('profile.menuGuideComingSoon'))"
          >
            <div class="flex items-center gap-[12px]">
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                <g clip-path="url(#clip_guide)">
                  <path :d="P.info.circle" stroke="#525252" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                  <path d="M8 10.6667V8" stroke="#525252" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                  <path d="M8 5.33333H8.00667" stroke="#525252" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                </g>
                <defs><clipPath id="clip_guide"><rect fill="white" width="16" height="16" /></clipPath></defs>
              </svg>
              <span class="text-[14px] font-semibold text-black tracking-[-0.15px]">{{ $t('profile.menuGuide') }}</span>
            </div>
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M6 12L10 8L6 4" stroke="#AEAEAE" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" /></svg>
          </button>

          <!-- 로그인 -->
          <NuxtLink
            to="/auth/login"
            class="w-full bg-white rounded-[12px] flex items-center justify-between p-[13px] text-left transition-all active:scale-[0.98] border border-black/10"
          >
            <div class="flex items-center gap-[12px]">
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                <path :d="P.login.door" stroke="#525252" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                <path :d="P.login.arrow" stroke="#525252" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                <path d="M10 8H2" stroke="#525252" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              </svg>
              <span class="text-[14px] font-semibold text-black tracking-[-0.15px]">{{ $t('auth.login') }}</span>
            </div>
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M6 12L10 8L6 4" stroke="#AEAEAE" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" /></svg>
          </NuxtLink>

          <!-- 로그아웃 (FE 실기능) -->
          <button
            type="button"
            class="w-full bg-white rounded-[12px] flex items-center justify-between p-[13px] text-left transition-all active:scale-[0.98] border border-black/10"
            :disabled="loggingOut"
            @click="onLogout"
          >
            <div class="flex items-center gap-[12px]">
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                <path :d="P.logout.door" stroke="#525252" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                <path :d="P.logout.arrow" stroke="#525252" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                <path d="M14 8H6" stroke="#525252" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              </svg>
              <span class="text-[14px] font-semibold text-black tracking-[-0.15px]">{{ loggingOut ? $t('profile.loggingOut') : $t('profile.logout') }}</span>
            </div>
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M6 12L10 8L6 4" stroke="#AEAEAE" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" /></svg>
          </button>
        </div>

        <div class="rounded-[12px] p-[12px] text-center" style="background: #f9fafb">
          <p class="text-[12px] text-black leading-[16px]">
            {{ $t('profile.itemsHint') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { authClient } from '~/lib/auth-client'

definePageMeta({ layout: 'default', middleware: 'auth' })

const toast = useToast()
const { t } = useI18n()

function goBack() {
  navigateTo('/profile')
}

// TW2 svgPaths 인라인 (profile/index.vue 와 동일 subset — 이 페이지가 쓰는 아이콘만).
const P = {
  info: { circle: 'M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8C14.6667 4.3181 11.6819 1.33333 8 1.33333C4.3181 1.33333 1.33333 4.3181 1.33333 8C1.33333 11.6819 4.3181 14.6667 8 14.6667Z' },
  user: {
    circle: 'M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z',
    head: 'M10 10.8333C11.3807 10.8333 12.5 9.71405 12.5 8.33333C12.5 6.95262 11.3807 5.83333 10 5.83333C8.61929 5.83333 7.5 6.95262 7.5 8.33333C7.5 9.71405 8.61929 10.8333 10 10.8333Z',
    body: 'M5.83333 17.2183V15.8333C5.83333 15.3913 6.00893 14.9674 6.32149 14.6548C6.63405 14.3423 7.05797 14.1667 7.5 14.1667H12.5C12.942 14.1667 13.366 14.3423 13.6785 14.6548C13.9911 14.9674 14.1667 15.3913 14.1667 15.8333V17.2183',
  },
  login: {
    door: 'M10 2H12.6667C13.0203 2 13.3594 2.14048 13.6095 2.39052C13.8595 2.64057 14 2.97971 14 3.33333V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H10',
    arrow: 'M6.66667 11.3333L10 8L6.66667 4.66667',
  },
  logout: {
    door: 'M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6',
    arrow: 'M10.6667 11.3333L14 8L10.6667 4.66667',
  },
}

// P3-2 (PIPA): 동의 항목 관리 — better-auth session 의 동의 필드를 읽어 토글, 변경 시 updateUser.
const session = authClient.useSession()
const consentSaving = ref<boolean>(false)
const consentRenderKey = ref<number>(0)
// 가입 시 받는 선택 동의 5종(photo/push/adId/analytics/marketing)과 1:1 로 맞춘다.
// 철회 수단이 없는 동의 항목이 남으면 안 된다 — 철회는 동의보다 어려워선 안 되기 때문이다.
const consentToggles = ref<Array<{ key: string; field: string; value: boolean }>>([
  { key: 'marketing', field: 'marketingConsent', value: false },
  { key: 'analytics', field: 'analyticsConsent', value: false },
  { key: 'adId', field: 'adConsent', value: false },
  { key: 'photo', field: 'photoConsent', value: false },
  { key: 'push', field: 'pushConsent', value: false },
])

watch(
  () => session.value?.data?.user,
  (u) => {
    const cu = u as {
      marketingConsent?: boolean
      analyticsConsent?: boolean
      adConsent?: boolean
      photoConsent?: boolean
      pushConsent?: boolean
    } | undefined
    if (!cu) return
    consentToggles.value = [
      { key: 'marketing', field: 'marketingConsent', value: cu.marketingConsent ?? false },
      { key: 'analytics', field: 'analyticsConsent', value: cu.analyticsConsent ?? false },
      { key: 'adId', field: 'adConsent', value: cu.adConsent ?? false },
      { key: 'photo', field: 'photoConsent', value: cu.photoConsent ?? false },
      { key: 'push', field: 'pushConsent', value: cu.pushConsent ?? false },
    ]
  },
  { immediate: true },
)

async function onConsentToggle(key: string, checked: boolean) {
  const item = consentToggles.value.find(c => c.key === key)
  if (!item || consentSaving.value) return
  consentSaving.value = true
  try {
    const { error } = await authClient.updateUser(
      { [item.field]: checked } as unknown as Parameters<typeof authClient.updateUser>[0],
    )
    if (error) throw new Error(error.message ?? t('profile.consentSaveFail'))
    item.value = checked
    toast.success(t('profile.consentSaved'))
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    consentSaving.value = false
    consentRenderKey.value++
  }
}

const loggingOut = ref<boolean>(false)

async function onLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    const { signOutAndClear } = useAuth()
    await signOutAndClear()
    toast.success(t('profile.loggedOut'))
    await navigateTo('/auth/login')
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    loggingOut.value = false
  }
}
</script>
