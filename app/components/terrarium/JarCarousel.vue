<!--
  홈 병 캐러셀 (아프젝 T14 FE 선행분 — Figma Frame 1000003667 409×467, 댓글 #43/#46).
  슬라이드는 항상 Lv.1 / Lv.2 / Lv.3 — 티어 카탈로그의 레벨당 한 장씩이며, 현재 표시 중인 병(activeTier)
  레벨의 슬라이드에만 부모가 slot 으로 넘기는 라이브 Jar 스테이지가 들어가고 나머지는 미리보기 카드다.
  - 잠금 카드: 원형 글로우 안 병 실루엣 + "Lv.N" + 🔒 [해금하기] + "루비 N개를 사용하여 새로운 테라리움 해금하기"
    → 탭 시 unlock emit(부모가 해금 팝업을 연다).
  - 해금된 카드(비활성 병): 탭 시 select emit — 부모가 표시 병 전환(`PUT /terrarium/active-tier`) 후 스냅샷을
    재조회하면 라이브 스테이지가 그 레벨의 슬라이드로 옮겨 간다(배치는 티어별 저장, 댓글 #46).
    Lv.1 카드도 같은 규칙이라 상위 병을 보던 사용자가 Lv.1 로 되돌아올 수 있다. 활성 병은 카드로 중복되지 않는다.
  - 네이티브 가로 스크롤 스냅(swipe) + 하단 도트. locked(관리/힐링 모드)면 스와이프를 막고 라이브 슬라이드만 남긴다.
  - 카탈로그 미로드(levels 빈 배열)면 라이브 슬라이드 한 장만 그린다.
  슬라이드에는 transform 을 두지 않는다 — 힐링 모드에서 스테이지가 fixed 로 승격될 때 containing block 이 바뀌면 안 된다.
  카드 글로우/글자색은 토큰 기반이라 .dark 에서도 대비가 유지된다.
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
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
      @touchcancel.passive="onTouchCancel"
      @click.capture="onClickCapture"
    >
      <template v-for="slide in slides" :key="slide.level">
        <!-- 라이브 슬라이드 — 현재 표시 중인 병 스테이지 -->
        <div
          v-if="slide.live"
          class="w-full shrink-0 snap-center snap-always"
          data-testid="jar-slide-current"
          :data-level="slide.level"
        >
          <slot />
        </div>

        <!-- 미리보기 카드 — 해금됨(전환) / 잠김(해금하기). locked 모드에선 숨김 -->
        <div
          v-else-if="slide.data"
          v-show="!locked"
          class="w-full shrink-0 snap-center snap-always flex items-center justify-center py-5"
          :data-testid="`jar-slide-${slide.level}`"
        >
          <button
            type="button"
            class="relative w-[300px] max-w-[88%] aspect-[300/380] rounded-full flex flex-col items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            :style="{
              background: 'radial-gradient(circle, color-mix(in srgb, var(--color-apjek-surface) 95%, transparent) 0%, color-mix(in srgb, var(--color-apjek-surface) 55%, transparent) 55%, transparent 72%)',
            }"
            :data-testid="slide.data.unlocked ? `jar-card-select-${slide.level}` : `jar-card-unlock-${slide.level}`"
            :aria-label="slide.data.unlocked ? `Lv.${slide.level} 테라리움으로 전환` : `Lv.${slide.level} 테라리움 해금하기`"
            @click="slide.data.unlocked ? emit('select', slide.data) : emit('unlock', slide.data)"
          >
            <!-- 병 아트(레벨별) — 해금 전 회색, 해금 후 원본 톤 -->
            <div
              class="relative w-[150px] h-[207px] mb-1"
              :style="slide.data.unlocked ? {} : { filter: 'grayscale(1) brightness(0.92)', opacity: 0.55 }"
              aria-hidden="true"
            >
              <TerrariumJarArt :level="slide.level" />
            </div>
            <span class="text-base font-extrabold text-apjek-text">Lv.{{ slide.level }}</span>
            <template v-if="!slide.data.unlocked">
              <span class="apjek-chip text-xs" style="background: var(--color-apjek-cta); color: #fff; border-color: transparent">
                <Icon name="lucide:lock" class="w-3 h-3" />해금하기
              </span>
              <span class="text-[11px] text-apjek-text-sub text-center leading-snug px-6">
                루비 {{ slide.data.rubyCost }}개를 사용하여<br>새로운 테라리움 해금하기
              </span>
            </template>
            <template v-else>
              <span class="apjek-chip apjek-chip-active text-xs">
                <Icon name="lucide:check" class="w-3 h-3" />해금됨 · 이 병 보기
              </span>
              <span class="text-[11px] text-apjek-text-faint text-center leading-snug px-6">배치 가능한 아이템 : {{ slide.data.slots }}개</span>
            </template>
          </button>
        </div>
      </template>
    </div>

    <!-- 페이지 도트 (Figma 도트 3) -->
    <div v-if="!locked && slides.length > 1" class="flex justify-center gap-1.5 mt-1" role="group" aria-label="테라리움 슬라이드">
      <button
        v-for="(slide, i) in slides"
        :key="slide.level"
        type="button"
        class="relative after:absolute after:-inset-x-[2px] after:-inset-y-[2px] after:content-[''] w-6 h-11 -my-[18px] flex items-center justify-center"
        :aria-pressed="index === i"
        :aria-label="`Lv.${slide.level} 슬라이드`"
        @click="scrollTo(i)"
      >
        <span
          class="h-2 rounded-full transition-all"
          :style="{ width: index === i ? '16px' : '8px', background: index === i ? 'var(--color-apjek-blue)' : 'rgba(81,140,219,0.3)' }"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type JarLevel, MAX_JAR_LEVEL } from '~/utils/tierLevels'

/** 캐러셀 슬라이드 — 레벨당 한 장. live 면 slot(현재 병 스테이지), 아니면 data 기반 미리보기 카드 */
export interface JarCarouselSlide {
  level: number
  live: boolean
  data: JarLevel | null
}

const props = defineProps<{
  /** Lv1~3 레벨 목록(카탈로그 순) — 레벨당 슬라이드 한 장 */
  levels: JarLevel[]
  /** 현재 표시 중인 병(activeTier) 레벨 — 이 레벨의 슬라이드가 라이브 스테이지 */
  selectedLevel: number
  /** 관리/힐링 모드 — 스와이프 잠금 + 라이브 슬라이드 고정 */
  locked: boolean
}>()

const emit = defineEmits<{ unlock: [level: JarLevel], select: [level: JarLevel] }>()

const track = ref<HTMLElement | null>(null)
const index = ref<number>(0)

/**
 * 슬라이드 구성 — 카탈로그 레벨(1..MAX) 오름차순, 활성 레벨 한 장만 live. 카탈로그가 비면 라이브 한 장.
 * 활성 레벨이 카탈로그에 없으면(계약 위반 방어) 첫 레벨을 live 로 둬 스테이지가 사라지지 않게 한다.
 */
const slides = computed<JarCarouselSlide[]>(() => {
  const levels = [...props.levels]
    .filter(l => l.level >= 1 && l.level <= MAX_JAR_LEVEL)
    .sort((a, b) => a.level - b.level)
  if (levels.length === 0) return [{ level: props.selectedLevel, live: true, data: null }]
  const hasSelected = levels.some(l => l.level === props.selectedLevel)
  return levels.map((l, i) => ({
    level: l.level,
    live: hasSelected ? l.level === props.selectedLevel : i === 0,
    data: l,
  }))
})

/** 라이브 슬라이드의 인덱스 — 잠금 해제/전환 후 되돌아갈 위치 */
const liveIndex = computed<number>(() => Math.max(0, slides.value.findIndex(s => s.live)))

function onScroll(): void {
  const el = track.value
  if (!el || el.clientWidth === 0) return
  index.value = Math.max(0, Math.min(slides.value.length - 1, Math.round(el.scrollLeft / el.clientWidth)))
}

function scrollTo(i: number, behavior: ScrollBehavior = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'): void {
  const el = track.value
  if (!el) return
  if (typeof el.scrollTo === 'function') el.scrollTo({ left: i * el.clientWidth, behavior })
  else el.scrollLeft = i * el.clientWidth
  index.value = i
}

// ─── 짧은 스와이프 페이징 ───
// snap-mandatory 만으로는 손을 뗀 위치에서 가장 가까운 슬라이드로 스냅되므로, 폭의 절반 미만을 민
// 스와이프(폰 실측 30~150px)는 제자리로 되돌아갔다(#101). 다만 손을 뗄 때 바로 이동시키면 실기기의
// 관성 스크롤(fling)과 겹쳐 두 장씩 넘어갔다(폰 QA). 그래서
//  - 슬라이드에 scroll-snap-stop: always 를 둬 네이티브 제스처는 한 번에 한 장까지만 넘어가게 하고,
//  - 손을 뗀 뒤 스크롤이 멈출 때까지 기다렸다가, 네이티브가 넘기지 못했을 때만(제자리 스냅) 한 장 보낸다.
// 터치 시작·끝 좌표만 쓰므로 기기에서 네이티브 팬이 시작되지 않은 경우에도 넘어간다.
const SWIPE_MIN_PX = 24
const SWIPE_MIN_RATIO = 0.08
const SETTLE_IDLE_MS = 120
const SETTLE_MAX_MS = 900
let touchStart: { x: number, y: number, index: number } | null = null
let settleTimer: ReturnType<typeof setTimeout> | null = null
// 스와이프 직후의 click(손을 뗀 카드의 전환/해금 버튼)은 의도한 탭이 아니다.
let swipedAt = 0

function onClickCapture(e: MouseEvent): void {
  if (Date.now() - swipedAt < 400) {
    e.preventDefault()
    e.stopPropagation()
  }
}

function clearSettle(): void {
  if (settleTimer) clearTimeout(settleTimer)
  settleTimer = null
}

function onTouchStart(e: TouchEvent): void {
  clearSettle()
  // 새 제스처가 시작되면 이전 스와이프의 click 차단을 푼다 — 스와이프 직후 400ms 안의 새 탭도 동작하게.
  swipedAt = 0
  if (props.locked || slides.value.length < 2 || e.touches.length !== 1) { touchStart = null; return }
  const t = e.touches[0]!
  const el = track.value
  const current = el && el.clientWidth ? Math.round(el.scrollLeft / el.clientWidth) : index.value
  touchStart = { x: t.clientX, y: t.clientY, index: current }
}

function onTouchCancel(): void {
  touchStart = null
}

function onTouchEnd(e: TouchEvent): void {
  const start = touchStart
  touchStart = null
  const el = track.value
  if (!start || !el || props.locked || e.changedTouches.length === 0) return
  const t = e.changedTouches[0]!
  const dx = t.clientX - start.x
  const dy = t.clientY - start.y
  // 세로 스크롤 의도이거나 이동이 작으면 네이티브 스냅에 맡긴다(탭 포함).
  if (Math.abs(dx) < Math.max(SWIPE_MIN_PX, el.clientWidth * SWIPE_MIN_RATIO) || Math.abs(dx) <= Math.abs(dy)) return
  swipedAt = Date.now()
  const target = Math.max(0, Math.min(slides.value.length - 1, start.index + (dx < 0 ? 1 : -1)))
  // 스크롤(관성·스냅)이 멈출 때까지 기다린 뒤 판단한다.
  const began = Date.now()
  let last = el.scrollLeft
  let stableSince = Date.now()
  const check = (): void => {
    const now = Date.now()
    if (el.scrollLeft !== last) { last = el.scrollLeft; stableSince = now }
    if (now - stableSince < SETTLE_IDLE_MS && now - began < SETTLE_MAX_MS) {
      settleTimer = setTimeout(check, 40)
      return
    }
    settleTimer = null
    // 대기 중 관리/힐링 모드로 잠겼으면 넘기지 않는다 — 라이브 슬라이드 고정을 깨지 않게.
    if (props.locked) return
    const settled = el.clientWidth ? Math.round(el.scrollLeft / el.clientWidth) : start.index
    // 네이티브가 이미 넘겼으면(또는 다른 장에 있으면) 그대로 둔다 — 한 장 넘게 보내지 않는다.
    if (settled === start.index && target !== start.index) scrollTo(target)
  }
  settleTimer = setTimeout(check, 40)
}

onBeforeUnmount(clearSettle)

// 잠금 전환 시 라이브 슬라이드로 되돌린다 — 관리/힐링 모드는 항상 현재 병 기준.
// 다른 슬라이드는 display:none 이라 라이브 슬라이드가 scrollLeft 0 에 온다.
watch(() => props.locked, async (locked) => {
  // 스와이프 뒤 대기 중인 페이징이 잠금 전환 위치를 덮어쓰지 않게 먼저 취소한다.
  clearSettle()
  if (locked) {
    const el = track.value
    if (el) el.scrollLeft = 0
    index.value = liveIndex.value
    return
  }
  // 잠금 해제 — 숨겨졌던 슬라이드가 다시 그려진 뒤 라이브 슬라이드 위치로 즉시 이동
  await nextTick()
  scrollTo(liveIndex.value, 'instant')
})

// 표시 병 전환(라이브 슬라이드 이동) 시 그 슬라이드로 따라간다. 첫 로드(카탈로그 도착)는 애니메이션 없이.
watch(liveIndex, async (i) => {
  if (props.locked) return
  await nextTick()
  scrollTo(i, 'instant')
})

onMounted(() => {
  if (!props.locked) scrollTo(liveIndex.value, 'instant')
})
</script>
