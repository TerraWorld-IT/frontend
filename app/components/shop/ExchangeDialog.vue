<template>
  <!-- 재화 환전 다이얼로그 (아프젝 리스킨 + from 재화 선택 확장 — S2)
       기존 상점 페이지의 루비→코인 고정 다이얼로그를 분리·확장한 것.
       backend directed exchange(POST /exchange {from,to,amount})가 토큰4종→COIN pair 를
       이미 지원하므로(V28 시드) from 만 선택형으로 열고 to 는 COIN 고정. -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        ref="rootEl"
        class="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="재화 환전"
        @click.self="close()"
      >
        <div class="bg-apjek-surface rounded-2xl shadow-2xl p-5 w-[92%] max-w-md mx-4 max-h-[88dvh] flex flex-col overflow-y-auto">
          <!-- 헤더 -->
          <div class="flex items-center justify-between mb-1">
            <h3 class="apjek-section-title flex items-center gap-2">
              <Icon name="lucide:arrow-left-right" class="w-4 h-4" />
              재화 환전
            </h3>
            <button
              type="button"
              class="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              aria-label="닫기"
              @click="close()"
            >
              <Icon name="lucide:x" class="w-4 h-4 text-apjek-text-faint" />
            </button>
          </div>
          <p class="text-[12px] text-apjek-text-sub mb-4">보유한 재화를 기본 코인으로 바꿔요</p>

          <!-- from 재화 선택 칩 (보유 잔액 병기) -->
          <div class="flex flex-wrap gap-2 mb-4" role="radiogroup" aria-label="환전할 재화 선택">
            <button
              v-for="meta in fromMetas"
              :key="meta.code"
              type="button"
              role="radio"
              :aria-checked="fromCode === meta.code"
              class="apjek-chip text-[12px]"
              :class="fromCode === meta.code ? 'apjek-chip-active' : ''"
              @click="selectFrom(meta.code)"
            >
              <IconsCurrencyIcon :code="meta.code" :size="14" color="currentColor" />
              {{ meta.labelKo }} {{ balance(meta.code) }}
            </button>
          </div>

          <!-- 방향 요약: 선택 재화 → 기본 코인 -->
          <div class="flex items-stretch gap-3 mb-4">
            <div class="flex-1 apjek-card flex flex-col items-center justify-center gap-1 py-4 px-3 text-apjek-text">
              <IconsCurrencyIcon :code="fromCode" :size="28" color="currentColor" />
              <div class="text-[12px] font-semibold leading-tight">{{ fromLabel }}</div>
              <div class="text-[10px] text-apjek-text-faint">보유 {{ fromBalance }}개</div>
            </div>
            <div class="flex items-center shrink-0">
              <div class="w-8 h-8 rounded-full bg-apjek-bg flex items-center justify-center">
                <Icon name="lucide:arrow-right" class="w-4 h-4 text-apjek-text-sub" />
              </div>
            </div>
            <div class="flex-1 apjek-card flex flex-col items-center justify-center gap-1 py-4 px-3 text-apjek-text">
              <IconsCurrencyIcon code="COIN" :size="28" color="currentColor" />
              <div class="text-[12px] font-semibold leading-tight">기본 코인</div>
              <div class="text-[10px] text-apjek-text-faint">보유 {{ coinBalance }}개</div>
            </div>
          </div>

          <!-- 수량 입력 -->
          <div class="flex items-center gap-2 mb-2">
            <button
              type="button"
              class="w-9 h-9 rounded-full bg-apjek-bg text-apjek-text font-bold text-lg flex items-center justify-center active:scale-90 transition-transform shrink-0"
              aria-label="수량 줄이기"
              @click="step(-1)"
            >−</button>
            <input
              v-model.number="amount"
              type="number"
              min="1"
              :max="fromBalance"
              inputmode="numeric"
              aria-label="환전 수량"
              class="flex-1 min-w-0 h-10 rounded-[12px] border border-apjek-border-strong bg-apjek-surface text-center text-[16px] font-bold text-apjek-text [appearance:textfield]"
            >
            <button
              type="button"
              class="w-9 h-9 rounded-full bg-apjek-bg text-apjek-text font-bold text-lg flex items-center justify-center active:scale-90 transition-transform shrink-0"
              aria-label="수량 늘리기"
              @click="step(1)"
            >+</button>
            <button
              type="button"
              class="apjek-chip text-[12px] h-9 shrink-0 disabled:opacity-40"
              :disabled="fromBalance === 0"
              @click="amount = fromBalance"
            >전량</button>
          </div>

          <!-- 안내 — 비율 정보 API 가 없어 사전 수령량은 표시하지 않는다(서버 exchange_rates SoT).
               실제 지급량·환율은 응답 후 결과 토스트로 안내. -->
          <p class="text-[11px] text-apjek-text-faint mb-4 leading-relaxed">
            환율·수수료·일일 한도는 서버 기준으로 적용돼요. 실제 지급 코인은 환전 완료 후 알려드려요.
          </p>

          <!-- CTA -->
          <button
            type="button"
            class="apjek-cta w-full h-12"
            :disabled="!canSubmit"
            @click="onExchange"
          >
            {{ exchanging ? '환전 중...' : '코인으로 환전하기' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { CurrencyResponse, ExchangeResult } from '@terraworld-it/openapi-frontend'
import { CURRENCY_META, balanceOf } from '~/utils/currency'
import type { CurrencyCode } from '~/utils/currency'
import { useUserStore } from '~/stores/user'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const { sdk, client } = useOpenApi()
const userStore = useUserStore()
const toast = useToast()
const { trackTokenExchanged } = useGtagEvents()

// COIN 도착 pair 가 시드된 from 재화 — 활동 토큰 4종 + 루비 (표시 순서 고정)
const FROM_CODES: CurrencyCode[] = ['DEW', 'SUN', 'BOLT', 'WIND', 'RUBY']
const fromMetas = FROM_CODES.map(code =>
  CURRENCY_META.find(m => m.code === code) ?? { code, labelKo: code, icon: '' },
)

const fromCode = ref<CurrencyCode>('DEW')
const amount = ref<number>(1)
const exchanging = ref<boolean>(false)

function close() {
  emit('update:modelValue', false)
}

// bespoke 오버레이 focus trap + 배경 스크롤 잠금 (페이지 시절 동작 유지)
const rootEl = ref<HTMLElement | null>(null)
const isOpen = computed<boolean>(() => props.modelValue)
useDialogFocusTrap(rootEl, isOpen, close)

// Android 하드웨어 뒤로가기 — bespoke 오버레이라 직접 back-stack 에 등록
const { pushBackHandler } = useBackButtonStack()
let unregisterBackHandler: (() => void) | null = null
watch(isOpen, (open) => {
  if (open) {
    unregisterBackHandler = pushBackHandler(close)
  } else {
    unregisterBackHandler?.()
    unregisterBackHandler = null
  }
})
onBeforeUnmount(() => {
  unregisterBackHandler?.()
  unregisterBackHandler = null
})

// --- 파생 ---
const currency = computed<CurrencyResponse | null>(() => userStore.currency)

function balance(code: CurrencyCode): number {
  return balanceOf(currency.value, code)
}

const fromBalance = computed<number>(() => balance(fromCode.value))
const coinBalance = computed<number>(() => balance('COIN'))
const fromLabel = computed<string>(() => fromMetas.find(m => m.code === fromCode.value)?.labelKo ?? fromCode.value)

// v-model.number 는 빈 입력 시 문자열('')을 남길 수 있어 정수 검증까지 통과해야 활성화
const canSubmit = computed<boolean>(() =>
  !exchanging.value
  && Number.isInteger(amount.value)
  && amount.value >= 1
  && amount.value <= fromBalance.value,
)

function selectFrom(code: CurrencyCode) {
  fromCode.value = code
  // 재화 변경 시 수량을 새 잔액 안으로 클램프 (0 잔액이면 1 유지 — CTA disabled 가 방어)
  const next = Number.isInteger(amount.value) ? amount.value : 1
  amount.value = Math.min(Math.max(1, next), Math.max(1, balanceOf(currency.value, code)))
}

function step(delta: number) {
  const base = Number.isInteger(amount.value) ? amount.value : 1
  amount.value = Math.min(Math.max(1, base + delta), Math.max(1, fromBalance.value))
}

// --- 환전 (from 선택 → COIN, directed exchange) ---
async function onExchange() {
  if (!canSubmit.value) return
  exchanging.value = true
  try {
    const { data, error } = await sdk.exchange({
      client,
      body: { from: fromCode.value, to: 'COIN', amount: amount.value },
    })
    if (error) throw error
    const ex = castData<ExchangeResult>(data)
    if (ex) {
      userStore.updateCurrency(ex.updatedCurrency)
      trackTokenExchanged({ fromType: ex.from, toType: ex.to, amount: ex.fromAmount })
      // 사후 확정 표시 — 실제 지급량(toAmount)은 백엔드 환율 SoT 기준
      toast.success(`기본 코인 ${ex.toAmount}개를 받았습니다! (환율 ${ex.rate})`)
      amount.value = 1
      close()
    }
  }
  catch (e) {
    toast.error(exchangeErrorMessage(e))
  }
  finally {
    // 실패 시 잔액 재조회로 상태 복구 (재화 경로 failure-path-first)
    exchanging.value = false
    await refreshCurrency()
  }
}

// 환전 실패를 error.code 별 안내 메시지로 분기 (_Error.code — types.gen.ts)
function exchangeErrorMessage(e: unknown): string {
  const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : ''
  switch (code) {
    case 'PAIR_NOT_ALLOWED':
      return '이 화폐 쌍은 환전할 수 없어요.'
    case 'DAILY_LIMIT_EXCEEDED':
      return '오늘 환전 한도를 모두 사용했어요. 내일 다시 시도해 주세요.'
    case 'AMOUNT_TOO_SMALL':
      return '환전하기엔 수량이 너무 적어요.'
    case 'INSUFFICIENT_FUNDS':
      return `보유 ${fromLabel.value} 수량이 부족해요.`
    default:
      return errMsg(e, '환전에 실패했어요. 잠시 후 다시 시도해 주세요.')
  }
}

// 재화 스냅샷 재조회 (환전 실패 후 잔액 정합 복구) — TTL 캐시를 무시해야 의미가 있다
async function refreshCurrency() {
  try {
    await userStore.fetchMe(true)
  }
  catch {
    // 정합 복구는 best-effort — 실패해도 다음 진입에서 다시 맞춘다
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
