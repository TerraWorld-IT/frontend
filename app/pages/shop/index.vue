<template>
  <div class="flex flex-col min-h-full -mx-5 -mt-4 bg-apjek-surface" data-testid="shop-page">
    <!-- ── 헤더 (아프젝 화이트) ── -->
    <div class="px-5 pt-8 pb-4">
      <div class="flex items-start justify-between mb-1">
        <h1 class="font-bold text-[29px] text-apjek-text tracking-[-0.9px] leading-[32px]">
          상점
        </h1>
        <button
          type="button"
          data-testid="shop-exchange-trigger"
          class="relative after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-[''] apjek-cta h-10 px-4 text-[13px] active:scale-[0.97] transition-transform"
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

    <!-- ── 카테고리 탭 (sticky) — S3b: [아이템][배경] 2개 (루비샵 탭·등급 세그먼트 제거, §4-1 기본값) ── -->
    <div
      class="native-safe-area-sticky bg-apjek-surface px-5 pt-1 pb-3 flex flex-col gap-2 sticky top-0 z-10 border-b border-apjek-border"
    >
      <!-- 활성 = 솔리드 블루 필 -->
      <div class="flex gap-2">
        <button
          v-for="[cat, label] in shopCats"
          :key="cat"
          type="button"
          class="relative after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] flex-1 h-9 rounded-full text-[14px] font-semibold transition-all"
          :class="shopCat === cat
            ? 'bg-apjek-blue text-white'
            : 'bg-apjek-surface text-apjek-text border border-apjek-border-strong'"
          @click="shopCat = cat"
        >
          {{ label }}
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
          class="relative after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-[''] apjek-cta mt-2 h-10 px-5 text-sm"
          @click="reload()"
        >
          다시 시도
        </button>
      </div>

      <!-- 최초 로드: 대표 상품 6개(3행)의 실제 카드 래퍼와 290px 행 높이를 예약한다. -->
      <div
        v-else-if="pending"
        class="grid grid-cols-2 gap-3"
        data-testid="shop-layout-skeleton"
        data-layout-anchor="shop-grid"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="로딩 중"
      >
        <div v-for="n in 6" :key="n" class="apjek-card flex h-[290px] flex-col items-center p-3" data-testid="shop-skeleton-card">
          <div class="mb-2 h-5 w-3/4 rounded-lg bg-apjek-border animate-pulse" />
          <div class="h-[130px] w-full flex items-center justify-center">
            <div class="size-[112px] rounded-[36px] bg-apjek-border animate-pulse" />
          </div>
          <div class="mt-2 mb-3 h-[54px] w-14 rounded-lg bg-apjek-border animate-pulse" />
          <div class="h-8 w-full rounded-full bg-apjek-border animate-pulse" />
        </div>
        <span class="sr-only">로딩 중</span>
      </div>

      <!-- 빈 상태 (배경은 백엔드 시드 후 자동 노출 — 카피 유지 / 루비샵은 플래그로 숨김) -->
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

      <!-- 그리드 (Figma 상점 2열 카드: 이름 / 일러스트 / 토큰아이콘+가격 / CTA) -->
      <div v-else class="grid grid-cols-2 gap-3" data-layout-anchor="shop-grid">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="apjek-card flex flex-col items-center p-3 active:scale-[0.97] transition-transform"
          :class="isOwned(item) ? 'opacity-90' : ''"
          data-testid="shop-item-card"
        >
          <!-- 이름 (상단) -->
          <p class="text-[13px] font-semibold text-apjek-text text-center mb-2 truncate w-full">
            {{ item.name }}
          </p>

          <!-- 일러스트 영역 — 디자이너 식물 PNG(public/items/<slug>.png) -->
          <div class="w-full h-[130px] flex items-center justify-center">
            <div
              class="flex items-center justify-center"
              :class="item.rarity === 'RARE' ? 'animate-sway' : item.isAnimated ? 'animate-float' : ''"
            >
              <img
                :src="itemImageUrl(item)"
                :alt="item.name"
                width="112"
                height="112"
                loading="lazy"
                class="w-[112px] h-[112px] object-contain"
                @error="onAssetError"
              >
            </div>
          </div>

          <!-- 가격 — Figma: 미니 토큰 아이콘 / 토큰명(작게) / 수량(굵게) 세로 2줄 (MIXED 는 재화별 반복) -->
          <div class="flex items-start justify-center gap-[12px] mt-2 mb-3">
            <div
              v-for="part in priceParts(item)"
              :key="part.label"
              class="flex flex-col items-center gap-[2px]"
            >
              <IconsCurrencyIcon v-if="part.code" :code="part.code" :size="20" />
              <span class="text-[10px] text-apjek-text-sub leading-[14px] whitespace-nowrap">{{ part.label }}</span>
              <span class="text-[13px] font-bold text-apjek-text leading-[16px] tabular-nums">{{ part.amount }}</span>
            </div>
          </div>

          <!-- CTA — 검정 [구매하기] / 연파랑 [보유중](disabled) / 재화 부족 시 비활성 -->
          <button
            type="button"
            :disabled="isOwned(item) || !canAfford(item) || purchasing === item.id"
            class="relative after:absolute after:inset-x-0 after:-inset-y-[6px] after:content-[''] w-full h-8 rounded-full text-[12px] font-semibold text-center transition-all disabled:active:scale-100"
            :class="isOwned(item)
              ? 'bg-apjek-blue-soft text-apjek-blue-deep cursor-default'
              : canAfford(item)
                ? 'bg-apjek-cta text-white active:opacity-85'
                : 'bg-apjek-bg text-apjek-text-faint border border-apjek-border cursor-not-allowed'"
            @click="onPurchase(item)"
          >
            {{ purchasing === item.id ? '...' : isOwned(item) ? '보유중' : '구매하기' }}
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
import { isPurchasable, priceParts, sortOwnedLast, tokenCodeForItem } from '~/utils/shop'
import { useItemsStore } from '~/stores/items'
import { useUserStore } from '~/stores/user'

// loadShop() 이 게스트용 분기 없이 무조건 sdk.getMe() 를 호출·실패 시 throw 하므로
// 실질적으로 로그인 필요 — '/shop' 을 middleware/auth.ts PUBLIC_EXACT 에서도 제거함.
definePageMeta({ layout: 'default', middleware: 'auth' })

type ShopCat = 'plant' | 'background' | 'ruby'

// 루비샵 탭 — 8/21 Figma 에 없음(§4-1 기본값: 탭 제거). 코드는 삭제하지 않고 플래그로 숨긴다.
const SHOW_RUBY_SHOP = false
const ALL_SHOP_CATS: [ShopCat, string][] = [['plant', '아이템'], ['background', '배경'], ['ruby', '루비샵']]
const shopCats: [ShopCat, string][] = ALL_SHOP_CATS.filter(([cat]) => SHOW_RUBY_SHOP || cat !== 'ruby')

const { sdk, client } = useOpenApi()
const userStore = useUserStore()
const itemsStore = useItemsStore()
const toast = useToast()
const { itemAssetUrl, placeholderUrl, onAssetError } = useItemAsset()
const { trackItemPurchased } = useGtagEvents()

const shopCat = ref<ShopCat>('plant')
const showExchange = ref<boolean>(false)

// 재화/소유목록/아이템 카탈로그는 스토어가 TTL 캐시를 소유한다. 홈에서 막 넘어온 경우
// 두 요청 모두 캐시 적중이라 네트워크 왕복 없이 즉시 그려진다.
const currency = computed<CurrencyResponse | null>(() => userStore.currency)
const items = computed<readonly ItemResponse[]>(() => itemsStore.items)
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
const filteredItems = computed<ItemResponse[]>(() => {
  // 루비샵은 상품 구성 확정 전 — 카탈로그 없이 빈 상태만 노출
  if (shopCat.value === 'ruby') return []
  const list = items.value.filter((it) => {
    // 비판매 아이템(정령 등, purchasable=false) 은 상점에 그리지 않는다.
    if (!isPurchasable(it)) return false
    const isBg = it.layout === 'BACKGROUND'
    if (shopCat.value === 'background') return isBg
    return !isBg
  })
  // 보유중 카드는 목록 뒤로(Figma 댓글 #57) — 미보유끼리의 원래 순서는 유지.
  return sortOwnedLast(list, isOwned)
})

const emptyMessage = computed<string>(() => {
  if (shopCat.value === 'ruby') return '루비샵을 준비 중이에요'
  if (shopCat.value === 'background') return '배경 아이템 준비중이에요 🚀'
  return '판매 중인 아이템이 없어요'
})

function isOwned(item: ItemResponse): boolean {
  return ownedSlugs.value.has(item.slug ?? '')
}

// 상품 이미지 — BACKGROUND 는 DB 의 죽은 외부 assetUrl 을 요청하지 않고 로컬 slug 규약을 우선한다(D5).
// 그 외 상품은 기존 assetUrl 우선 규칙을 유지하며, slug 없는 배경은 즉시 placeholder 로 내린다.
function itemImageUrl(item: ItemResponse): string {
  if (item.layout === 'BACKGROUND') return item.slug ? itemAssetUrl(item.slug) : placeholderUrl
  const url = item.assetUrl
  if (url && (url.startsWith('http') || url.startsWith('/'))) return url
  return itemAssetUrl(item.slug ?? '', item.isAnimated ? 'gif' : 'png')
}

// canAfford — 7화폐 정규화 잔액으로 판정. priceType 별 주 재화.
// TOKEN/MIXED 의 토큰 종류는 카테고리명(산책→이슬 …)으로 매핑해 검증하고, 매핑 불가(커스텀 카테고리)
// 는 낙관(true) — 서버가 최종 잔액을 검증한다.
function canAfford(item: ItemResponse): boolean {
  const coin = balanceOf(currency.value, 'COIN')
  const ruby = balanceOf(currency.value, 'RUBY')
  if (item.priceType === 'BASIC') return coin >= item.priceAmount
  if (item.priceType === 'SPECIAL') return ruby >= item.priceAmount
  const tokenCode = tokenCodeForItem(item)
  if (item.priceType === 'MIXED') {
    if (coin < item.priceAmount) return false
    return tokenCode ? balanceOf(currency.value, tokenCode) >= (item.tokenPrice ?? 0) : true
  }
  // TOKEN: 활동 토큰 단독
  return tokenCode ? balanceOf(currency.value, tokenCode) >= item.priceAmount : true
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
    // 커스텀 카테고리 TOKEN/MIXED 는 클라 낙관 → 서버 잔액 부족 시 INSUFFICIENT_FUNDS 안내
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
