<!--
  자유배치. 5슬롯 grid 가 아닌 임의 위치(posX/posY 0~1) 에 아이템 배치.
  PointerEvent 기반 직접 구현으로 mouse + touch 모두 지원.

  N6 (구현 계획서 v4) + 2026-06-02 실 배선:
    - GET  /api/v1/terrarium/free-placement      → 현재 배치 아이템 + 자유 위치 로드
    - PUT  /api/v1/terrarium/free-placement/{id}  → posX/posY(0~1) 저장 (entitlement 필요)
    둘 다 @Hidden internal endpoint → useInternalApi raw fetch.
    좌표는 0~1 비율로 통신 (해상도 독립). 자유배치 권리(entitlement) 없으면 preview 모드 — 저장 시 403.
-->
<template>
  <div class="riso-grain min-h-screen px-4 py-4 space-y-4">
    <div class="space-y-1">
      <h2 class="font-bold text-[20px] leading-[28px] text-black tracking-[-0.45px]">
        {{ $t('terrarium.freePlacementTitle') }}
      </h2>
      <p class="text-[14px] leading-[20px] text-[#525252] tracking-[-0.15px]">
        {{ $t('terrarium.freePlacementDesc') }}
      </p>
    </div>

    <!-- 자유 캔버스 -->
    <div
      ref="canvasRef"
      class="relative w-full aspect-[3/4] bg-riso-cream rounded-2xl overflow-hidden riso-shadow-sm select-none"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <!-- 배경 그라데이션 (placeholder) -->
      <div class="absolute inset-0 bg-gradient-to-b from-riso-sky/30 to-riso-cream/0 pointer-events-none" />

      <!-- 로딩 -->
      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center text-riso-dark/40 text-sm"
      >
        {{ $t('common.loading') }}
      </div>

      <!-- 빈 상태: 배치된 아이템 없음 -->
      <div
        v-else-if="items.length === 0"
        class="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center"
      >
        <p class="text-riso-dark/55 text-sm">{{ $t('terrarium.freePlacementEmpty') }}</p>
        <NuxtLink to="/terrarium" class="px-3 py-1.5 text-sm bg-riso-sage text-white rounded-md">
          {{ $t('terrarium.freePlacementGoPlace') }}
        </NuxtLink>
      </div>

      <!-- 아이템 -->
      <div
        v-for="item in items"
        :key="item.placementId"
        class="absolute touch-none cursor-grab active:cursor-grabbing transition-transform"
        :class="{ 'scale-110 z-50': dragId === item.placementId }"
        :style="{
          left: `${item.posX * 100}%`,
          top: `${item.posY * 100}%`,
          transform: `translate(-50%, -50%)`,
          zIndex: dragId === item.placementId ? 100 : item.zIndex,
        }"
        :aria-label="item.name"
        @pointerdown="(e) => onPointerDown(e, item)"
      >
        <span class="text-[64px] leading-none drop-shadow-md">{{ item.image }}</span>
      </div>
    </div>

    <!-- 액션 버튼 -->
    <div class="flex gap-2">
      <button
        type="button"
        class="flex-1 h-12 rounded-xl bg-riso-sage text-white font-semibold text-[14px] riso-shadow-sm active:scale-95 disabled:opacity-50"
        :disabled="saving || items.length === 0"
        @click="onSave"
      >
        {{ $t('terrarium.freePlacementSave') }}
      </button>
      <button
        type="button"
        class="px-4 h-12 rounded-xl bg-white text-riso-dark font-semibold text-[14px] border border-riso-dark/15 active:scale-95"
        @click="onReset"
      >
        {{ $t('terrarium.freePlacementReset') }}
      </button>
    </div>

    <div
      v-if="!entitled"
      class="rounded-xl bg-riso-poppy/10 border border-riso-poppy/40 p-4 text-sm text-riso-dark"
    >
      <p class="font-semibold mb-1">{{ $t('terrarium.freePlacementEntitlementRequired') }}</p>
      <p class="text-riso-dark/70 mb-2">
        {{ $t('terrarium.freePlacementPreviewMode') }}
      </p>
      <NuxtLink
        to="/upgrade/free-placement"
        class="inline-block px-3 py-1.5 text-sm bg-riso-sage text-white rounded-md"
      >
        {{ $t('terrarium.freePlacementGuideLink') }}
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
// L4: 구 자유배치 페이지. 홈(index.vue)이 이미 자유배치(scale/flip/zIndex 영속)를
// 제공하므로 이 페이지는 중복/divergent(scale/flip/zIndex 누락). 링크 안전을 위해
// 페이지를 제거하는 대신 홈으로 redirect 한다.
definePageMeta({
  middleware: [
    'auth',
    () => navigateTo('/', { replace: true }),
  ],
})

interface FreeItem {
  placementId: number
  itemId: number
  image: string
  name: string
  posX: number // 0~1
  posY: number // 0~1
  isFreePlacement: boolean
  zIndex: number
}

interface FreePlacementApiItem {
  placementId: number
  itemId: number
  itemName: string
  itemImage: string
  itemLayout: string
  posX: number
  posY: number
  isFreePlacement: boolean
}
interface FreePlacementListResponse {
  items: FreePlacementApiItem[]
}

const { sdk, client } = useOpenApi()
const toast = useToast()
const { t } = useI18n()
const { trackFreePlacementSaved } = useGtagEvents()

const canvasRef = ref<HTMLDivElement | null>(null)
const entitled = ref<boolean>(false)
const loading = ref<boolean>(true)
const saving = ref<boolean>(false)
const items = ref<FreeItem[]>([])

// 아직 자유배치되지 않은 아이템에 줄 기본 시작 위치 (격자로 펼침).
function defaultPos(index: number): { x: number, y: number } {
  const col = index % 3
  const row = Math.floor(index / 3)
  return { x: 0.25 + col * 0.25, y: 0.3 + row * 0.22 }
}

async function load() {
  loading.value = true
  try {
    const { data } = await sdk.getMe({ client })
    const me = castData<{ entitlements?: { freePlacement?: boolean } }>(data)
    entitled.value = Boolean(me?.entitlements?.freePlacement)

    // 2026-06-04: off-spec raw fetch → 생성 SDK(listFreePlacements). spec/codegen 편입.
    const { data: listData } = await sdk.listFreePlacements({ client })
    const res = castData<FreePlacementListResponse>(listData)
    items.value = (res?.items ?? []).map((it, i): FreeItem => {
      const fallback = defaultPos(i)
      return {
        placementId: it.placementId,
        itemId: it.itemId,
        image: it.itemImage,
        name: it.itemName,
        posX: it.isFreePlacement ? it.posX : fallback.x,
        posY: it.isFreePlacement ? it.posY : fallback.y,
        isFreePlacement: it.isFreePlacement,
        zIndex: i + 1,
      }
    })
  }
  catch (e) {
    toast.error(errMsg(e, '불러오기 실패'))
  }
  finally {
    loading.value = false
  }
}

onMounted(load)

const dragId = ref<number | null>(null)
let dragState: { startX: number, startY: number, baseX: number, baseY: number } | null = null

function onPointerDown(e: PointerEvent, item: FreeItem) {
  if (!canvasRef.value) return
  e.preventDefault()
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)
  dragId.value = item.placementId
  // z-index 를 가장 위로
  const maxZ = Math.max(...items.value.map(i => i.zIndex), 0)
  item.zIndex = maxZ + 1
  dragState = {
    startX: e.clientX,
    startY: e.clientY,
    baseX: item.posX,
    baseY: item.posY,
  }
}

function onPointerMove(e: PointerEvent) {
  if (dragId.value === null || !dragState || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const dxRatio = (e.clientX - dragState.startX) / rect.width
  const dyRatio = (e.clientY - dragState.startY) / rect.height
  const target = items.value.find(i => i.placementId === dragId.value)
  if (!target) return
  target.posX = Math.max(0, Math.min(1, dragState.baseX + dxRatio))
  target.posY = Math.max(0, Math.min(1, dragState.baseY + dyRatio))
}

function onPointerUp() {
  dragId.value = null
  dragState = null
}

async function onSave() {
  if (!import.meta.client || saving.value) return
  if (!entitled.value) {
    toast.info(t('terrarium.freePlacementPreviewMode'))
    return
  }
  saving.value = true
  try {
    await Promise.all(
      items.value.map(it =>
        sdk.updateFreePosition({
          client,
          path: { placementId: it.placementId },
          body: { posX: it.posX, posY: it.posY },
        }),
      ),
    )
    items.value.forEach((it) => { it.isFreePlacement = true })
    toast.success(t('terrarium.freePlacementSaved', { n: items.value.length }))
    trackFreePlacementSaved({ itemCount: items.value.length })
  }
  catch (e) {
    toast.error(errMsg(e, '저장 실패'))
  }
  finally {
    saving.value = false
  }
}

function onReset() {
  load()
  toast.info(t('terrarium.freePlacementResetDone'))
}
</script>
