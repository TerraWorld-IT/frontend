<!--
  홈 병 캐러셀 (아프젝 T14 FE 선행분 — Figma Frame 1000003667 409×467, 댓글 #43/#46).
  슬라이드 1 = 현재 병(부모가 slot 으로 넘기는 기존 Jar 스테이지), 슬라이드 2/3 = Lv.2/Lv.3 카드.
  - 잠금 카드: 원형 글로우 안 병 실루엣 + "Lv.N" + 🔒 [해금하기] + "루비 N개를 사용하여 새로운 테라리움 해금하기"
    → 탭 시 unlock emit(부모가 해금 팝업을 연다).
  - 해금된 카드: 탭 시 select emit — 부모가 표시 병 전환(`PUT /terrarium/active-tier`) 후 스냅샷을
    재조회해 슬라이드 1 의 스테이지가 그 병의 배치로 바뀐다(배치는 티어별 저장, 댓글 #46).
    selectedLevel = 현재 표시 중인 병(activeTier) 레벨.
  - 네이티브 가로 스크롤 스냅(swipe) + 하단 도트. locked(관리/힐링 모드)면 스와이프를 막고 첫 슬라이드로 고정.
  슬라이드에는 transform 을 두지 않는다 — 힐링 모드에서 스테이지가 fixed 로 승격될 때 containing block 이 바뀌면 안 된다.
  등록명: TerrariumJarCarousel.
-->
<template>
  <div class="w-full">
    <div
      ref="track"
      class="flex w-full"
      :class="locked ? 'overflow-hidden' : 'overflow-x-auto snap-x snap-mandatory scrollbar-hide'"
      style="scroll-behavior: smooth; -webkit-overflow-scrolling: touch"
      data-testid="jar-carousel"
      @scroll.passive="onScroll"
    >
      <!-- 슬라이드 1 — 현재 병 -->
      <div class="w-full shrink-0 snap-center" data-testid="jar-slide-current">
        <slot />
      </div>

      <!-- 슬라이드 2/3 — Lv.2 / Lv.3 (locked 모드에선 숨김) -->
      <div
        v-for="lv in cardLevels"
        v-show="!locked"
        :key="lv.level"
        class="w-full shrink-0 snap-center flex items-center justify-center py-5"
        :data-testid="`jar-slide-${lv.level}`"
      >
        <button
          type="button"
          class="relative w-[300px] max-w-[88%] aspect-[300/420] rounded-full flex flex-col items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          :style="{
            background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 55%, rgba(255,255,255,0) 72%)',
            outline: selectedLevel === lv.level && lv.unlocked ? '2px solid var(--color-apjek-blue)' : 'none',
            outlineOffset: '-12px',
          }"
          :aria-label="lv.unlocked ? `Lv.${lv.level} 테라리움으로 전환` : `Lv.${lv.level} 테라리움 해금하기`"
          @click="lv.unlocked ? emit('select', lv) : emit('unlock', lv)"
        >
          <!-- 병 실루엣 — 해금 전 회색, 해금 후 원본 톤 -->
          <div
            class="relative w-[150px] h-[207px] mb-1"
            :style="lv.unlocked ? {} : { filter: 'grayscale(1) brightness(0.92)', opacity: 0.55 }"
            aria-hidden="true"
          >
            <IconsJar1 />
          </div>
          <span class="text-base font-extrabold text-apjek-text">Lv.{{ lv.level }}</span>
          <template v-if="!lv.unlocked">
            <span class="apjek-chip text-xs" style="background: var(--color-apjek-cta); color: #fff; border-color: transparent">
              <Icon name="lucide:lock" class="w-3 h-3" />해금하기
            </span>
            <span class="text-[11px] text-apjek-text-sub text-center leading-snug px-6">
              루비 {{ lv.rubyCost }}개를 사용하여<br>새로운 테라리움 해금하기
            </span>
          </template>
          <template v-else>
            <span class="apjek-chip apjek-chip-active text-xs">
              <Icon name="lucide:check" class="w-3 h-3" />{{ selectedLevel === lv.level ? '보는 중' : '해금됨 · 이 병 보기' }}
            </span>
            <span class="text-[11px] text-apjek-text-faint text-center leading-snug px-6">배치 가능한 아이템 : {{ lv.slots }}개</span>
          </template>
        </button>
      </div>
    </div>

    <!-- 페이지 도트 (Figma 도트 3) -->
    <div v-if="!locked && slideCount > 1" class="flex justify-center gap-1.5 mt-1" role="tablist" aria-label="테라리움 슬라이드">
      <button
        v-for="i in slideCount"
        :key="i"
        type="button"
        role="tab"
        class="h-2 rounded-full transition-all"
        :style="{ width: index === i - 1 ? '16px' : '8px', background: index === i - 1 ? 'var(--color-apjek-blue)' : 'rgba(81,140,219,0.3)' }"
        :aria-selected="index === i - 1"
        :aria-label="`${i}번째 슬라이드`"
        @click="scrollTo(i - 1)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { JarLevel } from '~/utils/tierLevels'

const props = defineProps<{
  /** Lv1~3 레벨 목록(Lv1 포함 — Lv1 은 슬라이드 1 의 현재 병이라 카드로 그리지 않는다) */
  levels: JarLevel[]
  /** 현재 표시 중인 병(activeTier) 레벨 — 해금 카드의 '보는 중' 표시 기준 */
  selectedLevel: number
  /** 관리/힐링 모드 — 스와이프 잠금 + 첫 슬라이드 고정 */
  locked: boolean
}>()

const emit = defineEmits<{ unlock: [level: JarLevel], select: [level: JarLevel] }>()

const track = ref<HTMLElement | null>(null)
const index = ref<number>(0)

const cardLevels = computed<JarLevel[]>(() => props.levels.filter(l => l.level >= 2))
const slideCount = computed<number>(() => 1 + cardLevels.value.length)

function onScroll(): void {
  const el = track.value
  if (!el || el.clientWidth === 0) return
  index.value = Math.max(0, Math.min(slideCount.value - 1, Math.round(el.scrollLeft / el.clientWidth)))
}

function scrollTo(i: number): void {
  const el = track.value
  if (!el) return
  el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
}

// 잠금 전환 시 첫 슬라이드로 되돌린다 — 관리/힐링 모드는 항상 현재 병 기준.
watch(() => props.locked, (locked) => {
  if (!locked) return
  const el = track.value
  if (el) el.scrollLeft = 0
  index.value = 0
})
</script>
