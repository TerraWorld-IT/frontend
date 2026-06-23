<template>
  <!--
    AdSense 웹 배너. PC 뷰포트(md+) 에서만 노출. 모바일 앱(Capacitor) 버전에는 표시 안 함.
    AdSense 승인 + slot ID 발급 전에는 빈 placeholder 만 차지.

    환경 변수
      NUXT_PUBLIC_ADSENSE_CLIENT — `ca-pub-XXXXXXXXX` 형식 (필수)
      NUXT_PUBLIC_ADSENSE_SLOT   — 슬롯 ID (필수)
  -->
  <div
    v-if="enabled"
    class="hidden md:flex justify-center w-full bg-riso-cream/40 border-t border-riso-dark/10"
    :style="{ minHeight: '90px' }"
  >
    <ins
      class="adsbygoogle block"
      :data-ad-client="client"
      :data-ad-slot="slot"
      data-ad-format="auto"
      data-full-width-responsive="true"
      style="display:block; width:100%; max-width: 728px; height: 90px;"
    />
  </div>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { authClient } from '~/lib/auth-client'

const config = useRuntimeConfig()
const client = (config.public.adsenseClient as string | undefined) ?? ''
const slot = (config.public.adsenseSlot as string | undefined) ?? ''

// 모바일 네이티브 앱(Capacitor) 에서는 AdMob 사용. AdSense 는 PC 웹만.
const isNativeApp = import.meta.client ? Capacitor.isNativePlatform() : false

// H2 (code-review): 광고 식별자 동의(adConsent) 시에만 AdSense 스크립트/광고를 로드.
// 동의 전에는 adsbygoogle.js 자체를 주입하지 않아 광고 쿠키/추적이 발생하지 않는다(GA4 opt-in 과 정합).
const session = authClient.useSession()
const adConsent = computed<boolean>(
  () => (session.value?.data?.user as { adConsent?: boolean } | undefined)?.adConsent === true,
)

const enabled = computed<boolean>(() => {
  if (isNativeApp) return false
  if (!client || !slot) return false
  return adConsent.value
})

// 반응형 — 동의가 mount 이후(세션 로드 후) 켜져도 스크립트가 주입되도록 함수형 useHead.
useHead(() => ({
  script: enabled.value
    ? [
        {
          src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`,
          async: true,
          crossorigin: 'anonymous',
        },
      ]
    : [],
}))

let pushed = false
function pushAd() {
  if (!enabled.value || pushed) return
  pushed = true
  // AdSense 의 globalThis.adsbygoogle 큐에 push — 자동 광고 로드 트리거
  try {
    // @ts-expect-error — adsbygoogle 은 외부 스크립트가 주입하는 전역
    ;(globalThis.adsbygoogle = globalThis.adsbygoogle || []).push({})
  }
  catch {
    // 스크립트 미로드 / 차단 시 무음 — 빈 슬롯만 노출
  }
}

onMounted(pushAd)
// 동의가 나중에 켜지면 그 때 1회 push.
watch(enabled, (v) => {
  if (v) pushAd()
})
</script>
