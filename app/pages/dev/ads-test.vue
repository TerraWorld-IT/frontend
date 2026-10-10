<template>
  <div class="py-4 flex flex-col gap-5">
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="size-11 -ml-[10px] flex items-center justify-center rounded-full text-apjek-text"
        aria-label="뒤로가기"
        @click="router.back()"
      >
        <Icon name="lucide:chevron-left" class="w-6 h-6" />
      </button>
      <h1 class="text-[20px] font-bold text-apjek-text tracking-[-0.4px]">광고 테스트</h1>
    </div>

    <p class="text-[13px] text-apjek-text-sub leading-relaxed">
      구글 공식 <b>테스트</b> 보상형 광고를 띄워 SDK 초기화 → 로드 → 표시 → 보상 → 닫힘 흐름을 확인합니다.
      서버에 보상을 청구하지 않으므로 재화 지급이나 하루 시청 한도에 영향이 없습니다.
    </p>

    <!-- 환경 상태 -->
    <section class="bg-apjek-surface border border-apjek-border rounded-[16px] p-4 flex flex-col gap-2" data-testid="ads-test-env">
      <h2 class="text-[15px] font-bold text-apjek-text">현재 환경</h2>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
        <template v-for="row in envRows" :key="row.label">
          <dt class="text-apjek-text-sub whitespace-nowrap">{{ row.label }}</dt>
          <dd class="text-apjek-text font-medium break-all" :class="row.warn ? 'text-riso-poppy' : ''">{{ row.value }}</dd>
        </template>
      </dl>
    </section>

    <button
      type="button"
      class="apjek-cta w-full min-h-[48px] text-[15px] disabled:opacity-40"
      :disabled="!canRun || running"
      data-testid="ads-test-run"
      @click="run"
    >
      {{ running ? '진행 중…' : '테스트 광고 보기' }}
    </button>
    <p v-if="!canRun" class="text-[12px] text-riso-poppy -mt-3">
      {{ blockedReason }}
    </p>

    <!-- 결과 요약 -->
    <section v-if="result" class="rounded-[16px] p-4 border" :class="result.ok ? 'border-riso-sage bg-riso-sage/10' : 'border-riso-poppy bg-riso-poppy/10'" data-testid="ads-test-result">
      <p class="text-[14px] font-bold text-apjek-text">{{ result.ok ? '보상 이벤트 수신 ✓' : '보상 이벤트 없음' }}</p>
      <p class="text-[12px] text-apjek-text-sub mt-1">{{ result.detail }}</p>
    </section>

    <!-- 단계 로그 -->
    <section v-if="logs.length" class="flex flex-col gap-1" data-testid="ads-test-log">
      <h2 class="text-[15px] font-bold text-apjek-text mb-1">진행 기록</h2>
      <ol class="flex flex-col gap-1">
        <li
          v-for="(entry, i) in logs"
          :key="i"
          class="grid grid-cols-[52px_1fr] gap-2 text-[12px] leading-snug"
        >
          <span class="text-apjek-text-faint tabular-nums">+{{ entry.ms }}ms</span>
          <span :class="entry.level === 'error' ? 'text-riso-poppy' : entry.level === 'ok' ? 'text-riso-sage font-semibold' : 'text-apjek-text'">
            {{ entry.text }}
          </span>
        </li>
      </ol>
    </section>

    <p class="text-[11px] text-apjek-text-faint leading-relaxed">
      실제 광고 단위로는 테스트하지 마세요. 자기 광고를 보거나 누르면 AdMob 이 부정 트래픽으로 판단해 계정이 제한될 수 있습니다.
      실제 광고·서버 보상(SSV) 연동은 AdMob 광고 단위 발급 후 따로 확인합니다.
    </p>
  </div>
</template>

<script setup lang="ts">
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { ADS_ENABLED } from '~/utils/constants'
import { TEST_REWARDED_AD_ID, TEST_REWARDED_AD_ID_IOS } from '~/composables/useAdMob'

// 개발자 메뉴(설정 > 앱 버전 7번 탭)에서만 들어오는 숨은 페이지. 로그인 사용자 누구나 열 수 있지만
// 테스트 광고만 쓰고 서버 보상을 청구하지 않아 재화·수익에 영향이 없다.
definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: '광고 테스트', meta: [{ name: 'robots', content: 'noindex' }] })

const router = useRouter()
const config = useRuntimeConfig()

const platform = import.meta.client ? Capacitor.getPlatform() : 'web'
const isNative = import.meta.client ? Capacitor.isNativePlatform() : false
const pluginAvailable = import.meta.client ? Capacitor.isPluginAvailable('AdMob') : false
const configuredAdId = String((platform === 'ios' ? config.public.admobRewardedAdIdIos : config.public.admobRewardedAdId) ?? '').trim()
const testAdId = platform === 'ios' ? TEST_REWARDED_AD_ID_IOS : TEST_REWARDED_AD_ID

const canRun = isNative && pluginAvailable && (platform === 'android' || platform === 'ios')
const blockedReason = !isNative
  ? '앱(안드로이드/iOS)에서 열어야 광고 SDK 를 쓸 수 있어요. 웹 브라우저에서는 동작하지 않아요.'
  : !pluginAvailable
      ? '이 앱 빌드에 AdMob 플러그인이 없어요(iOS 첫 출시 빌드는 광고 제외).'
      : '지원하지 않는 플랫폼이에요.'

function mask(id: string): string {
  return id ? `${id.slice(0, 14)}…${id.slice(-6)}` : ''
}

const envRows = computed(() => [
  { label: '실행 환경', value: isNative ? `앱 (${platform})` : '웹 브라우저', warn: !isNative },
  { label: 'AdMob 플러그인', value: pluginAvailable ? '있음' : '없음', warn: !pluginAvailable },
  { label: '광고 기능 스위치', value: ADS_ENABLED ? '켜짐' : '꺼짐', warn: !ADS_ENABLED },
  { label: '빌드', value: import.meta.env.PROD ? '운영(PROD)' : '개발', warn: false },
  {
    label: '운영 광고 단위 ID',
    value: configuredAdId ? `설정됨 ${mask(configuredAdId)}` : '미설정 — 운영에서는 보상형 광고 버튼이 숨겨짐',
    warn: !configuredAdId,
  },
  { label: '이 페이지가 쓰는 ID', value: `구글 테스트 ${mask(testAdId)}`, warn: false },
])

interface LogEntry { ms: number, text: string, level: 'info' | 'ok' | 'error' }
const logs = ref<LogEntry[]>([])
const running = ref<boolean>(false)
const result = ref<{ ok: boolean, detail: string } | null>(null)
let startedAt = 0

function log(text: string, level: LogEntry['level'] = 'info'): void {
  logs.value.push({ ms: Date.now() - startedAt, text, level })
}

function describeError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { code?: unknown, message?: unknown }
    return [e.code !== undefined ? `code=${String(e.code)}` : '', e.message ? String(e.message) : ''].filter(Boolean).join(' ') || JSON.stringify(err)
  }
  return String(err)
}

function timeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} ${ms / 1000}초 초과`)), ms))])
}

async function run(): Promise<void> {
  if (!canRun || running.value) return
  running.value = true
  result.value = null
  logs.value = []
  startedAt = Date.now()
  const handles: PluginListenerHandle[] = []
  let reward: { type: string, amount: number } | null = null
  try {
    const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob')
    log('AdMob 플러그인 로드')

    await timeout(AdMob.initialize({ initializeForTesting: true }), 15_000, 'SDK 초기화')
    log('SDK 초기화 완료 (테스트 모드)', 'ok')

    let dismissed!: () => void
    const dismissedP = new Promise<void>((resolve) => { dismissed = resolve })
    handles.push(
      await AdMob.addListener(RewardAdPluginEvents.Loaded, info => log(`광고 로드됨 ${info?.adUnitId ? mask(info.adUnitId) : ''}`, 'ok')),
      await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, err => log(`광고 로드 실패: ${describeError(err)}`, 'error')),
      await AdMob.addListener(RewardAdPluginEvents.Showed, () => log('광고 화면 표시')),
      await AdMob.addListener(RewardAdPluginEvents.FailedToShow, (err) => { log(`광고 표시 실패: ${describeError(err)}`, 'error'); dismissed() }),
      await AdMob.addListener(RewardAdPluginEvents.Rewarded, (item) => {
        reward = { type: item?.type ?? '', amount: Number(item?.amount ?? 0) }
        log(`보상 이벤트: ${reward.type || '(type 없음)'} × ${reward.amount}`, 'ok')
      }),
      await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => { log('광고 닫힘'); dismissed() }),
    )

    log('광고 요청 중…')
    await timeout(AdMob.prepareRewardVideoAd({ adId: testAdId, npa: true, isTesting: true }), 20_000, '광고 로드')

    log('광고 표시 요청')
    await AdMob.showRewardVideoAd()
    await timeout(dismissedP, 120_000, '광고 시청')

    const got = reward as { type: string, amount: number } | null
    result.value = got
      ? { ok: true, detail: `끝까지 시청 → 보상 이벤트 수신 (${got.type || 'type 없음'} × ${got.amount}). 실제 서비스에서는 이 시점에 서버 검증 후 재화가 지급됩니다.` }
      : { ok: false, detail: '보상 이벤트 없이 닫혔어요. 끝까지 시청하기 전에 닫았거나 광고가 표시되지 않은 경우예요.' }
  }
  catch (err) {
    log(`중단: ${describeError(err)}`, 'error')
    result.value = { ok: false, detail: describeError(err) }
  }
  finally {
    for (const h of handles) void h.remove()
    running.value = false
  }
}
</script>
