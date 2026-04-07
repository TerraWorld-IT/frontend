<template>
  <div class="min-h-screen pb-24">
    <!-- Layout Selector -->
    <CommonLayoutSelector />

    <!-- ================================================================== -->
    <!-- 1. JAR  -  Calendar inside a glass jar frame                       -->
    <!-- ================================================================== -->
    <div v-if="is('jar')" class="px-4 py-4 space-y-5">
      <!-- Month navigation -->
      <div class="flex items-center justify-between">
        <button class="text-riso-dark/40 text-lg">&lsaquo;</button>
        <h2 class="font-bold text-riso-dark">2026년 4월</h2>
        <button class="text-riso-dark/40 text-lg">&rsaquo;</button>
      </div>

      <!-- Glass jar frame -->
      <div class="relative mx-auto max-w-xs">
        <!-- Jar lid -->
        <div class="mx-auto w-40 h-5 bg-riso-walnut/60 rounded-t-lg border-2 border-riso-walnut/40" />
        <!-- Jar body -->
        <div class="relative bg-white/60 backdrop-blur-sm border-2 border-riso-sage/30 rounded-b-[2rem] px-4 pt-4 pb-6 overflow-hidden">
          <!-- Riso grain overlay -->
          <div class="absolute inset-0 riso-grain opacity-20 pointer-events-none" />
          <!-- Calendar grid inside jar -->
          <div class="grid grid-cols-7 gap-0.5 text-center text-[10px] text-riso-dark/40 mb-1.5">
            <span v-for="d in ['일','월','화','수','목','금','토']" :key="d">{{ d }}</span>
          </div>
          <div class="grid grid-cols-7 gap-0.5 text-center">
            <!-- Empty cells for April 2026 starting Wednesday -->
            <div v-for="_ in 3" :key="'empty-' + _" />
            <template v-for="i in 30" :key="i">
              <button
                :class="[
                  'relative py-1.5 rounded-lg text-xs transition-all',
                  selectedDay === i ? 'bg-riso-sage/30 font-bold ring-1 ring-riso-sage' : 'hover:bg-riso-cream/50',
                  recordDays.includes(i) ? 'font-medium text-riso-dark' : 'text-riso-dark/40',
                ]"
                @click="selectedDay = i"
              >
                {{ i }}
                <!-- Record dots -->
                <div v-if="recordDays.includes(i)" class="flex justify-center gap-0.5 mt-0.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-riso-sage" />
                  <span v-if="[5, 6].includes(i)" class="w-1.5 h-1.5 rounded-full bg-riso-pink" />
                </div>
              </button>
            </template>
          </div>
          <!-- Decorative pebbles at bottom -->
          <div class="flex justify-center gap-1 mt-3">
            <div class="w-3 h-2 rounded-full bg-riso-walnut/20" />
            <div class="w-4 h-2.5 rounded-full bg-riso-sage/30" />
            <div class="w-2.5 h-2 rounded-full bg-riso-peach/40" />
            <div class="w-3.5 h-2 rounded-full bg-riso-walnut/15" />
          </div>
        </div>
        <!-- Jar glass reflection -->
        <div class="absolute top-8 left-3 w-1.5 h-16 bg-white/40 rounded-full rotate-6" />
      </div>

      <!-- Selected day's records -->
      <section>
        <h3 class="text-sm font-bold mb-3 text-riso-dark/70">
          4월 {{ selectedDay }}일 기록
        </h3>
        <div class="space-y-2">
          <div
            v-for="r in getRecordsForDay(selectedDay)"
            :key="r.id"
            class="bg-white rounded-2xl p-4 border border-riso-sage/20 riso-shadow-sm flex items-center gap-3"
          >
            <div :class="['w-11 h-11 rounded-xl flex items-center justify-center text-lg', r.bg]">
              {{ r.icon }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-riso-dark">{{ r.category }}</p>
              <p v-if="r.memo" class="text-xs text-riso-dark/50 truncate">{{ r.memo }}</p>
              <p class="text-[10px] text-riso-dark/30 mt-0.5">{{ r.date }}</p>
            </div>
            <div class="shrink-0 text-right">
              <span class="text-xs font-bold text-riso-sage">+{{ r.coin }}</span>
              <p class="text-[10px] text-riso-dark/30">코인</p>
            </div>
          </div>
          <p
            v-if="getRecordsForDay(selectedDay).length === 0"
            class="text-center text-xs text-riso-dark/30 py-8"
          >
            이 날은 아직 기록이 없어요
          </p>
        </div>
      </section>

      <!-- Stats -->
      <div class="flex gap-3">
        <div class="flex-1 bg-riso-sage/10 rounded-xl p-3 text-center border border-riso-sage/20">
          <p class="text-xl font-bold text-riso-sage">5</p>
          <p class="text-[10px] text-riso-dark/40">이번 달 기록</p>
        </div>
        <div class="flex-1 bg-riso-peach/10 rounded-xl p-3 text-center border border-riso-peach/20">
          <p class="text-xl font-bold text-riso-peach">3</p>
          <p class="text-[10px] text-riso-dark/40">연속 기록일</p>
        </div>
      </div>

      <!-- FAB -->
      <button class="fixed bottom-20 right-4 w-14 h-14 bg-riso-sage text-white rounded-full riso-shadow flex items-center justify-center text-2xl z-40 active:scale-95 transition-transform">
        +
      </button>
    </div>

    <!-- ================================================================== -->
    <!-- 2. POSTCARD  -  Rotated postcard cards                             -->
    <!-- ================================================================== -->
    <div v-if="is('postcard')" class="px-4 py-4 space-y-5">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-riso-dark">나의 엽서들</h2>
        <span class="text-xs text-riso-dark/40">{{ sampleRecords.length }}장</span>
      </div>

      <!-- Postcard stack -->
      <div class="space-y-4">
        <div
          v-for="(r, idx) in sampleRecords"
          :key="r.id"
          :class="[
            'relative bg-riso-cream border border-riso-walnut/15 rounded-lg overflow-hidden riso-shadow transition-transform',
            idx % 2 === 0 ? 'rotate-[-1deg]' : 'rotate-[0.5deg]',
          ]"
        >
          <!-- Postcard header strip -->
          <div :class="['h-1.5 w-full', r.bg]" />

          <div class="p-4 flex gap-4">
            <!-- Stamp area (right side, like a real postcard) -->
            <div class="flex-1 min-w-0">
              <!-- "Address" area -->
              <div class="border-b border-dashed border-riso-walnut/20 pb-2 mb-2">
                <p class="text-[10px] text-riso-dark/30 uppercase tracking-widest">Terra Post</p>
                <p class="text-xs text-riso-dark/50">{{ r.date }}</p>
              </div>
              <!-- Memo as handwritten text -->
              <p
                :class="[
                  'text-sm min-h-[2rem]',
                  r.memo ? 'text-riso-dark/80' : 'text-riso-dark/25 italic',
                ]"
                style="font-family: 'Nanum Pen Script', cursive, system-ui"
              >
                {{ r.memo || '(빈 엽서)' }}
              </p>
            </div>

            <!-- Stamp -->
            <div class="shrink-0 flex flex-col items-center gap-1">
              <div class="w-14 h-14 border-2 border-dashed border-riso-walnut/30 rounded-sm flex items-center justify-center bg-white/50">
                <span class="text-2xl">{{ r.icon }}</span>
              </div>
              <p class="text-[9px] text-riso-walnut/50 font-mono">{{ r.coin }}c</p>
            </div>
          </div>

          <!-- Postmark -->
          <div class="absolute top-3 right-3 w-10 h-10 rounded-full border-2 border-riso-poppy/20 flex items-center justify-center rotate-[-15deg] opacity-40">
            <span class="text-[7px] text-riso-poppy font-bold leading-tight text-center">
              2026<br>APR
            </span>
          </div>
        </div>
      </div>

      <!-- FAB -->
      <button class="fixed bottom-20 right-4 w-14 h-14 bg-riso-terracotta text-white rounded-full riso-shadow flex items-center justify-center text-2xl z-40 active:scale-95 transition-transform">
        +
      </button>
    </div>

    <!-- ================================================================== -->
    <!-- 3. SHELF  -  Book spines on wooden shelves                         -->
    <!-- ================================================================== -->
    <div v-if="is('shelf')" class="px-4 py-4 space-y-5">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-riso-dark">나의 책장</h2>
        <span class="text-xs text-riso-dark/40">2026년 4월</span>
      </div>

      <!-- Bookshelf -->
      <div class="space-y-0">
        <!-- Shelf row 1 -->
        <div class="relative">
          <div class="flex items-end gap-0.5 px-2 pt-4 pb-0 min-h-[120px]">
            <button
              v-for="r in sampleRecords.slice(0, 3)"
              :key="r.id"
              class="group relative"
              @click="shelfOpen = shelfOpen === r.id ? null : r.id"
            >
              <!-- Book spine -->
              <div
                :class="[
                  'w-10 rounded-t-sm transition-all duration-300 flex flex-col items-center justify-end pb-2 gap-1 relative overflow-hidden',
                  shelfOpen === r.id ? 'w-14 -translate-y-2' : 'group-hover:-translate-y-1',
                ]"
                :style="{
                  height: `${70 + r.coin * 3}px`,
                  background: `linear-gradient(135deg, ${categoryColors[r.category]?.from}, ${categoryColors[r.category]?.to})`,
                }"
              >
                <div class="absolute inset-0 riso-grain opacity-30 pointer-events-none" />
                <span class="text-white text-lg">{{ r.icon }}</span>
                <span
                  class="text-white/80 text-[8px] font-medium writing-vertical"
                  style="writing-mode: vertical-rl"
                >
                  {{ r.category }}
                </span>
              </div>
            </button>
            <!-- Decorative items -->
            <div class="w-6 h-12 ml-2 flex items-end">
              <div class="w-5 h-8 bg-riso-sage/20 rounded-t-full" />
            </div>
          </div>
          <!-- Shelf board -->
          <div class="h-3 bg-gradient-to-b from-riso-walnut/40 to-riso-walnut/25 rounded-sm riso-shadow-sm" />
          <div class="h-1 bg-riso-walnut/15" />
        </div>

        <!-- Shelf row 2 -->
        <div class="relative mt-2">
          <div class="flex items-end gap-0.5 px-2 pt-4 pb-0 min-h-[120px]">
            <button
              v-for="r in sampleRecords.slice(3)"
              :key="r.id"
              class="group relative"
              @click="shelfOpen = shelfOpen === r.id ? null : r.id"
            >
              <div
                :class="[
                  'w-10 rounded-t-sm transition-all duration-300 flex flex-col items-center justify-end pb-2 gap-1 relative overflow-hidden',
                  shelfOpen === r.id ? 'w-14 -translate-y-2' : 'group-hover:-translate-y-1',
                ]"
                :style="{
                  height: `${70 + r.coin * 3}px`,
                  background: `linear-gradient(135deg, ${categoryColors[r.category]?.from}, ${categoryColors[r.category]?.to})`,
                }"
              >
                <div class="absolute inset-0 riso-grain opacity-30 pointer-events-none" />
                <span class="text-white text-lg">{{ r.icon }}</span>
                <span
                  class="text-white/80 text-[8px] font-medium"
                  style="writing-mode: vertical-rl"
                >
                  {{ r.category }}
                </span>
              </div>
            </button>
            <!-- Small plant pot -->
            <div class="ml-auto mr-2 flex flex-col items-center">
              <div class="text-lg animate-sway">🪴</div>
            </div>
          </div>
          <div class="h-3 bg-gradient-to-b from-riso-walnut/40 to-riso-walnut/25 rounded-sm riso-shadow-sm" />
          <div class="h-1 bg-riso-walnut/15" />
        </div>
      </div>

      <!-- Slide-out detail panel -->
      <Transition name="slide">
        <div
          v-if="shelfOpen"
          class="bg-white rounded-2xl p-4 border border-riso-walnut/15 riso-shadow space-y-2"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ selectedShelfRecord?.icon }}</span>
            <div class="flex-1">
              <p class="font-medium text-sm">{{ selectedShelfRecord?.category }}</p>
              <p class="text-xs text-riso-dark/40">{{ selectedShelfRecord?.date }}</p>
            </div>
            <button class="text-riso-dark/30 text-xs" @click="shelfOpen = null">닫기</button>
          </div>
          <p v-if="selectedShelfRecord?.memo" class="text-sm text-riso-dark/70 bg-riso-cream/50 rounded-lg p-3">
            {{ selectedShelfRecord?.memo }}
          </p>
          <div class="flex items-center gap-2 text-xs text-riso-sage font-medium">
            <span>+{{ selectedShelfRecord?.coin }} 코인 획득</span>
          </div>
        </div>
      </Transition>

      <!-- FAB -->
      <button class="fixed bottom-20 right-4 w-14 h-14 bg-riso-walnut text-white rounded-full riso-shadow flex items-center justify-center text-2xl z-40 active:scale-95 transition-transform">
        +
      </button>
    </div>

    <!-- ================================================================== -->
    <!-- 4. WINDOW  -  Calendar as window panes, sky gradient background    -->
    <!-- ================================================================== -->
    <div v-if="is('window')" class="min-h-screen">
      <!-- Sky gradient background (changes by time concept) -->
      <div class="fixed inset-0 -z-10 bg-gradient-to-b from-riso-sky/40 via-riso-lavender/20 to-riso-peach/30" />

      <div class="px-4 py-4 space-y-5">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-riso-dark">2026년 4월</h2>
          <span class="text-xs text-riso-dark/40">창 밖의 기록</span>
        </div>

        <!-- Window frame -->
        <div class="bg-riso-walnut/80 rounded-xl p-2 riso-shadow">
          <div class="bg-white/20 backdrop-blur-sm rounded-lg p-1">
            <!-- Window pane grid (7x5 = calendar) -->
            <div class="grid grid-cols-7 gap-px bg-riso-walnut/30 rounded-md overflow-hidden">
              <!-- Day headers as panes -->
              <div
                v-for="d in ['일','월','화','수','목','금','토']"
                :key="d"
                class="bg-riso-cream/80 py-1 text-center text-[10px] text-riso-dark/40 font-medium"
              >
                {{ d }}
              </div>
              <!-- Empty leading cells -->
              <div v-for="_ in 3" :key="'we-' + _" class="bg-riso-cream/40 py-3" />
              <!-- Day panes -->
              <button
                v-for="i in 30"
                :key="i"
                :class="[
                  'relative py-3 text-center text-xs transition-all',
                  recordDays.includes(i) ? 'bg-riso-sky/20 text-riso-dark font-medium' : 'bg-riso-cream/60 text-riso-dark/40',
                  selectedDay === i ? 'bg-riso-sky/40 ring-1 ring-riso-sky font-bold' : '',
                ]"
                @click="selectedDay = i"
              >
                {{ i }}
                <span
                  v-if="recordDays.includes(i)"
                  class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-riso-poppy"
                />
              </button>
              <!-- Trailing empty panes -->
              <div v-for="_ in 2" :key="'te-' + _" class="bg-riso-cream/30 py-3" />
            </div>
          </div>
        </div>

        <!-- Light beam cards -->
        <section class="space-y-3">
          <h3 class="text-sm font-bold text-riso-dark/60">
            빛이 비추는 기록
          </h3>
          <div
            v-for="r in getRecordsForDay(selectedDay)"
            :key="r.id"
            class="relative bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 riso-shadow-sm overflow-hidden"
          >
            <!-- Light beam effect -->
            <div class="absolute -top-4 -right-4 w-24 h-24 bg-riso-butter/20 rounded-full blur-xl" />
            <div class="relative flex items-center gap-3">
              <span class="text-xl">{{ r.icon }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-riso-dark">{{ r.category }}</p>
                <p v-if="r.memo" class="text-xs text-riso-dark/50 truncate">{{ r.memo }}</p>
              </div>
              <div class="text-right shrink-0">
                <span class="text-xs font-bold text-riso-sky">+{{ r.coin }}</span>
                <p class="text-[10px] text-riso-dark/30">코인</p>
              </div>
            </div>
          </div>
          <p
            v-if="getRecordsForDay(selectedDay).length === 0"
            class="text-center text-xs text-riso-dark/30 py-8"
          >
            이 날은 기록이 없어요
          </p>
        </section>
      </div>

      <!-- FAB -->
      <button class="fixed bottom-20 right-4 w-14 h-14 bg-riso-sky text-white rounded-full riso-shadow flex items-center justify-center text-2xl z-40 active:scale-95 transition-transform">
        +
      </button>
    </div>

    <!-- ================================================================== -->
    <!-- 5. GARDEN  -  Top-down garden map with plants                      -->
    <!-- ================================================================== -->
    <div v-if="is('garden')" class="px-4 py-4 space-y-5">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-riso-dark">나의 정원</h2>
        <span class="text-xs text-riso-sage font-medium">{{ sampleRecords.length }}개 식물</span>
      </div>

      <!-- Garden map -->
      <div class="relative bg-riso-sage/10 rounded-2xl p-6 border border-riso-sage/20 overflow-hidden min-h-[320px]">
        <!-- Grass texture -->
        <div class="absolute inset-0 riso-dots opacity-10 pointer-events-none" />

        <!-- Winding path (SVG) -->
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 300 300" fill="none">
          <path
            d="M30 280 Q80 240 60 200 Q40 160 100 140 Q160 120 140 80 Q120 40 180 30 Q240 20 270 60"
            stroke="rgb(var(--color-riso-walnut, 139 119 101) / 0.2)"
            stroke-width="12"
            stroke-linecap="round"
            fill="none"
            stroke-dasharray="4 8"
          />
        </svg>

        <!-- Plant plots positioned along the path -->
        <div
          v-for="(r, idx) in sampleRecords"
          :key="r.id"
          :class="['absolute transition-all duration-500 cursor-pointer group']"
          :style="gardenPositions[idx]"
          @click="gardenSelected = gardenSelected === r.id ? null : r.id"
        >
          <!-- Plant pot and emoji -->
          <div
            :class="[
              'flex flex-col items-center transition-transform',
              gardenSelected === r.id ? 'scale-125' : 'group-hover:scale-110',
            ]"
          >
            <span class="text-2xl animate-sway" style="animation-delay: var(--delay)">
              {{ categoryPlants[r.category] || '🌱' }}
            </span>
            <div class="w-6 h-2 bg-riso-earth/30 rounded-full mt-0.5" />
          </div>

          <!-- Tooltip on select -->
          <Transition name="fade">
            <div
              v-if="gardenSelected === r.id"
              class="absolute -top-14 left-1/2 -translate-x-1/2 bg-white rounded-lg px-3 py-2 riso-shadow-sm whitespace-nowrap z-10 border border-riso-sage/20"
            >
              <p class="text-xs font-medium text-riso-dark">{{ r.category }}</p>
              <p v-if="r.memo" class="text-[10px] text-riso-dark/50">{{ r.memo }}</p>
              <p class="text-[10px] text-riso-sage font-medium">+{{ r.coin }} 코인</p>
              <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b border-riso-sage/20" />
            </div>
          </Transition>
        </div>

        <!-- Fence decoration at bottom -->
        <div class="absolute bottom-2 left-4 right-4 flex gap-3">
          <div v-for="i in 6" :key="i" class="flex-1 h-4 border-t-2 border-riso-walnut/15 relative">
            <div class="absolute -top-1 left-1/2 w-0.5 h-5 bg-riso-walnut/15" />
          </div>
        </div>
      </div>

      <!-- Legend / Category summary -->
      <div class="flex gap-2 flex-wrap">
        <div
          v-for="cat in uniqueCategories"
          :key="cat"
          class="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border border-riso-sage/15 text-xs"
        >
          <span>{{ categoryPlants[cat] || '🌱' }}</span>
          <span class="text-riso-dark/60">{{ cat }}</span>
          <span class="text-riso-sage font-medium">{{ getCategoryCount(cat) }}</span>
        </div>
      </div>

      <!-- Record list (compact) -->
      <div class="space-y-1.5">
        <div
          v-for="r in sampleRecords"
          :key="r.id"
          class="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-2 border border-riso-sage/10 text-xs"
        >
          <span>{{ r.icon }}</span>
          <span class="text-riso-dark/70 flex-1 truncate">{{ r.memo || r.category }}</span>
          <span class="text-riso-dark/30">{{ r.date.split(' ')[0] }}</span>
          <span class="text-riso-sage font-medium">+{{ r.coin }}</span>
        </div>
      </div>

      <!-- FAB -->
      <button class="fixed bottom-20 right-4 w-14 h-14 bg-riso-forest text-white rounded-full riso-shadow flex items-center justify-center text-2xl z-40 active:scale-95 transition-transform">
        +
      </button>
    </div>

    <!-- ================================================================== -->
    <!-- 6. STORYBOOK  -  Diary / journal with chapters                     -->
    <!-- ================================================================== -->
    <div v-if="is('storybook')" class="px-4 py-4 space-y-5">
      <!-- Book cover header -->
      <div class="bg-riso-navy/90 text-white rounded-2xl p-6 text-center relative overflow-hidden">
        <div class="absolute inset-0 riso-grain opacity-40 pointer-events-none" />
        <div class="relative">
          <p class="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-1">My Diary</p>
          <h2 class="text-lg font-bold">2026년 4월의 이야기</h2>
          <p class="text-xs text-white/40 mt-1">{{ sampleRecords.length }}개의 챕터</p>
        </div>
      </div>

      <!-- Journal pages -->
      <div class="space-y-4">
        <div
          v-for="(r, idx) in sampleRecords"
          :key="r.id"
          class="relative bg-riso-cream rounded-xl p-5 border border-riso-walnut/15 overflow-hidden"
        >
          <!-- Riso grain texture -->
          <div class="absolute inset-0 riso-grain opacity-20 pointer-events-none" />

          <!-- Page lines -->
          <div class="absolute inset-x-6 top-12 bottom-4 flex flex-col gap-[18px] pointer-events-none">
            <div v-for="l in 8" :key="l" class="border-b border-riso-walnut/8" />
          </div>

          <!-- Red margin line -->
          <div class="absolute top-0 bottom-0 left-12 w-px bg-riso-poppy/15" />

          <div class="relative">
            <!-- Chapter number -->
            <div class="flex items-start gap-3 mb-3">
              <div class="w-8 h-8 rounded-full bg-riso-navy/10 flex items-center justify-center shrink-0">
                <span class="text-xs font-bold text-riso-navy/60">{{ idx + 1 }}</span>
              </div>
              <div>
                <p class="text-[10px] text-riso-dark/30 uppercase tracking-wider">Chapter {{ idx + 1 }}</p>
                <p class="text-xs text-riso-dark/40">{{ r.date }}</p>
              </div>
              <div class="ml-auto">
                <span class="text-xl">{{ r.icon }}</span>
              </div>
            </div>

            <!-- Handwritten style content -->
            <div class="pl-10">
              <h3
                class="text-base font-bold text-riso-dark mb-1"
                style="font-family: 'Nanum Pen Script', cursive, system-ui"
              >
                {{ r.category }}
              </h3>
              <p
                :class="[
                  'text-sm leading-relaxed',
                  r.memo ? 'text-riso-dark/70' : 'text-riso-dark/25 italic',
                ]"
                style="font-family: 'Nanum Pen Script', cursive, system-ui"
              >
                {{ r.memo || '오늘은 특별한 메모 없이 기록만 남겼다.' }}
              </p>
            </div>

            <!-- Coin reward as illustration -->
            <div class="flex items-center justify-end gap-1 mt-3 pr-2">
              <div class="flex items-center gap-1 bg-riso-butter/30 rounded-full px-2.5 py-0.5">
                <span class="text-[10px]">🪙</span>
                <span class="text-[10px] text-riso-dark/50 font-medium">+{{ r.coin }}</span>
              </div>
            </div>
          </div>

          <!-- Page corner fold -->
          <div class="absolute bottom-0 right-0 w-6 h-6 bg-gradient-to-tl from-riso-walnut/10 to-transparent" />
        </div>
      </div>

      <!-- FAB -->
      <button class="fixed bottom-20 right-4 w-14 h-14 bg-riso-navy text-white rounded-full riso-shadow flex items-center justify-center text-2xl z-40 active:scale-95 transition-transform">
        +
      </button>
    </div>

    <!-- ================================================================== -->
    <!-- 7. WINDOWSILL  -  Simple list, wooden shelf dividers, minimal      -->
    <!-- ================================================================== -->
    <div v-if="is('windowsill')" class="px-4 py-4 space-y-5">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-riso-dark">기록 선반</h2>
        <div class="text-sm animate-sway">🪴</div>
      </div>

      <!-- Category filter tabs -->
      <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          v-for="tab in ['전체', ...uniqueCategories]"
          :key="tab"
          :class="[
            'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
            windowsillTab === tab
              ? 'bg-riso-earth text-white riso-shadow-sm'
              : 'bg-white/70 text-riso-dark/50 border border-riso-walnut/15',
          ]"
          @click="windowsillTab = tab"
        >
          {{ tab }}
        </button>
      </div>

      <!-- Records grouped by date on shelves -->
      <div class="space-y-0">
        <template v-for="group in groupedByDate" :key="group.date">
          <!-- Date header -->
          <div class="flex items-center gap-2 pt-4 pb-2">
            <span class="text-xs font-bold text-riso-dark/50">{{ group.date }}</span>
            <div class="flex-1 border-t border-riso-walnut/10" />
          </div>

          <!-- Records on this shelf -->
          <div class="space-y-1.5">
            <div
              v-for="r in filterByTab(group.records)"
              :key="r.id"
              class="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-riso-walnut/10 transition-all hover:riso-shadow-sm"
            >
              <div :class="['w-9 h-9 rounded-lg flex items-center justify-center text-base', r.bg]">
                {{ r.icon }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-riso-dark">{{ r.category }}</p>
                <p v-if="r.memo" class="text-xs text-riso-dark/40 truncate">{{ r.memo }}</p>
              </div>
              <span class="text-xs text-riso-sage font-medium shrink-0">+{{ r.coin }}</span>
            </div>
          </div>

          <!-- Wooden shelf divider -->
          <div class="mt-2 h-1.5 bg-gradient-to-r from-riso-walnut/20 via-riso-walnut/30 to-riso-walnut/20 rounded-full" />
        </template>
      </div>

      <!-- Bottom decoration -->
      <div class="flex justify-center gap-4 pt-4 text-xl">
        <span class="animate-sway" style="animation-delay: 0s">🪴</span>
        <span class="animate-sway" style="animation-delay: 0.5s">🌿</span>
        <span class="animate-sway" style="animation-delay: 1s">🪴</span>
      </div>

      <!-- FAB -->
      <button class="fixed bottom-20 right-4 w-14 h-14 bg-riso-earth text-white rounded-full riso-shadow flex items-center justify-center text-2xl z-40 active:scale-95 transition-transform">
        +
      </button>
    </div>

    <!-- ================================================================== -->
    <!-- 8. BUBBLE  -  Floating bubble circles                              -->
    <!-- ================================================================== -->
    <div v-if="is('bubble')" class="px-4 py-4 space-y-5">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-riso-dark">방울 기록</h2>
        <span class="text-xs text-riso-dark/40">탭해서 보기</span>
      </div>

      <!-- Bubble field -->
      <div class="relative min-h-[380px] bg-gradient-to-b from-riso-sky/10 to-riso-lavender/10 rounded-2xl overflow-hidden border border-riso-sky/20">
        <!-- Underwater texture -->
        <div class="absolute inset-0 riso-dots opacity-5 pointer-events-none" />

        <!-- Rising small bubbles (decorative) -->
        <div
          v-for="i in 8"
          :key="'deco-' + i"
          class="absolute rounded-full bg-white/30 border border-white/40 animate-float"
          :style="{
            width: `${4 + (i % 3) * 3}px`,
            height: `${4 + (i % 3) * 3}px`,
            left: `${10 + (i * 11) % 80}%`,
            bottom: `${5 + (i * 7) % 30}%`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${3 + (i % 3)}s`,
          }"
        />

        <!-- Record bubbles -->
        <button
          v-for="(r, idx) in sampleRecords"
          :key="r.id"
          :class="[
            'absolute rounded-full flex flex-col items-center justify-center transition-all duration-500 border-2',
            bubbleSelected === r.id
              ? 'z-20 scale-110 border-riso-navy/30 riso-shadow'
              : 'border-white/40 hover:scale-105',
          ]"
          :style="{
            width: `${bubbleSizes[idx]}px`,
            height: `${bubbleSizes[idx]}px`,
            left: `${bubblePositions[idx].x}%`,
            top: `${bubblePositions[idx].y}%`,
            background: `radial-gradient(circle at 35% 35%, white, ${bubbleColors[r.category]})`,
          }"
          @click="bubbleSelected = bubbleSelected === r.id ? null : r.id"
        >
          <span :class="['leading-none', bubbleSizes[idx] > 80 ? 'text-2xl' : 'text-lg']">
            {{ r.icon }}
          </span>
          <span
            v-if="bubbleSizes[idx] > 70"
            class="text-[9px] text-riso-dark/50 font-medium mt-0.5"
          >
            {{ r.category }}
          </span>
          <!-- Bubble highlight -->
          <div
            class="absolute top-[15%] left-[20%] w-[25%] h-[20%] bg-white/50 rounded-full blur-[2px]"
          />
        </button>
      </div>

      <!-- Selected bubble detail -->
      <Transition name="slide">
        <div
          v-if="bubbleSelected"
          class="bg-white rounded-2xl p-4 border border-riso-lavender/20 riso-shadow-sm"
        >
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-riso-lavender/20 flex items-center justify-center text-xl">
              {{ selectedBubbleRecord?.icon }}
            </div>
            <div class="flex-1">
              <p class="font-medium text-sm text-riso-dark">{{ selectedBubbleRecord?.category }}</p>
              <p class="text-xs text-riso-dark/40">{{ selectedBubbleRecord?.date }}</p>
            </div>
            <button class="text-riso-dark/30 text-xs" @click="bubbleSelected = null">닫기</button>
          </div>
          <p v-if="selectedBubbleRecord?.memo" class="text-sm text-riso-dark/60 mt-2 bg-riso-lavender/10 rounded-lg p-3">
            {{ selectedBubbleRecord?.memo }}
          </p>
          <div class="flex items-center gap-1 mt-2 text-xs text-riso-sky font-medium">
            <span>🪙</span>
            <span>+{{ selectedBubbleRecord?.coin }} 코인</span>
          </div>
        </div>
      </Transition>

      <!-- Category legend -->
      <div class="flex gap-2 flex-wrap justify-center">
        <div
          v-for="cat in uniqueCategories"
          :key="cat"
          class="flex items-center gap-1 text-[10px] text-riso-dark/40"
        >
          <div
            class="w-3 h-3 rounded-full"
            :style="{ background: bubbleColors[cat] }"
          />
          <span>{{ cat }} ({{ getCategoryCount(cat) }})</span>
        </div>
      </div>

      <!-- FAB -->
      <button class="fixed bottom-20 right-4 w-14 h-14 bg-riso-lavender text-white rounded-full riso-shadow flex items-center justify-center text-2xl z-40 active:scale-95 transition-transform">
        +
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { is } = useLayoutVariant()

// ── Shared mock data ──
const sampleRecords = [
  { id: 1, category: '산책', icon: '🚶', date: '4월 7일 09:30', memo: '한강 산책로 30분', coin: 10, bg: 'bg-green-50' },
  { id: 2, category: '독서', icon: '📖', date: '4월 6일 21:00', memo: '아토믹 해빗 3장', coin: 10, bg: 'bg-blue-50' },
  { id: 3, category: '러닝', icon: '🏃', date: '4월 6일 07:00', memo: '5km 달림', coin: 15, bg: 'bg-red-50' },
  { id: 4, category: '산책', icon: '🚶', date: '4월 5일 18:00', memo: '', coin: 10, bg: 'bg-green-50' },
  { id: 5, category: '낙서', icon: '🎨', date: '4월 5일 15:00', memo: '고양이 스케치', coin: 10, bg: 'bg-orange-50' },
]

// ── Shared helpers ──
const recordDays = [5, 6, 7]
const selectedDay = ref(7)

function getRecordsForDay(day: number) {
  const dayMap: Record<number, number[]> = { 7: [1], 6: [2, 3], 5: [4, 5] }
  return (dayMap[day] || []).map(id => sampleRecords.find(r => r.id === id)!).filter(Boolean)
}

const uniqueCategories = computed(() =>
  [...new Set(sampleRecords.map(r => r.category))],
)

function getCategoryCount(cat: string) {
  return sampleRecords.filter(r => r.category === cat).length
}

// ── Shelf variant ──
const shelfOpen = ref<number | null>(null)
const selectedShelfRecord = computed(() =>
  sampleRecords.find(r => r.id === shelfOpen.value),
)

const categoryColors: Record<string, { from: string; to: string }> = {
  '산책': { from: '#8fbc8f', to: '#6b8e6b' },
  '독서': { from: '#6b8eb5', to: '#4a6d8c' },
  '러닝': { from: '#cd6b6b', to: '#a85454' },
  '낙서': { from: '#d4956b', to: '#b07a54' },
}

// ── Garden variant ──
const gardenSelected = ref<number | null>(null)

const gardenPositions = [
  { top: '15%', left: '65%', '--delay': '0s' },
  { top: '35%', left: '25%', '--delay': '0.3s' },
  { top: '55%', left: '55%', '--delay': '0.6s' },
  { top: '70%', left: '15%', '--delay': '0.9s' },
  { top: '45%', left: '75%', '--delay': '1.2s' },
]

const categoryPlants: Record<string, string> = {
  '산책': '🌿',
  '독서': '🌻',
  '러닝': '🌹',
  '낙서': '🌸',
}

// ── Windowsill variant ──
const windowsillTab = ref('전체')

const groupedByDate = computed(() => {
  const groups: { date: string; records: typeof sampleRecords }[] = []
  const dateMap = new Map<string, typeof sampleRecords>()

  for (const r of sampleRecords) {
    const dateKey = r.date.split(' ')[0]
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, [])
    dateMap.get(dateKey)!.push(r)
  }

  for (const [date, records] of dateMap) {
    groups.push({ date, records })
  }
  return groups
})

function filterByTab(records: typeof sampleRecords) {
  if (windowsillTab.value === '전체') return records
  return records.filter(r => r.category === windowsillTab.value)
}

// ── Bubble variant ──
const bubbleSelected = ref<number | null>(null)
const selectedBubbleRecord = computed(() =>
  sampleRecords.find(r => r.id === bubbleSelected.value),
)

const bubbleSizes = [90, 80, 95, 70, 80]
const bubblePositions = [
  { x: 10, y: 15 },
  { x: 55, y: 8 },
  { x: 30, y: 45 },
  { x: 60, y: 55 },
  { x: 8, y: 65 },
]
const bubbleColors: Record<string, string> = {
  '산책': 'rgba(143, 188, 143, 0.3)',
  '독서': 'rgba(107, 142, 181, 0.3)',
  '러닝': 'rgba(205, 107, 107, 0.3)',
  '낙서': 'rgba(212, 149, 107, 0.3)',
}
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
