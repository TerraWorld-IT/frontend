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
        class="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-md rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col"
        style="background: var(--color-apjek-surface); padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px))"
        aria-label="관리 패널"
        data-testid="manage-panel"
      >
        <div class="px-5 pt-4 pb-2 flex items-center justify-between">
          <h3 class="text-[15px] font-bold text-apjek-text tracking-[-0.2px]">{{ title }}</h3>
          <span v-if="tab !== 'backgrounds'" class="text-[11px] text-apjek-text-faint">배치 {{ placedCount }}/{{ maxSlots }}</span>
        </div>

        <div class="min-h-[112px] flex items-center">
          <div v-if="busy" class="w-full flex justify-center py-6">
            <CommonLoading variant="spinner" />
          </div>
          <div v-else-if="tiles.length === 0" class="w-full px-5 py-4 flex items-center justify-between gap-3">
            <p class="text-xs text-apjek-text-faint leading-relaxed">{{ emptyMessage }}</p>
            <button
              v-if="emptyCtaLabel"
              type="button"
              class="rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shrink-0"
              style="background: var(--color-apjek-cta)"
              @click="emit('emptyCta')"
            >{{ emptyCtaLabel }}</button>
          </div>
          <!-- 가로 스크롤 타일 (댓글 #54 좌우 스크롤) -->
          <div v-else class="w-full overflow-x-auto scrollbar-hide px-5 py-2">
            <div class="flex gap-3 w-max">
              <button
                v-for="tile in tiles"
                :key="tile.id"
                type="button"
                class="w-[72px] flex flex-col items-center gap-1.5 shrink-0"
                :data-testid="`manage-tile-${tile.id}`"
                @click="emit('tile', tile)"
              >
                <span
                  class="relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center overflow-hidden transition-all"
                  :style="{
                    background: tile.checked ? 'var(--color-apjek-blue-soft)' : 'var(--color-apjek-bg)',
                    border: tile.checked ? '1.5px solid var(--color-apjek-blue)' : '1.5px solid var(--color-apjek-border)',
                  }"
                >
                  <img
                    v-if="isUrl(tile.assetUrl)"
                    :src="tile.assetUrl"
                    :alt="tile.name"
                    class="w-12 h-12 object-contain"
                    draggable="false"
                  >
                  <span v-else class="text-3xl" aria-hidden="true">{{ tile.assetUrl }}</span>
                  <span
                    v-if="tile.checked"
                    class="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white"
                    style="background: var(--color-apjek-blue)"
                  >
                    <Icon name="lucide:check" class="w-3 h-3" />
                  </span>
                </span>
                <span class="text-[10px] font-medium text-apjek-text-sub text-center leading-tight whitespace-nowrap max-w-[72px] truncate">{{ tile.name }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="px-5 pt-2">
          <button
            type="button"
            data-testid="manage-save"
            class="apjek-cta w-full py-3 disabled:opacity-40"
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

function isUrl(s: string | undefined | null): boolean {
  return !!s && (s.startsWith('http') || s.startsWith('/'))
}
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
