<!--
  자유배치 PoC. 5슬롯 grid 가 아닌 임의 위치(posX/posY 0~1) 에 아이템 배치.
  PointerEvent 기반 직접 구현으로 mouse + touch 모두 지원.

  현재 미구현 (다음 turn):
    - 인벤토리에서 아이템 가져오기 (현재는 더미 3개)
    - drag end 시 backend PUT /terrarium/items/:id (현재는 메모리 상태만)
    - 회전/크기 조절 핸들
-->
<template>
  <div class="riso-grain min-h-screen px-4 py-4 space-y-4">
    <div class="space-y-1">
      <h2 class="font-bold text-[20px] leading-[28px] text-black tracking-[-0.45px]">
        자유배치
      </h2>
      <p class="text-[14px] leading-[20px] text-[#525252] tracking-[-0.15px]">
        아이템을 원하는 곳으로 드래그해 보세요
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

      <!-- 아이템 -->
      <div
        v-for="item in items"
        :key="item.id"
        class="absolute touch-none cursor-grab active:cursor-grabbing transition-transform"
        :class="{ 'scale-110 z-50': dragId === item.id }"
        :style="{
          left: `${item.posX * 100}%`,
          top: `${item.posY * 100}%`,
          transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
          zIndex: dragId === item.id ? 100 : item.zIndex,
        }"
        @pointerdown="(e) => onPointerDown(e, item)"
      >
        <span class="text-[64px] leading-none drop-shadow-md">{{ item.emoji }}</span>
      </div>
    </div>

    <!-- 액션 버튼 -->
    <div class="flex gap-2">
      <button
        type="button"
        class="flex-1 h-12 rounded-xl bg-riso-sage text-white font-semibold text-[14px] riso-shadow-sm active:scale-95"
        @click="onSave"
      >
        배치 저장
      </button>
      <button
        type="button"
        class="px-4 h-12 rounded-xl bg-white text-riso-dark font-semibold text-[14px] border border-riso-dark/15 active:scale-95"
        @click="onReset"
      >
        초기화
      </button>
    </div>

    <p class="text-[11px] text-riso-dark/45 text-center">
      ※ 자유배치 PoC — 현재는 메모리 상태만. 서버 저장은 추후 구현
    </p>

    <div
      v-if="!entitled"
      class="rounded-xl bg-riso-poppy/10 border border-riso-poppy/40 p-4 text-sm text-riso-dark"
    >
      <p class="font-semibold mb-1">유료 권리(자유배치)가 필요합니다</p>
      <p class="text-riso-dark/70 mb-2">
        현재는 미리보기 모드입니다. 결제를 마치면 슬롯 제약 없이 영구 저장됩니다.
      </p>
      <NuxtLink
        to="/upgrade/free-placement"
        class="inline-block px-3 py-1.5 text-sm bg-riso-sage text-white rounded-md"
      >
        유료 권리 안내 →
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

// 자유배치 entitlement 체크 — false 면 PoC 모드, true 면 정식 모드
const { sdk, client } = useOpenApi()
const entitled = ref(false)
;(async () => {
  try {
    const { data } = await sdk.getMe({ client })
    const me = castData<{ entitlements?: { freePlacement?: boolean } }>(data)
    entitled.value = Boolean(me?.entitlements?.freePlacement)
  } catch {
    entitled.value = false
  }
})()

interface FreeItem {
  id: number
  emoji: string
  posX: number // 0~1
  posY: number // 0~1
  rotation: number
  scale: number
  zIndex: number
}

const toast = useToast()
const { trackFreePlacementSaved } = useGtagEvents()
const canvasRef = ref<HTMLDivElement | null>(null)

const initialItems: FreeItem[] = [
  { id: 1, emoji: '🌿', posX: 0.3, posY: 0.7, rotation: -5, scale: 1, zIndex: 1 },
  { id: 2, emoji: '🌸', posX: 0.6, posY: 0.55, rotation: 8, scale: 0.9, zIndex: 2 },
  { id: 3, emoji: '🐱', posX: 0.5, posY: 0.85, rotation: 0, scale: 1.1, zIndex: 3 },
]
const items = ref<FreeItem[]>(JSON.parse(JSON.stringify(initialItems)))

const dragId = ref<number | null>(null)
let dragState: { startX: number; startY: number; baseX: number; baseY: number } | null = null

function onPointerDown(e: PointerEvent, item: FreeItem) {
  if (!canvasRef.value) return
  e.preventDefault()
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)
  dragId.value = item.id
  // z-index 를 가장 위로
  const maxZ = Math.max(...items.value.map((i) => i.zIndex), 0)
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
  const target = items.value.find((i) => i.id === dragId.value)
  if (!target) return
  target.posX = Math.max(0, Math.min(1, dragState.baseX + dxRatio))
  target.posY = Math.max(0, Math.min(1, dragState.baseY + dyRatio))
}

function onPointerUp() {
  dragId.value = null
  dragState = null
}

async function onSave() {
  if (!import.meta.client) return
  try {
    // PoC 의 더미 emoji 는 실제 inventory itemId 가 없어 sdk 호출은 건너뜀.
    // inventory 통합 후 아래 코드를 활성화한다.
    //
    // const { sdk, client } = useOpenApi()
    // const placedItems = items.value.map((it) => ({
    //   itemId: it.inventoryItemId, // 실제 inventory 아이템 ID (PoC 미구현)
    //   slotId: 0,                  // 자유배치는 slot 무관 (BE schema 보강 필요)
    //   posX: it.posX,
    //   posY: it.posY,
    //   rotation: it.rotation,
    //   scale: it.scale,
    //   zIndex: it.zIndex,
    // }))
    // const { error } = await sdk.updateTerrariumPlacements({ client, body: { placedItems } })
    // if (error) throw new Error(errMsg(error, '배치 저장 실패'))
    toast.success(`배치 저장 완료 (${items.value.length}개) — inventory 통합 후 서버 동기화`)
    trackFreePlacementSaved({ itemCount: items.value.length })
  }
  catch (e) {
    toast.error((e as Error).message)
  }
}

function onReset() {
  items.value = JSON.parse(JSON.stringify(initialItems))
  toast.info('기본 배치로 초기화')
}
</script>
