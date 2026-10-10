<template>
  <!-- AdMob 원시 동작 검증용 테스트 페이지.
       운영 광고 플로우(useAdMob)는 ADS_ENABLED=false·운영 광고단위 ID 미설정·SSV 서버검증으로
       겹겹이 게이트돼 있어 "플러그인이 WebView 앱에서 실제로 뜨는가"를 분리 검증하기 어렵다.
       이 페이지는 그 게이트를 전부 우회해 Google 공식 "테스트 보상형 광고 ID"로 플러그인
       수명주기(초기화→준비→표시→보상→닫힘)를 직접 호출하고 모든 이벤트를 화면에 로깅한다.
       테스트 광고 ID 만 쓰므로 정책/수익 위험 없음. 실 광고는 운영 ID 발급 후 별도 배선.
       layout:false + apjek-page-scroll(#104 스크롤 회귀 방지 패턴). -->
  <div
    class="apjek-page-scroll h-dvh w-full bg-riso-cream overflow-y-auto flex flex-col items-center px-5 py-6 gap-4"
    style="padding-top: max(1.5rem, var(--sat)); padding-bottom: max(1.5rem, var(--sab)); padding-left: max(1.25rem, var(--sal)); padding-right: max(1.25rem, var(--sar))"
  >
    <div class="w-full max-w-md space-y-4">
      <!-- 헤더 -->
      <div class="text-center space-y-1">
        <span class="inline-block rounded-full bg-riso-pink/15 px-3 py-1 text-xs font-bold text-riso-pink">AdMob 테스트 (운영 비노출)</span>
        <h1 class="text-xl font-bold text-riso-dark">보상형 광고 연동 점검</h1>
        <p class="text-xs text-riso-dark/40">Google 공식 테스트 광고 ID 사용 · 실 광고 아님</p>
      </div>

      <!-- 플랫폼 정보 -->
      <div class="rounded-2xl bg-white border border-riso-walnut/10 p-4 riso-shadow-sm text-sm space-y-1.5">
        <div class="flex justify-between"><span class="text-riso-dark/50">플랫폼</span><span class="font-bold text-riso-dark">{{ platform }}</span></div>
        <div class="flex justify-between"><span class="text-riso-dark/50">네이티브 앱</span><span class="font-bold" :class="isNative ? 'text-riso-sage' : 'text-riso-pink'">{{ isNative ? '예' : '아니오(웹 브라우저)' }}</span></div>
        <div class="flex justify-between"><span class="text-riso-dark/50">테스트 광고 ID</span><span class="font-mono text-[11px] text-riso-dark/60 truncate max-w-[180px]">{{ testAdId }}</span></div>
        <p v-if="!isNative" class="pt-1 text-[11px] text-riso-pink leading-relaxed">
          ⚠️ AdMob 보상형 광고는 <b>안드로이드 네이티브 앱(WebView)</b>에서만 실제로 표시됩니다.
          PC/모바일 웹 브라우저에서는 플러그인이 no-op 이라 광고가 뜨지 않습니다 — 폰 앱에서 열어 테스트하세요.
        </p>
      </div>

      <!-- 상태 -->
      <div class="rounded-2xl bg-white border border-riso-walnut/10 p-4 riso-shadow-sm flex items-center justify-between">
        <span class="text-sm text-riso-dark/50">현재 상태</span>
        <span class="font-bold text-sm" :class="statusColor">{{ status }}</span>
      </div>

      <!-- 버튼 -->
      <div class="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          class="col-span-2 min-h-[48px] rounded-2xl bg-riso-pink text-white font-bold text-sm riso-shadow-sm active:scale-[0.98] transition-transform disabled:opacity-40"
          :disabled="running"
          @click="runFullTest"
        >
          {{ running ? '실행 중…' : '① 테스트 광고 실행 (초기화→준비→표시)' }}
        </button>
        <button
          type="button"
          class="min-h-[44px] rounded-2xl bg-riso-sage text-white font-medium text-sm riso-shadow-sm active:scale-[0.98] transition-transform disabled:opacity-40"
          :disabled="running"
          @click="doInitialize"
        >
          초기화만
        </button>
        <button
          type="button"
          class="min-h-[44px] rounded-2xl bg-white border border-riso-walnut/15 text-riso-dark/60 font-medium text-sm active:scale-[0.98] transition-transform"
          @click="clearLog"
        >
          로그 지우기
        </button>
      </div>

      <!-- 보상 결과 -->
      <div v-if="rewardResult" class="rounded-2xl p-4 text-center font-bold text-sm" :class="rewardResult.ok ? 'bg-riso-sage/15 text-riso-sage' : 'bg-riso-pink/15 text-riso-pink'">
        {{ rewardResult.ok ? `✅ 보상 지급됨 (type=${rewardResult.type ?? '-'}, amount=${rewardResult.amount ?? '-'})` : '❌ 보상 없이 종료됨' }}
      </div>

      <!-- 이벤트 로그 -->
      <div class="rounded-2xl bg-riso-dark/95 p-3 text-[11px] font-mono text-riso-cream/90 leading-relaxed overflow-x-auto max-h-[320px] overflow-y-auto">
        <p v-if="!logs.length" class="text-riso-cream/40">— 로그 없음. 버튼을 눌러 시작하세요. —</p>
        <div v-for="(l, i) in logs" :key="i" :class="l.level === 'error' ? 'text-red-300' : l.level === 'ok' ? 'text-green-300' : 'text-riso-cream/80'">
          <span class="text-riso-cream/35">{{ l.t }}</span> {{ l.msg }}
        </div>
      </div>

      <NuxtLink to="/" class="block text-center text-xs text-riso-dark/40 underline py-2">← 홈으로</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { TEST_REWARDED_AD_ID } from '~/composables/useAdMob'

// 운영 네비게이션에 노출하지 않는 독립 점검 페이지.
definePageMeta({ layout: false })
useHead({ title: 'AdMob 테스트 | TerraWorld' })

const testAdId = TEST_REWARDED_AD_ID
const platform = ref<string>('-')
const isNative = ref<boolean>(false)
const running = ref<boolean>(false)
const status = ref<string>('대기')
const rewardResult = ref<{ ok: boolean, type?: string, amount?: number } | null>(null)

interface LogLine { t: string, msg: string, level: 'info' | 'ok' | 'error' }
const logs = ref<LogLine[]>([])
let initialized = false

const statusColor = computed<string>(() =>
  status.value.includes('실패') || status.value.includes('오류') ? 'text-riso-pink'
    : status.value === '보상 완료' ? 'text-riso-sage'
      : 'text-riso-dark',
)

function stamp(): string {
  // Date 직접 사용(클라이언트 전용 핸들러라 SSR 영향 없음). HH:MM:SS.mmm.
  const d = new Date()
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}
function log(msg: string, level: LogLine['level'] = 'info'): void {
  logs.value.push({ t: stamp(), msg, level })
}
function clearLog(): void {
  logs.value = []
  rewardResult.value = null
  status.value = '대기'
}

onMounted(() => {
  platform.value = Capacitor.getPlatform()
  isNative.value = Capacitor.isNativePlatform()
  log(`플랫폼=${platform.value}, 네이티브=${isNative.value}`)
  if (!isNative.value) log('웹 환경 — 실제 광고는 안 뜸(안드로이드 앱에서 테스트).', 'error')
})

async function doInitialize(): Promise<void> {
  if (!import.meta.client) return
  if (!isNative.value) { log('초기화 생략: 네이티브 아님', 'error'); return }
  try {
    log('AdMob.initialize({ initializeForTesting:true }) 호출…')
    const { AdMob } = await import('@capacitor-community/admob')
    // iOS 는 ATT 동의 선요청(Apple 정책). 안드로이드/웹 no-op.
    if (platform.value === 'ios') {
      try { const r = await AdMob.requestTrackingAuthorization(); log(`ATT status=${(r as unknown as { status?: string })?.status ?? 'n/a'}`) }
      catch (e) { log(`ATT 요청 오류: ${errText(e)}`, 'error') }
    }
    await AdMob.initialize({ initializeForTesting: true })
    initialized = true
    log('초기화 성공', 'ok')
    status.value = '초기화됨'
  }
  catch (e) {
    log(`초기화 실패: ${errText(e)}`, 'error')
    status.value = '초기화 오류'
  }
}

async function runFullTest(): Promise<void> {
  if (!import.meta.client || running.value) return
  rewardResult.value = null
  if (!isNative.value) {
    log('실행 불가: 웹 브라우저에서는 보상형 광고가 표시되지 않습니다. 안드로이드 앱에서 /ad-test 를 여세요.', 'error')
    status.value = '웹 — 표시 불가'
    return
  }
  running.value = true
  try {
    if (!initialized) await doInitialize()
    if (!initialized) { running.value = false; return }

    const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob')
    status.value = '준비 중'

    // 전체 수명주기 이벤트 리스너 등록 — 모두 로깅.
    const handles = await Promise.all([
      AdMob.addListener(RewardAdPluginEvents.Loaded, () => log('▶ Loaded (준비 완료)', 'ok')),
      AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (e: unknown) => log(`✖ FailedToLoad: ${JSON.stringify(e)}`, 'error')),
      AdMob.addListener(RewardAdPluginEvents.Showed, () => log('▶ Showed (화면 표시)', 'ok')),
      AdMob.addListener(RewardAdPluginEvents.FailedToShow, (e: unknown) => log(`✖ FailedToShow: ${JSON.stringify(e)}`, 'error')),
      AdMob.addListener(RewardAdPluginEvents.Rewarded, (r: unknown) => {
        const rw = r as { type?: string, amount?: number }
        log(`★ Rewarded: type=${rw?.type}, amount=${rw?.amount}`, 'ok')
        rewardResult.value = { ok: true, type: rw?.type, amount: rw?.amount }
      }),
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        log('▶ Dismissed (닫힘)')
        if (!rewardResult.value) rewardResult.value = { ok: false }
      }),
    ])

    const cleanup = () => { for (const h of handles) void h.remove() }

    try {
      log(`prepareRewardVideoAd({ adId: TEST, npa:true }) 호출…`)
      await AdMob.prepareRewardVideoAd({ adId: testAdId, npa: true })
      status.value = '표시 중'
      log('showRewardVideoAd() 호출…')
      await AdMob.showRewardVideoAd()
      // rewardResult 는 위 Rewarded 리스너(비동기 콜백)에서 채워진다 — TS CFA 는 콜백 실행을
      // 못 보고 value 를 null 로 좁히므로, 캐스팅으로 narrowing 을 끊어 최종값을 읽는다.
      const got = rewardResult.value as { ok: boolean } | null
      status.value = got?.ok ? '보상 완료' : '종료'
      log('showRewardVideoAd() 반환 — 플로우 종료', 'ok')
    }
    catch (e) {
      log(`광고 준비/표시 오류: ${errText(e)}`, 'error')
      status.value = '표시 실패'
    }
    finally {
      // 리스너 누적 방지(useAdMob 와 동일 교훈) — 약간의 지연 후 정리.
      setTimeout(cleanup, 500)
    }
  }
  catch (e) {
    log(`예외: ${errText(e)}`, 'error')
    status.value = '오류'
  }
  finally {
    running.value = false
  }
}

function errText(e: unknown): string {
  if (e instanceof Error) return e.message
  try { return JSON.stringify(e) }
  catch { return String(e) }
}
</script>
