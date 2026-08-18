<template>
  <div class="flex flex-col min-h-full -mx-5 -mt-4 bg-apjek-surface">
    <!-- ── 헤더 (아프젝 화이트) ── -->
    <div class="px-5 pt-8 pb-4">
      <div class="flex items-start justify-between mb-1">
        <h1 class="font-bold text-[29px] text-apjek-text tracking-[-0.9px] leading-[32px]">
          상점
        </h1>
        <button
          type="button"
          data-testid="shop-exchange-trigger"
          class="apjek-cta h-10 px-4 text-[13px] active:scale-[0.97] transition-transform"
          @click="showExchange = true"
        >
          <Icon name="lucide:arrow-left-right" class="w-4 h-4" />
          재화 환전
        </button>
      </div>
      <p class="text-[14px] text-apjek-text-sub tracking-[-0.3px]">
        획득한 토큰과 재화로 아이템을 구매해요
      </p>
    </div>

    <!-- ── 카테고리 + 등급 탭 (sticky) ── -->
    <div
      class="bg-apjek-surface px-5 pt-1 pb-3 flex flex-col gap-2 sticky z-10 border-b border-apjek-border"
      style="top: env(safe-area-inset-top, 0px)"
    >
      <!-- 아이템 | 배경 | 루비샵 — 활성 = 솔리드 블루 필 -->
      <div class="flex gap-2">
        <button
          v-for="[cat, label] in shopCats"
          :key="cat"
          type="button"
          class="flex-1 h-9 rounded-full text-[14px] font-semibold transition-all"
          :class="shopCat === cat
            ? 'bg-apjek-blue text-white'
            : 'bg-apjek-surface text-apjek-text border border-apjek-border-strong'"
          @click="shopCat = cat"
        >
          {{ label }}
        </button>
      </div>

      <!-- 일반 | 희귀 | 판타지 세그먼트 -->
      <div class="flex h-9 rounded-full p-[3px] bg-apjek-bg">
        <button
          v-for="r in rarities"
          :key="r"
          type="button"
          class="flex-1 rounded-full text-[12px] font-semibold transition-all"
          :class="rarity === r
            ? 'bg-apjek-surface text-apjek-text'
            : 'text-apjek-text-sub'"
          @click="rarity = r"
        >
          {{ RARITY_LABEL[r] }}
        </button>
      </div>
    </div>

    <!-- ── 아이템 그리드 ── -->
    <div class="flex-1 px-4 pt-4 pb-8">
      <!-- 에러 -->
      <div v-if="fetchError" class="flex flex-col items-center justify-center py-20 gap-3 text-apjek-text-faint">
        <div class="text-5xl mb-1">⚠️</div>
        <p class="text-sm font-medium text-riso-poppy">아이템을 불러오지 못했어요</p>
        <!-- raw error.message 는 사용자에게 노출하지 않는다 (audit C4-3) — curated 문구로 대체 -->
        <p class="text-xs text-apjek-text-faint">잠시 후 다시 시도해 주세요</p>
        <button
          type="button"
          class="apjek-cta mt-2 h-10 px-5 text-sm"
          @click="reload()"
        >
          다시 시도
        </button>
      </div>

      <!-- 최초 로드 (top-level await 를 걷어낸 뒤의 로딩 표면) -->
      <CommonLoading v-else-if="pending" variant="skeleton" />

      <!-- 빈 상태 (배경 문구 유지 + 루비샵은 준비 중) -->
      <div
        v-else-if="filteredItems.length === 0"
        class="flex flex-col items-center justify-center py-20 text-apjek-text-faint"
      >
        <div class="text-5xl mb-3">{{ shopCat === 'ruby' ? '💎' : '🌿' }}</div>
        <p class="text-sm font-medium">
          {{ emptyMessage }}
        </p>
        <p v-if="shopCat === 'ruby'" class="text-xs mt-1">
          상품 구성이 확정되면 열려요
        </p>
      </div>

      <!-- 그리드 (frame-shop 2열 정합) -->
      <div v-else class="grid grid-cols-2 gap-3">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="apjek-card flex flex-col items-center p-3 active:scale-[0.97] transition-transform"
        >
          <!-- 이름 -->
          <p class="text-[13px] font-semibold text-apjek-text text-center mb-2">
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

          <!-- 태그 (등급 | 종류) -->
          <div class="flex items-center gap-1 mt-2 mb-1">
            <span class="text-[10px] font-semibold px-2 py-[1px] rounded-full text-apjek-text-sub border border-apjek-border-strong whitespace-nowrap">
              {{ RARITY_LABEL[toRarityKey(item.rarity)] }}
            </span>
            <span class="text-[10px] font-semibold px-2 py-[1px] rounded-full text-apjek-text-sub border border-apjek-border-strong whitespace-nowrap">
              {{ item.layout === 'BACKGROUND' ? '배경' : '식물' }}
            </span>
          </div>

          <!-- 가격 (☆ + 수량) -->
          <div class="flex items-center gap-1 mb-2 text-apjek-text-sub">
            <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
              <path :d="COIN_PATH" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="text-[12px]">{{ priceLabel(item) }}</span>
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

          <!-- CTA — 보유중=연블루 필 / 구매하기=화이트 보더 / 재화 부족=비활성 -->
          <button
            type="button"
            :disabled="isOwned(item) || !canAfford(item) || purchasing === item.id"
            class="w-full h-7 rounded-full text-[12px] font-semibold text-center transition-all"
            :class="isOwned(item)
              ? 'bg-apjek-blue-soft text-apjek-blue-deep cursor-default'
              : canAfford(item)
                ? 'bg-apjek-surface text-apjek-text border border-apjek-border-strong'
                : 'bg-apjek-surface text-apjek-text-faint border border-apjek-border cursor-not-allowed'"
            @click="onPurchase(item)"
          >
            {{ purchasing === item.id ? '...' : isOwned(item) ? '보유중' : canAfford(item) ? '구매하기' : '재화 부족' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── 재화 환전 다이얼로그 (from 재화 선택 확장 — S2) ── -->
    <ShopExchangeDialog v-model="showExchange" />
  </div>
</template>

<script setup lang="ts">
import type {
  CurrencyResponse,
  ItemResponse,
  PurchaseResponse,
} from '@terraworld-it/openapi-frontend'
import { balanceOf } from '~/utils/currency'
import { useItemsStore } from '~/stores/items'
import { useUserStore } from '~/stores/user'

// loadShop() 이 게스트용 분기 없이 무조건 sdk.getMe() 를 호출·실패 시 throw 하므로
// 실질적으로 로그인 필요 — '/shop' 을 middleware/auth.ts PUBLIC_EXACT 에서도 제거함.
definePageMeta({ layout: 'default', middleware: 'auth' })

type ShopCat = 'plant' | 'background' | 'ruby'
type RarityKey = 'common' | 'rare' | 'epic'

const RARITY_LABEL: Record<RarityKey, string> = { common: '일반', rare: '희귀', epic: '판타지' }
// 루비샵은 탭만 우선 오픈 — 상품 구성 결정 대기 (빈 상태만 노출, 구매 로직 없음)
const shopCats: [ShopCat, string][] = [['plant', '아이템'], ['background', '배경'], ['ruby', '루비샵']]
const rarities: RarityKey[] = ['common', 'rare', 'epic']

// TW2 CoinIcon path (imports/상점/svg-xdmk87hcob.ts → p295e8380)
const COIN_PATH = 'M5.7625 1.1475C5.78441 1.10323 5.81826 1.06597 5.86023 1.03991C5.90219 1.01386 5.9506 1.00005 6 1.00005C6.0494 1.00005 6.09781 1.01386 6.13977 1.03991C6.18174 1.06597 6.21559 1.10323 6.2375 1.1475L7.3925 3.487C7.46859 3.64098 7.58091 3.7742 7.71981 3.87523C7.85872 3.97625 8.02006 4.04206 8.19 4.067L10.773 4.445C10.8219 4.45209 10.8679 4.47274 10.9057 4.5046C10.9436 4.53646 10.9717 4.57827 10.987 4.6253C11.0023 4.67233 11.0041 4.7227 10.9923 4.77072C10.9805 4.81873 10.9554 4.86248 10.92 4.897L9.052 6.716C8.92881 6.83605 8.83664 6.98424 8.78342 7.14781C8.7302 7.31139 8.71753 7.48544 8.7465 7.655L9.188 10.228C9.19681 10.2769 9.19175 10.3273 9.17337 10.3735C9.155 10.4197 9.12406 10.4599 9.08407 10.4894C9.04408 10.5189 8.99664 10.5367 8.94711 10.5407C8.89757 10.5447 8.84791 10.5348 8.8035 10.512L6.4935 9.298C6.34142 9.21815 6.17227 9.1764 6.0005 9.1764C5.82873 9.1764 5.65958 9.21815 5.5075 9.298L3.1975 10.512C3.15309 10.5348 3.10343 10.5447 3.05389 10.5407C3.00436 10.5367 2.95692 10.5189 2.91693 10.4894C2.87694 10.4599 2.846 10.4197 2.82763 10.3735C2.80925 10.3273 2.80419 10.2769 2.813 10.228L3.254 7.655C3.28297 7.48544 3.2703 7.31139 3.21708 7.14781C3.16386 6.98424 3.07169 6.83605 2.9485 6.716L1.0805 4.897C1.04506 4.86248 1.01999 4.81873 1.00818 4.77072C0.996372 4.7227 0.998165 4.67233 1.01345 4.6253C1.02874 4.57827 1.05685 4.53646 1.09468 4.5046C1.13251 4.47274 1.17855 4.45209 1.2275 4.445L3.8105 4.067C3.98044 4.04206 4.14178 3.97625 4.28069 3.87523C4.41959 3.7742 4.53191 3.64098 4.608 3.487L5.7625 1.1475Z'

const { sdk, client } = useOpenApi()
const userStore = useUserStore()
const itemsStore = useItemsStore()
const toast = useToast()
const { itemAssetUrl, onAssetError } = useItemAsset()
const { trackItemPurchased } = useGtagEvents()

const shopCat = ref<ShopCat>('plant')
const rarity = ref<RarityKey>('common')
const showExchange = ref<boolean>(false)

// 재화/소유목록/아이템 카탈로그는 스토어가 TTL 캐시를 소유한다. 홈에서 막 넘어온 경우
// 두 요청 모두 캐시 적중이라 네트워크 왕복 없이 즉시 그려진다.
const currency = computed<CurrencyResponse | null>(() => userStore.currency)
const items = computed<ItemResponse[]>(() => itemsStore.items as ItemResponse[])
const ownedSlugs = computed<Set<string>>(() => new Set(userStore.ownedItems))
const purchasing = ref<number | null>(null)
const fetchError = ref<Error | null>(null)
const pending = ref<boolean>(true)

// --- 최초 로드 ---
//
// 이전에는 setup 최상단에서 `await loadShop()` 을 했다. 그러면 페이지 컴포넌트가 async 가 되어
// Nuxt 의 Suspense 가 로드가 끝날 때까지 **직전 화면을 그대로 얼려 둔다** — 사용자에겐 탭을
// 눌렀는데 아무 반응이 없는 것으로 보인다. onMounted 로 옮기고 스켈레톤을 띄운다.
async function loadShop(force: boolean = false) {
  await Promise.all([
    userStore.fetchMe(force),
    itemsStore.fetchAll(force),
  ])
}

async function reload(force: boolean = true) {
  const isRetry: boolean = !pending.value
  fetchError.value = null
  // 재시도 버튼을 눌렀을 때도 로딩 표면을 보여준다. 이걸 빼면 에러 블록만 사라지고
  // 아무 일도 일어나지 않는 것처럼 보인다.
  pending.value = true
  try {
    await loadShop(force)
  }
  catch (e) {
    fetchError.value = e as Error
    // 최초 진입 실패는 화면의 재시도 블록이 이미 알린다 — 토스트까지 겹치지 않게 한다.
    if (isRetry) toast.error((e as Error).message)
  }
  finally {
    pending.value = false
  }
}

onMounted(() => {
  void reload(false)
})

// --- 파생 ---
function toRarityKey(r: ItemResponse['rarity']): RarityKey {
  return r === 'RARE' ? 'rare' : r === 'EPIC' ? 'epic' : 'common'
}

const filteredItems = computed<ItemResponse[]>(() => {
  // 루비샵은 상품 구성 확정 전 — 카탈로그 없이 빈 상태만 노출
  if (shopCat.value === 'ruby') return []
  return items.value.filter((it) => {
    const isBg = it.layout === 'BACKGROUND'
    if (shopCat.value === 'background' && !isBg) return false
    if (shopCat.value === 'plant' && isBg) return false
    return toRarityKey(it.rarity) === rarity.value
  })
})

const emptyMessage = computed<string>(() => {
  if (shopCat.value === 'ruby') return '루비샵을 준비 중이에요'
  if (shopCat.value === 'background') return '배경 아이템 준비중이에요 🚀'
  return '해당 등급 아이템이 없습니다'
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
      // 스토어를 갱신하면 홈/테라리움이 다음 진입 때 새 잔액·소유목록을 그대로 본다.
      userStore.updateCurrency(purchased.updatedCurrency)
      userStore.updateOwnedItems(purchased.ownedItems)
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

// 재화 스냅샷 재조회 (구매 실패 후 잔액 정합 복구) — TTL 캐시를 무시해야 의미가 있다.
async function refreshCurrency() {
  try {
    await userStore.fetchMe(true)
  }
  catch {
    // 정합 복구는 best-effort — 실패해도 다음 진입에서 다시 맞춘다.
  }
}
</script>
