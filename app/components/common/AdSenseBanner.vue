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

const config = useRuntimeConfig()
const client = (config.public.adsenseClient as string | undefined) ?? ''
const slot = (config.public.adsenseSlot as string | undefined) ?? ''

// 모바일 네이티브 앱(Capacitor) 에서는 AdMob 사용. AdSense 는 PC 웹만.
const isNativeApp = import.meta.client ? Capacitor.isNativePlatform() : false

const enabled = computed(() => {
  if (isNativeApp) return false
  if (!client || !slot) return false
  return true
})

useHead({
  script: enabled.value
    ? [
        {
          src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`,
          async: true,
          crossorigin: 'anonymous',
        },
      ]
    : [],
})

onMounted(() => {
  if (!enabled.value) return
  // AdSense 의 globalThis.adsbygoogle 큐에 push — 자동 광고 로드 트리거
  try {
    // @ts-expect-error — adsbygoogle 은 외부 스크립트가 주입하는 전역
    ;(globalThis.adsbygoogle = globalThis.adsbygoogle || []).push({})
  }
  catch {
    // 스크립트 미로드 / 차단 시 무음 — 빈 슬롯만 노출
  }
})
</script>
