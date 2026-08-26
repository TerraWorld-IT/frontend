<template>
  <!--
    아프젝 온보딩 섹션 3페이지(2026-08-23 C6): 점검 중 / 접속 오류(네트워크) / 일시 오류 — 일러스트는 디자이너 제공 3종.
    풀페이지 그라디언트(연파랑 → 흰) + 중앙 원형 일러스트 + 타이틀/영문 부제 + 본문 + 검정 필 CTA.
    404 는 오류 변형(카피만 "페이지를 찾을 수 없어요")으로 유지한다.
    h-dvh + items-start + overflow-y-auto + my-auto: login.vue 와 동일한 safe-centering 패턴 —
    접근성 큰글씨/작은 화면에서 긴 메시지가 잘리고 스크롤도 안 되던 문제 방지.
    layout:false 경로라 세이프에어리어를 직접 처리한다 (login.vue 와 동일한 max() 이유).
  -->
  <div
    class="h-dvh w-full flex items-start justify-center overflow-y-auto px-6 text-apjek-text"
    style="background: linear-gradient(180deg, var(--color-apjek-blue-soft) 0%, var(--color-apjek-surface) 62%); padding-top: max(1.5rem, env(safe-area-inset-top, 0px)); padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 0px))"
    :data-error-kind="kind"
  >
    <div class="text-center w-full max-w-[393px] my-auto flex flex-col items-center">
      <!-- 타이틀 + 영문 부제 -->
      <h1 class="text-2xl font-bold leading-tight">
        {{ title }}
      </h1>
      <p class="text-sm text-apjek-text-sub mt-1">
        {{ subtitle }}
      </p>

      <!-- 중앙 원형 일러스트 — 디자이너 "이미지_E서비스점검중 / E접속오류 / E에러"(파란 원 포함) -->
      <img
        :src="illustSrc"
        alt=""
        width="176"
        height="176"
        class="my-10 w-44 h-44 object-contain select-none"
        aria-hidden="true"
        draggable="false"
      >

      <!-- 본문 카피 -->
      <p class="text-sm text-apjek-text-sub leading-relaxed whitespace-pre-line">
        {{ description }}
      </p>

      <div class="w-full flex flex-col gap-3 items-center mt-8">
        <button
          type="button"
          class="apjek-cta w-full max-w-[320px] py-3.5"
          @click="handlePrimary"
        >
          {{ primaryLabel }}
        </button>
        <!-- 점검 중엔 홈 이동이 무의미하고, 404 는 주 버튼이 이미 홈 이동이라 보조 링크를 숨긴다 -->
        <button
          v-if="kind !== 'maintenance' && kind !== 'notFound'"
          type="button"
          class="text-sm font-medium text-apjek-text-sub underline underline-offset-4 py-2"
          @click="handleGoHome"
        >
          {{ $t('error.goHome') }}
        </button>
        <p class="text-xs text-apjek-text-faint mt-1">
          {{ statusCode }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

type ErrorKind = 'maintenance' | 'network' | 'notFound' | 'generic'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()

// statusCode 가 명시된 경우만 분기. client 렌더 에러는 statusCode 가 없어 화면엔 500 으로 표시.
const rawStatus = computed<number | undefined>(() => props.error?.statusCode)
const statusCode = computed<number>(() => rawStatus.value ?? 500)

// 네트워크 단절 — navigator.onLine + online/offline 이벤트(클라이언트 전용, SSR 은 false).
const isOffline = ref<boolean>(false)
function onOnline() { isOffline.value = false }
function onOffline() { isOffline.value = true }
onMounted(() => {
  if (!import.meta.client) return
  isOffline.value = !navigator.onLine
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})
onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})

// fetch 네트워크 실패 메시지 — 브라우저/ofetch/undici 가 내는 대표 문구
const NETWORK_ERROR_RE = /fetch failed|failed to fetch|networkerror|load failed|ECONNREFUSED|ENOTFOUND|ECONNRESET|ETIMEDOUT|ERR_NETWORK|ERR_INTERNET_DISCONNECTED/i

// 점검 플래그 — 503 또는 서버가 error.data 에 명시한 maintenance 표식(BE N-B7 연동 지점).
const isMaintenance = computed<boolean>(() => {
  if (rawStatus.value === 503) return true
  const data = props.error?.data as { maintenance?: boolean, code?: string } | undefined
  return data?.maintenance === true || data?.code === 'MAINTENANCE'
})

const kind = computed<ErrorKind>(() => {
  if (isMaintenance.value) return 'maintenance'
  if (isOffline.value || NETWORK_ERROR_RE.test(props.error?.message ?? '')) return 'network'
  if (rawStatus.value === 404) return 'notFound'
  return 'generic'
})

const illustSrc = computed<string>(() => {
  switch (kind.value) {
    case 'maintenance': return '/illust/error-maintenance.webp'
    case 'network': return '/illust/error-network.webp'
    default: return '/illust/error-generic.webp'
  }
})

const title = computed<string>(() => {
  switch (kind.value) {
    case 'maintenance': return t('error.maintenance.title')
    case 'network': return t('error.network.title')
    case 'notFound': return t('error.notFoundTitle')
    default: return t('error.generic.title')
  }
})

const subtitle = computed<string>(() => {
  switch (kind.value) {
    case 'maintenance': return t('error.maintenance.subtitle')
    case 'network': return t('error.network.subtitle')
    default: return t('error.generic.subtitle')
  }
})

const description = computed<string>(() => {
  switch (kind.value) {
    case 'maintenance': return t('error.maintenance.desc')
    case 'network': return t('error.network.desc')
    case 'notFound': return t('error.notFoundDesc')
    default: return t('error.generic.desc')
  }
})

const primaryLabel = computed<string>(() => {
  switch (kind.value) {
    case 'maintenance': return t('error.maintenance.cta')
    case 'network': return t('error.network.cta')
    // 404 는 재시도할 대상이 없으므로 주 버튼이 홈 이동이다
    case 'notFound': return t('error.goHome')
    default: return t('error.generic.cta')
  }
})

function handleGoHome() {
  clearError({ redirect: '/' })
}

function handlePrimary() {
  if (!import.meta.client) return
  // 404 는 재시도할 대상이 없다 — 홈으로.
  if (kind.value === 'notFound') {
    handleGoHome()
    return
  }
  // 아직 오프라인이면 reload 해도 브라우저 오류 페이지만 뜬다 — 연결 복구 후 다시 누르게 둔다.
  if (kind.value === 'network' && !navigator.onLine) return
  // 현재 라우트를 hard-reload 해 실패한 SSR/data fetch 를 재실행한다.
  // 곧바로 reload 하므로 clearError() 는 no-op → 생략.
  window.location.reload()
}
</script>
