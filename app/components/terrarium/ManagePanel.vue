<!--
  관리 모드 하단 고정 패널 (아프젝 T13 — Figma "나의테라 - 아이템배치/정렬").
  제목("보유 아이템 목록"/"보유 정령 목록"/"보유 배경 목록") + 가로 스크롤 타일(72px 아이콘 + 이름,
  배치/선택된 타일은 체크 표시) + 하단 [저장하기] 필 버튼. 탭 칩 3종은 부모(홈 상단)가 소유하고
  현재 탭만 내려받는다. 타일 탭/저장/빈 상태 CTA 동작은 부모가 소유 — emit 만 한다.
  하단 nav 를 덮는 fixed 패널(모달 시트와 같은 규약 — nav 가 "보이지만 안 눌리는 미끼"가 되지 않게).
  등록명: TerrariumManagePanel.
-->
<template>
  <Teleport to="body">
    <Transition name="manage-panel">
      <section
        v-if="open"
        v-bind="$attrs"
        class="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-md flex flex-col"
        style="background: var(--color-apjek-surface); padding-bottom: calc(0.75rem + var(--sab)); max-height: calc(100dvh - var(--sat)); padding-left: max(0px, calc(var(--sal) - (100vw - min(100vw, 28rem)) / 2)); padding-right: max(0px, calc(var(--sar) - (100vw - min(100vw, 28rem)) / 2))"
        aria-label="관리 패널"
        data-testid="manage-panel"
      >
        <!-- Figma 156:394 — 연블루 띠 안에 가운데 제목 + 가로 타일 카드, 그 아래 흰 영역에 가운데 [저장하기] 필 -->
        <div class="min-h-0 flex flex-col" style="background: color-mix(in srgb, var(--color-apjek-blue-soft) 55%, var(--color-apjek-surface))">
          <div class="shrink-0 px-5 pt-4 pb-1 text-center">
            <h3 class="text-[16px] font-bold text-apjek-text tracking-[-0.2px]">{{ title }}</h3>
            <p v-if="tab !== 'backgrounds'" class="text-[11px] text-apjek-text-faint mt-0.5">배치 {{ placedCount }}/{{ maxSlots }}</p>
          </div>

          <!-- 자식 m-auto = safe centering. `align-items: safe center` 는 미지원 브라우저에서 선언이
               통째로 무시돼 정렬이 사라진다(자동 여백은 남는 공간이 없으면 0 이라 잘림도 없다). -->
          <div class="min-h-0 overflow-y-auto flex">
            <div v-if="busy" class="min-h-[124px] w-full m-auto flex justify-center py-6">
              <CommonLoading variant="spinner" />
            </div>
            <div v-else-if="tiles.length === 0" class="min-h-[124px] w-full m-auto px-5 py-4 flex flex-col items-center justify-center gap-3 text-center">
              <p class="text-xs text-apjek-text-faint leading-relaxed">{{ emptyMessage }}</p>
              <button
                v-if="emptyCtaLabel"
                type="button"
                class="relative after:absolute after:inset-x-0 after:top-1/2 after:-translate-y-1/2 after:min-h-11 after:h-full after:content-[''] rounded-full px-4 py-1.5 text-[12px] font-semibold text-white shrink-0"
                style="background: var(--color-apjek-blue)"
                @click="emit('emptyCta')"
              >{{ emptyCtaLabel }}</button>
            </div>
            <!-- 가로 스크롤 타일 카드 96px — 아이콘 + 이름을 카드 안에 (댓글 #54 좌우 스크롤) -->
            <div v-else class="min-h-[124px] w-full m-auto overflow-x-auto scrollbar-hide px-5 pt-2 pb-4">
              <div class="flex gap-3 w-max">
                <button
                  v-for="tile in tiles"
                  :key="tile.id"
                  type="button"
                  class="relative w-[96px] h-[96px] rounded-[16px] flex flex-col items-center justify-center gap-1 shrink-0 overflow-hidden transition-all active:scale-95"
                  :style="{
                    background: tile.checked ? 'var(--color-apjek-blue-soft)' : 'color-mix(in srgb, var(--color-apjek-surface) 85%, var(--color-apjek-blue-soft))',
                    border: tile.checked ? '1.5px solid var(--color-apjek-blue)' : '1.5px solid transparent',
                  }"
                  :data-testid="`manage-tile-${tile.id}`"
                  @click="emit('tile', tile)"
                >
                  <img
                    v-if="isAssetUrl(tile.assetUrl)"
                    :src="tile.assetUrl"
                    :alt="tile.name"
                    class="w-12 h-12 object-contain"
                    draggable="false"
                    @error="onAssetError"
                  >
                  <span v-else class="text-3xl" aria-hidden="true"><Icon name="lucide:image" class="w-[1em] h-[1em]" aria-hidden="true" /></span>
                  <span class="text-[11px] font-semibold text-apjek-blue-deep text-center leading-tight whitespace-nowrap max-w-[84px] truncate">{{ tile.name }}</span>
                  <span
                    v-if="tile.checked"
                    class="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white"
                    style="background: var(--color-apjek-blue)"
                  >
                    <Icon name="lucide:check" class="w-3 h-3" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="shrink-0 px-5 pt-4 pb-1 flex justify-center">
          <button
            type="button"
            data-testid="manage-save"
            class="h-12 px-8 rounded-full text-[15px] font-bold inline-flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
            style="background: #bcdadd; color: #2f5f63"
            :disabled="saving || busy"
            @click="emit('save')"
          >
            {{ saving ? '저장 중…' : '저장하기' }}
          </button>
        </div>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

/** 패널 탭 — 상단 칩 3종과 1:1 */
export type ManageTab = 'items' | 'spirits' | 'backgrounds'

/** 패널 타일 — 부모가 탭별로 만들어 내려준다 */
export interface ManageTile {
  id: number
  name: string
  /** 에셋 URL 또는 이모지 */
  assetUrl: string
  /** 배치됨(아이템/정령) 또는 현재 적용 중(배경) */
  checked: boolean
}

const props = withDefaults(defineProps<{
  open: boolean
  tab: ManageTab
  tiles: ManageTile[]
  /** 타일 로딩/배치 진행 중 */
  busy: boolean
  /** 저장 진행 중 */
  saving: boolean
  /** 배치 가능 슬롯 수 */
  maxSlots: number
  /** 현재 배치된 아이템 수 */
  placedCount: number
  /** 빈 상태 CTA 라벨(없으면 버튼 미표시) */
  emptyCtaLabel?: string
}>(), {
  emptyCtaLabel: undefined,
})

const emit = defineEmits<{ tile: [tile: ManageTile], save: [], emptyCta: [] }>()
const { onAssetError } = useItemAsset()

const title = computed<string>(() => {
  if (props.tab === 'spirits') return '보유 정령 목록'
  if (props.tab === 'backgrounds') return '보유 배경 목록'
  return '보유 아이템 목록'
})

const emptyMessage = computed<string>(() => {
  if (props.tab === 'spirits') return '아직 정령이 없어요 · 키우기에서 30일 기록하면 정령을 얻어요'
  if (props.tab === 'backgrounds') return '배경 아이템이 없어요 · 상점에서 배경 아이템을 구매해보세요'
  return '보유한 아이템이 없어요 · 상점에서 구매해보세요'
})

</script>

<style scoped>
/* 아래에서 올라오는 패널 — X 는 translate 유틸 미사용이라 transform 단독 사용 안전 */
.manage-panel-enter-active,
.manage-panel-leave-active { transition: transform 0.28s ease, opacity 0.28s ease; }
.manage-panel-enter-from,
.manage-panel-leave-to { transform: translateY(100%); opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .manage-panel-enter-active,
  .manage-panel-leave-active { transition-duration: 0.01ms; }
}
</style>
