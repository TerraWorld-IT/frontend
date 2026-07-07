<template>
  <div class="flex flex-col min-h-full -mx-5 -mt-4">
    <!-- ── 헤더 (다크) ── -->
    <div class="px-5 pt-8 pb-5" style="background: #111">
      <div class="flex items-start justify-between mb-1">
        <h1 class="font-bold text-[29px] text-white tracking-[-0.9px] leading-[28px]">
          상점
        </h1>
        <div class="flex items-center gap-2">
          <button
            type="button"
            data-testid="shop-exchange-trigger"
            class="h-10 px-3 rounded-[16px] text-[12px] font-semibold text-white flex items-center active:scale-[0.97] transition-transform"
            style="background: rgba(255,255,255,0.18)"
            @click="showExchange = true"
          >
            환전
          </button>
          <button
            type="button"
            class="h-10 px-3 rounded-[16px] text-[12px] font-semibold text-white flex items-center active:scale-[0.97] transition-transform"
            style="background: rgba(255,255,255,0.18)"
            @click="toast.info('도감 기능 준비중입니다 🚀')"
          >
            도감
          </button>
        </div>
      </div>
      <p class="text-[14px] text-white opacity-60 tracking-[-0.3px]">
        획득한 토큰과 재화로 아이템을 구매해요
      </p>
    </div>

    <!-- ── 카테고리 + 등급 탭 (흰 영역) ── -->
    <div
      class="bg-white px-5 pt-3 pb-3 flex flex-col gap-2 sticky top-0 z-10"
      style="box-shadow: 0 1px 0 rgba(0,0,0,0.06)"
    >
      <!-- 식물 | 배경 -->
      <div class="flex gap-2">
        <button
          v-for="[cat, label] in shopCats"
          :key="cat"
          type="button"
          class="flex-1 h-9 rounded-[14px] text-[14px] font-semibold transition-all"
          :style="shopCat === cat
            ? { background: '#111', color: 'white' }
            : { background: 'white', color: 'black', border: '1px solid rgba(0,0,0,0.1)' }"
          @click="shopCat = cat"
        >
          {{ label }}
        </button>
      </div>

      <!-- 일반 | 희귀 | 판타지 -->
      <div class="flex h-9 rounded-[20px] p-[3px] relative" style="background: #f5f5f5">
        <button
          v-for="r in rarities"
          :key="r"
          type="button"
          class="flex-1 rounded-[20px] text-[12px] font-semibold transition-all z-10 relative"
          :style="rarity === r
            ? { background: 'white', color: 'black' }
            : { color: 'black' }"
          @click="rarity = r"
        >
          {{ RARITY_LABEL[r] }}
        </button>
      </div>
    </div>

    <!-- ── 아이템 그리드 ── -->
    <div class="bg-white flex-1 px-4 pt-4 pb-8">
      <!-- 에러 -->
      <div v-if="fetchError" class="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
        <div class="text-5xl mb-1">⚠️</div>
        <p class="text-sm font-medium text-riso-poppy">아이템을 불러오지 못했어요</p>
        <p class="text-xs text-gray-400">{{ fetchError.message }}</p>
        <button
          type="button"
          class="mt-2 px-4 py-2 rounded-full bg-black text-white text-sm"
          @click="reload"
        >
          다시 시도
        </button>
      </div>

      <!-- 빈 상태 -->
      <div
        v-else-if="filteredItems.length === 0"
        class="flex flex-col items-center justify-center py-20 text-gray-400"
      >
        <div class="text-5xl mb-3">🌿</div>
        <p class="text-sm font-medium">
          {{ shopCat === 'background' ? '배경 아이템 준비중이에요 🚀' : '해당 등급 아이템이 없습니다' }}
        </p>
      </div>

      <!-- 그리드 -->
      <div v-else class="grid grid-cols-2 gap-3">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="bg-white rounded-[20px] flex flex-col items-center p-3 active:scale-[0.97] transition-transform"
          style="border: 1px solid rgba(0,0,0,0.08)"
        >
          <!-- 이름 -->
          <p class="text-[12px] font-semibold text-black text-center mb-2">
            {{ item.name }}
          </p>

          <!-- 이미지 -->
          <div class="w-20 h-[130px] flex items-center justify-center">
            <div
              class="flex items-center justify-center"
              :class="item.rarity === 'RARE' ? 'animate-sway' : item.isAnimated ? 'animate-float' : ''"
            >
              <img
                :src="itemImageUrl(item)"
                :alt="item.name"
                class="w-16 h-16 object-contain"
                @error="onAssetError"
              >
            </div>
          </div>

          <!-- 태그 -->
          <div class="flex items-center gap-1 mt-2 mb-1">
            <span
              class="text-[10px] font-semibold px-2 py-[1px] rounded-[14px]"
              style="border: 1px solid rgba(0,0,0,0.1)"
            >
              {{ RARITY_LABEL[toRarityKey(item.rarity)] }}
            </span>
            <span
              class="text-[10px] font-semibold px-2 py-[1px] rounded-[14px]"
              style="border: 1px solid rgba(0,0,0,0.1)"
            >
              {{ item.layout === 'BACKGROUND' ? '배경' : '식물' }}
            </span>
          </div>

          <!-- 가격 -->
          <div class="flex items-center gap-1 mb-2">
            <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
              <path :d="COIN_PATH" stroke="#4A5565" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="text-[12px] text-[#4a5565]">{{ priceLabel(item) }}</span>
            <svg
              v-if="item.isAnimated"
              class="w-3 h-3 text-yellow-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
          </div>

          <!-- 버튼 -->
          <button
            type="button"
            :disabled="isOwned(item) || !canAfford(item) || purchasing === item.id"
            class="w-full h-[26px] rounded-[14px] text-[12px] font-semibold text-center transition-all"
            :style="isOwned(item)
              ? { border: '1px solid rgba(0,0,0,0.1)', color: '#4a5565', cursor: 'default' }
              : canAfford(item)
                ? { border: '1px solid #111', color: '#111' }
                : { border: '1px solid rgba(0,0,0,0.1)', color: '#aaa', cursor: 'not-allowed' }"
            @click="onPurchase(item)"
          >
            {{ purchasing === item.id ? '...' : isOwned(item) ? '보유중' : canAfford(item) ? '구매하기' : '재화 부족' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── 재화 환전 모달 (TW2 ExchangeModal 디자인) ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showExchange"
          class="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm"
          @click.self="showExchange = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl p-5 w-[92%] max-w-md mx-4 max-h-[88dvh] flex flex-col overflow-y-auto">
            <!-- 헤더 -->
            <div class="flex items-center justify-between mb-5">
              <h3 class="text-base font-bold flex items-center gap-2" style="color: #b8960a">
                <Icon name="lucide:refresh-cw" class="w-4 h-4" />
                재화 환전
              </h3>
              <button
                type="button"
                class="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                @click="showExchange = false"
              >
                <Icon name="lucide:x" class="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <!-- [환전할 재화] > [재화환전] -->
            <div class="flex items-stretch gap-3 mb-5">
              <!-- 왼쪽: 환전할 재화 (루비) -->
              <div
                class="flex-1 rounded-2xl flex flex-col items-center justify-center gap-1 py-4 px-3"
                style="background: #fefce8; border: 2px solid #fde68a"
              >
                <div class="text-3xl">💎</div>
                <div class="text-xs font-semibold text-amber-700 text-center leading-tight">루비</div>
                <div class="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    class="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-sm flex items-center justify-center active:scale-90 transition-transform"
                    @click="exchangeAmount = Math.max(1, exchangeAmount - 1)"
                  >−</button>
                  <span class="text-lg font-bold text-amber-800 w-8 text-center">{{ exchangeAmount }}</span>
                  <button
                    type="button"
                    :disabled="exchangeAmount >= rubyBalance"
                    class="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-sm flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
                    @click="exchangeAmount = Math.min(rubyBalance, exchangeAmount + 1)"
                  >+</button>
                </div>
                <div class="text-[10px] text-amber-500 mt-1">보유 {{ rubyBalance }}개</div>
              </div>

              <!-- 화살표 -->
              <div class="flex items-center flex-shrink-0">
                <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: #fef9c3">
                  <Icon name="lucide:arrow-right" class="w-4 h-4" style="color: #b8960a" />
                </div>
              </div>

              <!-- 오른쪽: 재화환전 버튼 (코인) -->
              <button
                type="button"
                :disabled="exchangeAmount > rubyBalance || exchangeAmount < 1 || rubyBalance === 0 || exchanging"
                class="flex-1 rounded-2xl flex flex-col items-center justify-center gap-1 py-4 px-3 transition-all active:scale-95 disabled:opacity-40"
                style="background: linear-gradient(135deg, #fcee5a, #f5c518); box-shadow: 0 4px 14px rgba(252,238,90,0.5)"
                @click="onExchangeSpecial"
              >
                <div class="text-3xl">⭐</div>
                <div class="text-xs font-semibold text-amber-900 text-center leading-tight">기본 코인</div>
                <div class="text-xl font-bold text-amber-900 mt-1">받기</div>
                <div class="text-[10px] text-amber-800 mt-0.5 font-semibold">{{ exchanging ? '환전 중...' : '환전 시 코인 지급' }}</div>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type {
  CurrencyResponse,
  ExchangeResult,
  ItemListResponse,
  ItemResponse,
  PurchaseResponse,
  UserMeResponse,
} from '@terraworld-it/openapi-frontend'
import { balanceOf } from '~/utils/currency'

// loadShop() 이 게스트용 분기 없이 무조건 sdk.getMe() 를 호출·실패 시 throw 하므로
// 실질적으로 로그인 필요 — '/shop' 을 middleware/auth.ts PUBLIC_EXACT 에서도 제거함.
definePageMeta({ layout: 'default', middleware: 'auth' })

type ShopCat = 'plant' | 'background'
type RarityKey = 'common' | 'rare' | 'epic'

const RARITY_LABEL: Record<RarityKey, string> = { common: '일반', rare: '희귀', epic: '판타지' }
const shopCats: [ShopCat, string][] = [['plant', '식물'], ['background', '배경']]
const rarities: RarityKey[] = ['common', 'rare', 'epic']

// TW2 CoinIcon path (imports/상점/svg-xdmk87hcob.ts → p295e8380)
const COIN_PATH = 'M5.7625 1.1475C5.78441 1.10323 5.81826 1.06597 5.86023 1.03991C5.90219 1.01386 5.9506 1.00005 6 1.00005C6.0494 1.00005 6.09781 1.01386 6.13977 1.03991C6.18174 1.06597 6.21559 1.10323 6.2375 1.1475L7.3925 3.487C7.46859 3.64098 7.58091 3.7742 7.71981 3.87523C7.85872 3.97625 8.02006 4.04206 8.19 4.067L10.773 4.445C10.8219 4.45209 10.8679 4.47274 10.9057 4.5046C10.9436 4.53646 10.9717 4.57827 10.987 4.6253C11.0023 4.67233 11.0041 4.7227 10.9923 4.77072C10.9805 4.81873 10.9554 4.86248 10.92 4.897L9.052 6.716C8.92881 6.83605 8.83664 6.98424 8.78342 7.14781C8.7302 7.31139 8.71753 7.48544 8.7465 7.655L9.188 10.228C9.19681 10.2769 9.19175 10.3273 9.17337 10.3735C9.155 10.4197 9.12406 10.4599 9.08407 10.4894C9.04408 10.5189 8.99664 10.5367 8.94711 10.5407C8.89757 10.5447 8.84791 10.5348 8.8035 10.512L6.4935 9.298C6.34142 9.21815 6.17227 9.1764 6.0005 9.1764C5.82873 9.1764 5.65958 9.21815 5.5075 9.298L3.1975 10.512C3.15309 10.5348 3.10343 10.5447 3.05389 10.5407C3.00436 10.5367 2.95692 10.5189 2.91693 10.4894C2.87694 10.4599 2.846 10.4197 2.82763 10.3735C2.80925 10.3273 2.80419 10.2769 2.813 10.228L3.254 7.655C3.28297 7.48544 3.2703 7.31139 3.21708 7.14781C3.16386 6.98424 3.07169 6.83605 2.9485 6.716L1.0805 4.897C1.04506 4.86248 1.01999 4.81873 1.00818 4.77072C0.996372 4.7227 0.998165 4.67233 1.01345 4.6253C1.02874 4.57827 1.05685 4.53646 1.09468 4.5046C1.13251 4.47274 1.17855 4.45209 1.2275 4.445L3.8105 4.067C3.98044 4.04206 4.14178 3.97625 4.28069 3.87523C4.41959 3.7742 4.53191 3.64098 4.608 3.487L5.7625 1.1475Z'

const { sdk, client } = useOpenApi()
const toast = useToast()
const { itemAssetUrl, onAssetError } = useItemAsset()
const { trackItemPurchased, trackTokenExchanged } = useGtagEvents()

const shopCat = ref<ShopCat>('plant')
const rarity = ref<RarityKey>('common')
const showExchange = ref<boolean>(false)

const currency = ref<CurrencyResponse | null>(null)
const items = ref<ItemResponse[]>([])
const ownedSlugs = ref<Set<string>>(new Set<string>())
const purchasing = ref<number | null>(null)
const fetchError = ref<Error | null>(null)

const exchanging = ref<boolean>(false)
const exchangeAmount = ref<number>(1)

// --- 최초 로드 (page-level Suspense fallback) ---
async function loadShop() {
  const [meRes, itemRes] = await Promise.all([
    sdk.getMe({ client }),
    sdk.listItems({ client }),
  ])
  if (meRes.error) throw new Error(errMsg(meRes.error, 'getMe failed'))
  if (itemRes.error) throw new Error(errMsg(itemRes.error, 'listItems failed'))

  const me = castData<UserMeResponse>(meRes.data)
  const itemList = castData<ItemListResponse>(itemRes.data)
  currency.value = me?.currency ?? null
  items.value = itemList?.items ?? []
  ownedSlugs.value = new Set(me?.ownedItems ?? [])
}

try {
  await loadShop()
}
catch (e) {
  fetchError.value = e as Error
}

async function reload() {
  fetchError.value = null
  try {
    await loadShop()
  }
  catch (e) {
    fetchError.value = e as Error
    toast.error((e as Error).message)
  }
}

// --- 파생 ---
const rubyBalance = computed<number>(() => balanceOf(currency.value, 'RUBY'))

function toRarityKey(r: ItemResponse['rarity']): RarityKey {
  return r === 'RARE' ? 'rare' : r === 'EPIC' ? 'epic' : 'common'
}

const filteredItems = computed<ItemResponse[]>(() => {
  return items.value.filter((it) => {
    const isBg = it.layout === 'BACKGROUND'
    if (shopCat.value === 'background' && !isBg) return false
    if (shopCat.value === 'plant' && isBg) return false
    return toRarityKey(it.rarity) === rarity.value
  })
})

function isOwned(item: ItemResponse): boolean {
  return ownedSlugs.value.has(item.slug ?? '')
}

// 상품 이미지 — assetUrl(required 계약)이 URL 이면 우선 사용, 아니면 slug 규약 경로로 fallback.
// (홈 item picker isUrl 패턴 참조. slug:null 상품 깨짐 방지 + req4 png 교체 취지 유지.)
function itemImageUrl(item: ItemResponse): string {
  const url = item.assetUrl
  if (url && (url.startsWith('http') || url.startsWith('/'))) return url
  return itemAssetUrl(item.slug ?? '', item.isAnimated ? 'gif' : 'png')
}

// canAfford — 7화폐 정규화 잔액으로 판정. priceType 별 주 재화.
// ItemResponse 에 활동 토큰 code 필드가 없어(categoryId/categoryName 만 존재) 토큰 잔액은
// 직접 검증 불가 → TOKEN/MIXED 의 토큰분은 낙관(서버 검증 위임)하고 '재화 부족' 오표시를 막는다.
function canAfford(item: ItemResponse): boolean {
  const coin = balanceOf(currency.value, 'COIN')
  const ruby = balanceOf(currency.value, 'RUBY')
  if (item.priceType === 'BASIC') return coin >= item.priceAmount
  if (item.priceType === 'SPECIAL') return ruby >= item.priceAmount
  // MIXED: 코인분(priceAmount)만 검증 가능. 토큰분(tokenPrice)은 code 미상 → 낙관.
  if (item.priceType === 'MIXED') return coin >= item.priceAmount
  // TOKEN: 활동 토큰 단독 — code 매핑 없음 → 낙관(true), 서버가 잔액 검증.
  return true
}

function priceLabel(item: ItemResponse): string {
  if (item.priceType === 'MIXED') return `${item.priceAmount} + ${item.tokenPrice ?? 0}`
  return String(item.priceAmount)
}

// --- 구매 (idempotencyKey) ---
async function onPurchase(item: ItemResponse) {
  if (isOwned(item) || !canAfford(item) || purchasing.value) return
  purchasing.value = item.id
  try {
    const { data, error } = await sdk.purchaseItem({
      client,
      body: { itemId: item.id },
    })
    if (error) throw error
    const purchased = castData<PurchaseResponse>(data)
    if (purchased) {
      currency.value = purchased.updatedCurrency
      ownedSlugs.value = new Set(purchased.ownedItems)
      trackItemPurchased({
        itemId: item.id,
        itemName: purchased.purchasedItem.name,
        priceType: item.priceType,
        priceAmount: item.priceAmount,
        rarity: item.rarity,
      })
      toast.success(`${purchased.purchasedItem.name} 구매 완료!`)
    }
  }
  catch (e) {
    // TOKEN/MIXED 는 클라 낙관 → 서버 잔액 부족 시 INSUFFICIENT_FUNDS 안내
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : ''
    toast.error(code === 'INSUFFICIENT_FUNDS' ? '재화가 부족해요.' : errMsg(e, '구매에 실패했어요.'))
    // 실패 시 잔액 재조회로 상태 복구 (재화 경로 failure-path-first)
    await refreshCurrency()
  }
  finally {
    purchasing.value = null
  }
}

// --- 환전 (루비 → 코인, directed exchange) ---
async function onExchangeSpecial() {
  if (exchanging.value || !exchangeAmount.value || exchangeAmount.value > rubyBalance.value) return
  exchanging.value = true
  try {
    const { data, error } = await sdk.exchange({
      client,
      body: { from: 'RUBY', to: 'COIN', amount: exchangeAmount.value },
    })
    if (error) throw error
    const ex = castData<ExchangeResult>(data)
    if (ex) {
      currency.value = ex.updatedCurrency
      trackTokenExchanged({ fromType: ex.from, toType: ex.to, amount: ex.fromAmount })
      // 사후 확정 표시 — 실제 지급량(toAmount)은 백엔드 환율 SoT 기준
      toast.success(`기본 코인 ${ex.toAmount}개를 받았습니다! (환율 ${ex.rate})`)
      exchangeAmount.value = 1
      showExchange.value = false
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
      return '루비가 부족해요.'
    default:
      return errMsg(e, '환전에 실패했어요. 잠시 후 다시 시도해 주세요.')
  }
}

// 재화 스냅샷 재조회 (환전/구매 실패 후 로컬 잔액 정합 복구)
async function refreshCurrency() {
  const { data, error } = await sdk.getMe({ client })
  if (error) return
  const me = castData<UserMeResponse>(data)
  if (me) {
    currency.value = me.currency ?? null
    ownedSlugs.value = new Set(me.ownedItems ?? [])
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
