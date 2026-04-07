<template>
  <div class="py-6 space-y-5">
    <!-- Global Layout Selector -->
    <CommonLayoutSelector />

    <!-- ====================================================================
         1. JAR - Full-screen round glass jar canvas
         ==================================================================== -->
    <template v-if="is('jar')">
      <!-- Mode Toggle -->
      <div class="flex justify-between items-center">
        <h2 class="font-bold text-riso-dark">My Terrarium</h2>
        <div class="flex gap-1.5 bg-white/70 rounded-full p-0.5 border border-riso-walnut/10">
          <button
            v-for="m in jarModes"
            :key="m.key"
            :class="[
              'px-3 py-1 rounded-full text-xs font-medium transition-all',
              jarMode === m.key ? 'bg-riso-navy text-white riso-shadow-sm' : 'text-riso-dark/40',
            ]"
            @click="jarMode = m.key"
          >
            {{ m.label }}
          </button>
        </div>
      </div>

      <!-- Glass Jar Canvas -->
      <div class="relative aspect-square bg-gradient-to-b from-riso-cream via-white to-riso-cream/60 rounded-[2.5rem] border-2 border-riso-walnut/10 overflow-hidden riso-shadow">
        <!-- Jar outline -->
        <div class="absolute inset-3 rounded-[2rem] border-2 border-riso-walnut/8">
          <!-- Jar neck -->
          <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-2/5 h-5 bg-riso-cream/80 rounded-t-xl border-2 border-b-0 border-riso-walnut/8" />
          <!-- Jar lid -->
          <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-[45%] h-3 bg-riso-walnut/15 rounded-t-lg" />
        </div>

        <!-- Soil layer -->
        <div class="absolute bottom-3 left-3 right-3 h-1/5 bg-gradient-to-t from-riso-walnut/20 to-riso-walnut/5 rounded-b-[1.8rem]" />

        <!-- Placed items inside jar -->
        <div
          v-for="(item, idx) in placedItems"
          :key="idx"
          class="absolute transition-all duration-300"
          :style="{ left: item.x + '%', top: item.y + '%', transform: `rotate(${item.rotation}deg)` }"
        >
          <div class="w-10 h-10 flex items-center justify-center text-2xl drop-shadow-sm animate-pulse-slow">
            {{ item.icon }}
          </div>
        </div>

        <!-- Glass reflection -->
        <div class="absolute top-6 left-6 w-8 h-20 bg-white/30 rounded-full rotate-12 blur-sm" />

        <!-- Edit mode overlay -->
        <div
          v-if="jarMode === 'edit'"
          class="absolute inset-0 bg-riso-navy/5 flex items-center justify-center"
        >
          <p class="text-xs text-riso-dark/30 bg-white/80 px-4 py-1.5 rounded-full border border-riso-walnut/10">
            Tap to place items
          </p>
        </div>
      </div>

      <!-- Edit mode: Horizontal item palette -->
      <div v-if="jarMode === 'edit'" class="space-y-3">
        <p class="text-xs text-riso-dark/30 font-medium">Inventory</p>
        <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <div
            v-for="item in sampleItems"
            :key="item.name"
            class="text-center shrink-0"
          >
            <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-2xl border-2 border-transparent hover:border-riso-green/50 active:scale-95 transition-all riso-shadow-sm">
              {{ item.icon }}
            </div>
            <p class="text-[10px] mt-1.5 text-riso-dark/60 font-medium">{{ item.name }}</p>
            <p class="text-[10px] text-riso-dark/25">x{{ item.qty }}</p>
          </div>
        </div>

        <!-- Background selector -->
        <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <div
            v-for="bg in backgrounds"
            :key="bg.name"
            :class="[
              'shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all',
              bg.active
                ? 'bg-riso-green/10 border-2 border-riso-green/40 text-riso-dark'
                : bg.locked
                  ? 'bg-gray-50 border border-gray-200 text-riso-dark/30'
                  : 'bg-white border border-riso-walnut/10 text-riso-dark/60'
            ]"
          >
            <span class="text-lg">{{ bg.icon }}</span>
            <span>{{ bg.name }}</span>
            <span v-if="bg.locked" class="text-[10px] bg-riso-walnut/10 px-1.5 py-0.5 rounded-full">Lv.{{ bg.level }}</span>
          </div>
        </div>
      </div>

      <!-- View mode: Stats & Share -->
      <div v-else class="flex gap-3">
        <div class="flex-1 bg-white rounded-2xl p-3 border border-riso-walnut/10 text-center riso-shadow-sm">
          <p class="text-xs text-riso-dark/30">Items</p>
          <p class="font-bold text-lg text-riso-dark">{{ placedItems.length }}</p>
        </div>
        <div class="flex-1 bg-white rounded-2xl p-3 border border-riso-walnut/10 text-center riso-shadow-sm">
          <p class="text-xs text-riso-dark/30">Background</p>
          <p class="font-bold text-sm text-riso-dark">{{ activeBackground.name }}</p>
        </div>
        <button class="flex-1 bg-riso-pink text-white rounded-2xl p-3 font-bold text-sm riso-shadow-sm active:scale-95 transition-transform">
          Share
        </button>
      </div>
    </template>

    <!-- ====================================================================
         2. POSTCARD - Terrarium on a rotated postcard
         ==================================================================== -->
    <template v-if="is('postcard')">
      <h2 class="text-center font-bold text-riso-dark">Today's Postcard</h2>

      <!-- Postcard frame -->
      <div class="flex justify-center py-4">
        <div class="relative w-[85%] rotate-[-2deg] transition-transform hover:rotate-0">
          <!-- Card shadow -->
          <div class="absolute inset-0 bg-riso-walnut/10 rounded-2xl translate-x-1 translate-y-1" />
          <!-- Card body -->
          <div class="relative bg-white rounded-2xl border-2 border-riso-walnut/10 overflow-hidden">
            <!-- Stamp area (top-right corner) -->
            <div class="absolute top-3 right-3 w-14 h-16 border-2 border-dashed border-riso-pink/30 rounded-lg flex items-center justify-center">
              <span class="text-2xl">{{ activeBackground.icon }}</span>
            </div>

            <!-- Terrarium illustration area -->
            <div class="aspect-[4/3] bg-gradient-to-b from-riso-cream/50 to-riso-green/5 p-6 flex items-end justify-center relative">
              <!-- Placed items as stamps on postcard -->
              <div
                v-for="(item, idx) in placedItems"
                :key="idx"
                class="absolute"
                :style="{ left: item.x + '%', top: item.y + '%', transform: `rotate(${item.rotation}deg)` }"
              >
                <div class="w-10 h-10 bg-white/60 rounded-xl border border-riso-walnut/10 flex items-center justify-center text-xl shadow-sm">
                  {{ item.icon }}
                </div>
              </div>

              <!-- Postmark overlay -->
              <div class="absolute top-4 left-4 w-16 h-16 border-2 border-riso-pink/20 rounded-full flex items-center justify-center rotate-[-15deg]">
                <span class="text-[8px] text-riso-pink/40 font-bold">TERRA<br>WORLD</span>
              </div>
            </div>

            <!-- Postcard message line -->
            <div class="p-4 border-t border-dashed border-riso-walnut/10">
              <div class="space-y-2">
                <div class="h-px bg-riso-walnut/10" />
                <div class="h-px bg-riso-walnut/10" />
                <p class="text-xs text-riso-dark/30 text-right italic">from my terrarium</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stamp collection (item palette) -->
      <div class="bg-white rounded-2xl p-4 border border-riso-walnut/10 riso-shadow-sm">
        <p class="text-xs text-riso-dark/30 font-medium mb-3">Stamp Collection</p>
        <div class="grid grid-cols-5 gap-3">
          <div
            v-for="item in sampleItems"
            :key="item.name"
            class="text-center"
          >
            <div class="aspect-square bg-riso-cream/60 rounded-xl border-2 border-dashed border-riso-walnut/10 flex items-center justify-center text-2xl hover:border-riso-pink/40 transition-colors active:scale-90">
              {{ item.icon }}
            </div>
            <p class="text-[10px] mt-1 text-riso-dark/40">x{{ item.qty }}</p>
          </div>
        </div>
      </div>

      <!-- Stamp It button + Background info -->
      <div class="flex gap-3">
        <button class="flex-1 bg-riso-pink text-white rounded-2xl py-3 font-bold text-sm riso-shadow-sm active:scale-95 transition-transform">
          Stamp It!
        </button>
        <div class="flex items-center gap-2 bg-white rounded-2xl px-4 border border-riso-walnut/10">
          <span class="text-lg">{{ activeBackground.icon }}</span>
          <span class="text-xs text-riso-dark/50">{{ activeBackground.name }}</span>
        </div>
        <button class="bg-riso-blue/10 text-riso-blue rounded-2xl px-4 font-medium text-xs border border-riso-blue/20">
          Share
        </button>
      </div>
    </template>

    <!-- ====================================================================
         3. SHELF - Split view with wooden shelf
         ==================================================================== -->
    <template v-if="is('shelf')">
      <!-- Top: Terrarium on shelf -->
      <div class="relative">
        <!-- Shelf back panel -->
        <div class="bg-gradient-to-b from-amber-50 to-amber-100/50 rounded-t-2xl p-4 pb-0 min-h-[260px] relative overflow-hidden">
          <!-- Wood grain texture lines -->
          <div class="absolute inset-0 opacity-5">
            <div v-for="i in 8" :key="i" class="h-px bg-amber-900 my-8" />
          </div>

          <!-- Terrarium display -->
          <div class="relative mx-auto w-3/4 aspect-[3/4] bg-white/40 rounded-2xl border-2 border-riso-walnut/10 overflow-hidden backdrop-blur-sm">
            <!-- Placed items -->
            <div
              v-for="(item, idx) in placedItems"
              :key="idx"
              class="absolute"
              :style="{ left: item.x + '%', top: item.y + '%', transform: `rotate(${item.rotation}deg)` }"
            >
              <div class="w-9 h-9 flex items-center justify-center text-xl">{{ item.icon }}</div>
            </div>

            <!-- Level badge -->
            <div class="absolute top-2 left-2 bg-white/80 px-2 py-0.5 rounded-full text-[10px] font-medium text-riso-dark/60">
              Lv.1
            </div>
          </div>
        </div>

        <!-- Shelf board -->
        <div class="h-3 bg-gradient-to-b from-amber-700/30 to-amber-800/20 rounded-b-lg shadow-md" />
        <!-- Shelf board edge -->
        <div class="h-1.5 bg-amber-900/15 rounded-b-xl mx-1" />
      </div>

      <!-- Share button row -->
      <div class="flex justify-end">
        <button class="bg-riso-pink text-white rounded-full px-5 py-2 text-xs font-bold riso-shadow-sm active:scale-95 transition-transform">
          Share
        </button>
      </div>

      <!-- Bottom: Tabbed inventory on second shelf -->
      <div class="relative">
        <!-- Shelf back -->
        <div class="bg-gradient-to-b from-amber-50/50 to-amber-100/30 rounded-2xl border border-amber-200/50 overflow-hidden">
          <!-- Tabs -->
          <div class="flex border-b border-amber-200/50">
            <button
              :class="[
                'flex-1 py-3 text-sm font-medium transition-colors',
                shelfTab === 'items'
                  ? 'text-riso-dark border-b-2 border-riso-green bg-white/40'
                  : 'text-riso-dark/30'
              ]"
              @click="shelfTab = 'items'"
            >
              Items ({{ sampleItems.length }})
            </button>
            <button
              :class="[
                'flex-1 py-3 text-sm font-medium transition-colors',
                shelfTab === 'bg'
                  ? 'text-riso-dark border-b-2 border-riso-green bg-white/40'
                  : 'text-riso-dark/30'
              ]"
              @click="shelfTab = 'bg'"
            >
              Backgrounds
            </button>
          </div>

          <div class="p-4">
            <!-- Items inventory -->
            <div v-if="shelfTab === 'items'" class="grid grid-cols-4 gap-3">
              <div v-for="item in sampleItems" :key="item.name" class="text-center">
                <div class="aspect-square bg-white/60 rounded-xl flex items-center justify-center text-2xl border-2 border-transparent active:border-riso-green/40 transition-colors riso-shadow-sm">
                  {{ item.icon }}
                </div>
                <p class="text-[10px] mt-1 text-riso-dark/50 truncate">{{ item.name }}</p>
                <p class="text-[10px] text-riso-dark/25">x{{ item.qty }}</p>
              </div>
              <div class="aspect-square bg-white/30 rounded-xl flex items-center justify-center text-riso-dark/15 text-2xl border-2 border-dashed border-amber-200/50">
                +
              </div>
            </div>

            <!-- Backgrounds -->
            <div v-else class="grid grid-cols-3 gap-3">
              <div v-for="bg in backgrounds" :key="bg.name" class="text-center">
                <div
                  :class="[
                    'aspect-[3/4] rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all',
                    bg.active
                      ? 'border-riso-green bg-white/60 riso-shadow-sm'
                      : bg.locked
                        ? 'border-gray-200/50 bg-gray-50/50 opacity-50'
                        : 'border-amber-200/50 bg-white/40'
                  ]"
                >
                  <span class="text-3xl">{{ bg.icon }}</span>
                  <span v-if="bg.locked" class="text-[10px] text-riso-dark/30">Lv.{{ bg.level }}</span>
                </div>
                <p class="text-[10px] mt-1 text-riso-dark/50">{{ bg.name }}</p>
              </div>
            </div>
          </div>
        </div>
        <!-- Second shelf board -->
        <div class="h-2 bg-gradient-to-b from-amber-700/20 to-amber-800/10 rounded-b-lg mx-1" />
      </div>
    </template>

    <!-- ====================================================================
         4. WINDOW - Terrarium on windowsill with sky
         ==================================================================== -->
    <template v-if="is('window')">
      <!-- Day/Night toggle -->
      <div class="flex justify-between items-center">
        <h2 class="font-bold text-riso-dark">Window View</h2>
        <button
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
            windowDayMode
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-indigo-950 border-indigo-800 text-indigo-200'
          ]"
          @click="windowDayMode = !windowDayMode"
        >
          <span>{{ windowDayMode ? 'Day' : 'Night' }}</span>
          <span>{{ windowDayMode ? '&star;' : '&starf;' }}</span>
        </button>
      </div>

      <!-- Window frame -->
      <div
        :class="[
          'relative rounded-2xl border-4 overflow-hidden transition-colors duration-500',
          windowDayMode ? 'border-amber-200/60' : 'border-indigo-900/40'
        ]"
      >
        <!-- Sky background -->
        <div
          :class="[
            'absolute inset-0 transition-colors duration-500',
            windowDayMode
              ? 'bg-gradient-to-b from-sky-300 via-sky-100 to-amber-50'
              : 'bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-800'
          ]"
        >
          <!-- Clouds (day) / Stars (night) -->
          <template v-if="windowDayMode">
            <div class="absolute top-8 left-[15%] w-16 h-6 bg-white/60 rounded-full blur-sm" />
            <div class="absolute top-12 left-[45%] w-20 h-5 bg-white/40 rounded-full blur-sm" />
            <div class="absolute top-6 right-[20%] w-12 h-4 bg-white/50 rounded-full blur-sm" />
          </template>
          <template v-else>
            <div v-for="i in 12" :key="i" class="absolute w-1 h-1 bg-white/70 rounded-full" :style="{ top: (i * 7 % 40) + '%', left: (i * 13 % 90) + '%' }" />
            <div class="absolute top-6 right-8 w-8 h-8 bg-amber-100/80 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.4)]" />
          </template>
        </div>

        <!-- Window crossbar (vertical) -->
        <div :class="['absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-2 z-10', windowDayMode ? 'bg-amber-200/80' : 'bg-indigo-800/60']" />
        <!-- Window crossbar (horizontal) -->
        <div :class="['absolute left-0 right-0 top-1/3 h-2 z-10', windowDayMode ? 'bg-amber-200/80' : 'bg-indigo-800/60']" />

        <!-- Windowsill with terrarium -->
        <div class="relative pt-[55%]">
          <!-- Sill surface -->
          <div :class="['relative h-32 transition-colors duration-500', windowDayMode ? 'bg-gradient-to-b from-amber-100 to-amber-50' : 'bg-gradient-to-b from-indigo-800/80 to-indigo-900/60']">
            <!-- Terrarium container on sill -->
            <div class="absolute -top-16 left-1/2 -translate-x-1/2 w-3/5">
              <div :class="['aspect-square rounded-2xl border-2 flex items-end justify-center p-4 relative overflow-hidden', windowDayMode ? 'bg-white/40 border-riso-walnut/15' : 'bg-white/10 border-white/15']">
                <div
                  v-for="(item, idx) in placedItems"
                  :key="idx"
                  class="absolute"
                  :style="{ left: item.x + '%', top: item.y + '%' }"
                >
                  <span class="text-lg">{{ item.icon }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Lower shelf: potted plants palette -->
      <div :class="['rounded-2xl p-4 border transition-colors duration-500', windowDayMode ? 'bg-amber-50/50 border-amber-200/30' : 'bg-indigo-950/50 border-indigo-800/30']">
        <p :class="['text-xs font-medium mb-3', windowDayMode ? 'text-riso-dark/30' : 'text-indigo-300/50']">Plants</p>
        <div class="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          <div v-for="item in sampleItems" :key="item.name" class="text-center shrink-0">
            <div :class="['w-14 h-14 rounded-xl flex items-center justify-center text-2xl border-2 border-transparent transition-colors', windowDayMode ? 'bg-white/60 hover:border-riso-green/30' : 'bg-white/10 hover:border-indigo-400/30']">
              {{ item.icon }}
            </div>
            <p :class="['text-[10px] mt-1', windowDayMode ? 'text-riso-dark/40' : 'text-indigo-300/40']">{{ item.name }}</p>
            <p :class="['text-[10px]', windowDayMode ? 'text-riso-dark/20' : 'text-indigo-400/20']">x{{ item.qty }}</p>
          </div>
        </div>
      </div>

      <!-- Background info + Share -->
      <div class="flex gap-3">
        <div :class="['flex-1 flex items-center gap-2 rounded-2xl px-4 py-3 border', windowDayMode ? 'bg-white border-riso-walnut/10' : 'bg-indigo-950 border-indigo-800/40']">
          <span class="text-lg">{{ activeBackground.icon }}</span>
          <span :class="['text-xs', windowDayMode ? 'text-riso-dark/50' : 'text-indigo-300/60']">{{ activeBackground.name }}</span>
        </div>
        <button class="bg-riso-pink text-white rounded-2xl px-5 py-3 font-bold text-sm riso-shadow-sm active:scale-95 transition-transform">
          Share
        </button>
      </div>
    </template>

    <!-- ====================================================================
         5. GARDEN - Top-down garden view
         ==================================================================== -->
    <template v-if="is('garden')">
      <div class="flex justify-between items-center">
        <h2 class="font-bold text-riso-dark">My Garden</h2>
        <button class="bg-riso-pink text-white rounded-full px-4 py-1.5 text-xs font-bold riso-shadow-sm active:scale-95 transition-transform">
          Share
        </button>
      </div>

      <!-- Garden map (top-down view) -->
      <div class="relative aspect-square bg-gradient-to-br from-green-100 via-green-50 to-emerald-100 rounded-2xl border-2 border-green-200/50 overflow-hidden riso-shadow">
        <!-- Grass pattern -->
        <div class="absolute inset-0 opacity-30">
          <div v-for="i in 20" :key="i" class="absolute w-3 h-3 text-[8px] text-green-500" :style="{ top: (i * 17 % 95) + '%', left: (i * 23 % 92) + '%' }">
            ~
          </div>
        </div>

        <!-- Garden path -->
        <div class="absolute top-1/2 left-0 right-0 h-8 bg-amber-200/30 -translate-y-1/2" />
        <div class="absolute left-1/2 top-0 bottom-0 w-8 bg-amber-200/30 -translate-x-1/2" />

        <!-- Placed items as garden plots -->
        <div
          v-for="(item, idx) in placedItems"
          :key="idx"
          class="absolute"
          :style="{ left: item.x + '%', top: item.y + '%', transform: `rotate(${item.rotation}deg)` }"
        >
          <div class="w-14 h-14 bg-amber-800/10 rounded-xl border-2 border-amber-700/15 flex items-center justify-center text-2xl shadow-inner">
            {{ item.icon }}
          </div>
        </div>

        <!-- Garden fence (decorative corners) -->
        <div class="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-600/20 rounded-tl-lg" />
        <div class="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-600/20 rounded-tr-lg" />
        <div class="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-600/20 rounded-bl-lg" />
        <div class="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-600/20 rounded-br-lg" />

        <!-- Edit hint -->
        <div class="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/80 px-3 py-1 rounded-full text-[10px] text-riso-dark/30 border border-green-200/50">
          Drag items to place
        </div>
      </div>

      <!-- Sidebar palette (below garden) -->
      <div class="bg-white rounded-2xl p-4 border border-green-200/30 riso-shadow-sm">
        <p class="text-xs text-riso-dark/30 font-medium mb-3">Seedlings</p>
        <div class="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          <div
            v-for="item in sampleItems"
            :key="item.name"
            class="text-center shrink-0"
          >
            <div class="w-16 h-16 bg-green-50 rounded-xl border-2 border-green-200/40 flex items-center justify-center text-2xl active:scale-90 transition-transform cursor-grab">
              {{ item.icon }}
            </div>
            <p class="text-[10px] mt-1.5 text-riso-dark/50 font-medium">{{ item.name }}</p>
            <p class="text-[10px] text-riso-dark/25">x{{ item.qty }}</p>
          </div>
        </div>
      </div>

      <!-- Background selector -->
      <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <div
          v-for="bg in backgrounds"
          :key="bg.name"
          :class="[
            'shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all',
            bg.active
              ? 'bg-green-100 border-2 border-green-400/40 text-riso-dark'
              : bg.locked
                ? 'bg-gray-50 border border-gray-200 text-riso-dark/30'
                : 'bg-white border border-green-200/30 text-riso-dark/60'
          ]"
        >
          <span class="text-lg">{{ bg.icon }}</span>
          <span>{{ bg.name }}</span>
          <span v-if="bg.locked" class="text-[10px] bg-green-100 px-1.5 py-0.5 rounded-full">Lv.{{ bg.level }}</span>
        </div>
      </div>
    </template>

    <!-- ====================================================================
         6. STORYBOOK - Terrarium in an open book
         ==================================================================== -->
    <template v-if="is('storybook')">
      <h2 class="text-center font-bold text-riso-dark">My Terrarium Story</h2>

      <!-- Open book frame -->
      <div class="relative">
        <!-- Book shadow -->
        <div class="absolute inset-0 bg-amber-900/5 rounded-xl translate-y-2 blur-md" />

        <!-- Book spread -->
        <div class="relative bg-gradient-to-r from-amber-50 via-orange-50/30 to-amber-50 rounded-xl border border-amber-200/40 overflow-hidden riso-shadow">
          <!-- Book spine (center fold) -->
          <div class="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 bg-gradient-to-r from-amber-100/80 via-amber-200/40 to-amber-100/80 z-10" />

          <!-- Left page: illustration -->
          <div class="flex">
            <div class="flex-1 p-4 relative min-h-[280px]">
              <!-- Page header ornament -->
              <div class="text-center mb-2">
                <span class="text-[10px] text-amber-400/60 tracking-widest uppercase">Chapter 1</span>
              </div>

              <!-- Terrarium illustration frame -->
              <div class="relative mx-auto w-full aspect-[4/5] bg-white/40 rounded-xl border border-amber-200/30 overflow-hidden">
                <!-- Warm watercolor wash -->
                <div class="absolute inset-0 bg-gradient-to-br from-amber-100/30 via-transparent to-orange-100/20" />

                <!-- Placed items as illustrations -->
                <div
                  v-for="(item, idx) in placedItems"
                  :key="idx"
                  class="absolute"
                  :style="{ left: item.x + '%', top: item.y + '%', transform: `rotate(${item.rotation}deg)` }"
                >
                  <div class="w-10 h-10 flex items-center justify-center text-2xl drop-shadow-sm">
                    {{ item.icon }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Right page: text area -->
            <div class="flex-1 p-4 relative min-h-[280px]">
              <div class="text-center mb-3">
                <span class="text-[10px] text-amber-400/60 tracking-widest uppercase">My Plants</span>
              </div>

              <!-- Item list styled as book text -->
              <div class="space-y-2.5">
                <div
                  v-for="item in sampleItems"
                  :key="item.name"
                  class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-100/30 transition-colors"
                >
                  <span class="text-lg">{{ item.icon }}</span>
                  <span class="text-xs text-amber-900/60 flex-1">{{ item.name }}</span>
                  <span class="text-[10px] text-amber-700/30">x{{ item.qty }}</span>
                </div>
              </div>

              <!-- Page number -->
              <p class="absolute bottom-3 right-4 text-[10px] text-amber-400/40">1</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Sticker palette (items to place) -->
      <div class="bg-gradient-to-r from-amber-50/50 to-orange-50/30 rounded-2xl p-4 border border-amber-200/30">
        <p class="text-xs text-amber-800/30 font-medium mb-3">Sticker Sheet</p>
        <div class="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          <div
            v-for="item in sampleItems"
            :key="item.name"
            class="text-center shrink-0"
          >
            <div class="w-14 h-14 bg-white/80 rounded-xl border-2 border-dashed border-amber-300/40 flex items-center justify-center text-2xl rotate-[-3deg] hover:rotate-0 transition-transform active:scale-90 cursor-grab">
              {{ item.icon }}
            </div>
            <p class="text-[10px] mt-1 text-amber-800/30">x{{ item.qty }}</p>
          </div>
        </div>
      </div>

      <!-- Background + Share -->
      <div class="flex gap-3">
        <div class="flex-1 flex items-center gap-2 bg-amber-50/50 rounded-2xl px-4 py-3 border border-amber-200/30">
          <span class="text-lg">{{ activeBackground.icon }}</span>
          <div>
            <p class="text-xs text-amber-900/60 font-medium">{{ activeBackground.name }}</p>
            <p class="text-[10px] text-amber-700/30">Current backdrop</p>
          </div>
        </div>
        <button class="bg-riso-pink text-white rounded-2xl px-5 py-3 font-bold text-sm riso-shadow-sm active:scale-95 transition-transform">
          Share
        </button>
      </div>
    </template>

    <!-- ====================================================================
         7. WINDOWSILL - Multiple shelves with potted plants
         ==================================================================== -->
    <template v-if="is('windowsill')">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="font-bold text-riso-dark">Plant Shelves</h2>
          <p class="text-[10px] text-riso-dark/30">Grow your collection</p>
        </div>
        <button class="bg-riso-pink text-white rounded-full px-4 py-1.5 text-xs font-bold riso-shadow-sm active:scale-95 transition-transform">
          Share
        </button>
      </div>

      <!-- Shelves container -->
      <div class="space-y-1">
        <!-- Shelf 1 (unlocked, main) -->
        <div class="relative">
          <div class="bg-gradient-to-b from-green-50 to-emerald-50/50 rounded-t-2xl p-4 pb-3 min-h-[100px] relative overflow-hidden">
            <!-- Oxygen bubbles floating up -->
            <div v-for="i in 5" :key="'b1-'+i" class="absolute w-2 h-2 bg-green-300/20 rounded-full animate-bounce" :style="{ left: (15 + i * 16) + '%', animationDelay: i * 0.3 + 's', animationDuration: '2s' }" />

            <!-- Placed items as potted plants on shelf -->
            <div class="flex items-end justify-around">
              <div v-for="(item, idx) in placedItems.slice(0, 2)" :key="idx" class="text-center">
                <div class="text-3xl mb-1">{{ item.icon }}</div>
                <div class="w-8 h-3 bg-amber-600/20 rounded-t-sm mx-auto" />
                <div class="w-10 h-2 bg-amber-700/20 rounded-b-lg mx-auto" />
              </div>
              <!-- Empty pot slot -->
              <div class="text-center opacity-30">
                <div class="w-8 h-8 border-2 border-dashed border-green-300 rounded-lg flex items-center justify-center text-green-300 text-xs">+</div>
                <div class="w-8 h-3 bg-amber-600/10 rounded-t-sm mx-auto mt-1" />
                <div class="w-10 h-2 bg-amber-700/10 rounded-b-lg mx-auto" />
              </div>
            </div>
          </div>
          <div class="h-3 bg-gradient-to-b from-amber-600/25 to-amber-700/15 rounded-b-lg shadow-sm" />
        </div>

        <!-- Shelf 2 (unlocked) -->
        <div class="relative mt-2">
          <div class="bg-gradient-to-b from-green-50/70 to-emerald-50/30 rounded-t-2xl p-4 pb-3 min-h-[90px] relative overflow-hidden">
            <div v-for="i in 3" :key="'b2-'+i" class="absolute w-1.5 h-1.5 bg-green-300/15 rounded-full animate-bounce" :style="{ left: (20 + i * 20) + '%', animationDelay: i * 0.5 + 's', animationDuration: '2.5s' }" />
            <div class="flex items-end justify-around">
              <div v-for="(item, idx) in placedItems.slice(2, 4)" :key="idx" class="text-center">
                <div class="text-2xl mb-1">{{ item.icon }}</div>
                <div class="w-7 h-2.5 bg-amber-600/15 rounded-t-sm mx-auto" />
                <div class="w-9 h-1.5 bg-amber-700/15 rounded-b-lg mx-auto" />
              </div>
            </div>
          </div>
          <div class="h-2.5 bg-gradient-to-b from-amber-600/20 to-amber-700/10 rounded-b-lg shadow-sm" />
        </div>

        <!-- Shelf 3 (locked) -->
        <div class="relative mt-2 opacity-40">
          <div class="bg-gradient-to-b from-gray-100 to-gray-50 rounded-t-2xl p-4 pb-3 min-h-[80px] flex items-center justify-center">
            <div class="text-center">
              <p class="text-lg">&#x1F512;</p>
              <p class="text-[10px] text-riso-dark/30 mt-1">Lv.5 to unlock</p>
            </div>
          </div>
          <div class="h-2.5 bg-gradient-to-b from-gray-400/20 to-gray-500/10 rounded-b-lg" />
        </div>

        <!-- Shelf 4 (locked) -->
        <div class="relative mt-2 opacity-25">
          <div class="bg-gradient-to-b from-gray-100 to-gray-50 rounded-t-2xl p-4 pb-3 min-h-[70px] flex items-center justify-center">
            <div class="text-center">
              <p class="text-lg">&#x1F512;</p>
              <p class="text-[10px] text-riso-dark/30 mt-1">Lv.10 to unlock</p>
            </div>
          </div>
          <div class="h-2 bg-gradient-to-b from-gray-400/15 to-gray-500/5 rounded-b-lg" />
        </div>
      </div>

      <!-- Item palette (horizontal scroll) -->
      <div class="bg-white rounded-2xl p-4 border border-riso-walnut/10 riso-shadow-sm">
        <p class="text-xs text-riso-dark/30 font-medium mb-3">Available Plants</p>
        <div class="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          <div v-for="item in sampleItems" :key="item.name" class="text-center shrink-0">
            <div class="w-14 h-14 bg-green-50 rounded-xl border border-green-200/40 flex items-center justify-center text-2xl active:scale-90 transition-transform">
              {{ item.icon }}
            </div>
            <p class="text-[10px] mt-1 text-riso-dark/40">{{ item.name }}</p>
            <p class="text-[10px] text-riso-dark/20">x{{ item.qty }}</p>
          </div>
        </div>
      </div>

      <!-- Background info -->
      <div class="flex gap-2 overflow-x-auto scrollbar-hide">
        <div
          v-for="bg in backgrounds"
          :key="bg.name"
          :class="[
            'shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs border',
            bg.active ? 'bg-green-50 border-green-300/40' : bg.locked ? 'bg-gray-50 border-gray-200 opacity-40' : 'bg-white border-riso-walnut/10'
          ]"
        >
          <span class="text-lg">{{ bg.icon }}</span>
          <span :class="bg.active ? 'text-riso-dark' : 'text-riso-dark/40'">{{ bg.name }}</span>
        </div>
      </div>
    </template>

    <!-- ====================================================================
         8. BUBBLE - Terrarium in a large central bubble
         ==================================================================== -->
    <template v-if="is('bubble')">
      <div class="flex justify-between items-center">
        <h2 class="font-bold text-riso-dark">Bubble World</h2>
        <button class="bg-riso-pink text-white rounded-full px-4 py-1.5 text-xs font-bold riso-shadow-sm active:scale-95 transition-transform">
          Share
        </button>
      </div>

      <!-- Bubble universe -->
      <div class="relative aspect-square bg-gradient-to-b from-sky-50 via-blue-50/30 to-indigo-50/20 rounded-[2.5rem] overflow-hidden riso-shadow">
        <!-- Ambient floating particles -->
        <div v-for="i in 8" :key="'particle-'+i" class="absolute w-1 h-1 bg-riso-blue/10 rounded-full" :style="{ top: (i * 11 % 90) + '%', left: (i * 17 % 85) + '%' }" />

        <!-- Main bubble (terrarium container) -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/5 aspect-square">
          <!-- Bubble glow -->
          <div class="absolute -inset-3 bg-riso-blue/5 rounded-full blur-xl" />
          <!-- Bubble body -->
          <div class="relative w-full h-full rounded-full bg-gradient-to-br from-white/60 via-sky-50/30 to-blue-100/20 border-2 border-white/60 shadow-[inset_0_-20px_40px_rgba(59,130,246,0.05)] overflow-hidden">
            <!-- Bubble highlight -->
            <div class="absolute top-3 left-4 w-6 h-8 bg-white/50 rounded-full rotate-[-20deg] blur-[2px]" />

            <!-- Placed items inside main bubble -->
            <div
              v-for="(item, idx) in placedItems"
              :key="idx"
              class="absolute"
              :style="{
                left: (item.x * 0.7 + 15) + '%',
                top: (item.y * 0.6 + 20) + '%',
                transform: `rotate(${item.rotation}deg)`,
              }"
            >
              <div class="w-8 h-8 flex items-center justify-center text-xl">
                {{ item.icon }}
              </div>
            </div>
          </div>
        </div>

        <!-- Floating item bubbles around the main one -->
        <div
          v-for="(item, idx) in sampleItems"
          :key="'float-'+idx"
          class="absolute"
          :style="{
            top: bubblePositions[idx]?.y + '%',
            left: bubblePositions[idx]?.x + '%',
          }"
        >
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-white/70 to-sky-100/30 border border-white/50 flex items-center justify-center text-xl shadow-sm animate-bounce cursor-grab" :style="{ animationDuration: (2 + idx * 0.3) + 's', animationDelay: idx * 0.2 + 's' }">
            {{ item.icon }}
          </div>
          <div class="text-center mt-0.5">
            <span class="text-[8px] text-riso-dark/25 bg-white/50 px-1 rounded-full">x{{ item.qty }}</span>
          </div>
        </div>

        <!-- Drag hint -->
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/70 px-3 py-1 rounded-full text-[10px] text-riso-dark/30 border border-white/50 backdrop-blur-sm">
          Drag bubbles inside
        </div>
      </div>

      <!-- Background selector (bubble style) -->
      <div class="flex gap-3 justify-center">
        <div
          v-for="bg in backgrounds"
          :key="bg.name"
          :class="[
            'text-center transition-all',
            bg.locked ? 'opacity-30' : ''
          ]"
        >
          <div
            :class="[
              'w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 transition-all mx-auto',
              bg.active
                ? 'bg-gradient-to-br from-sky-100 to-blue-100 border-riso-blue/30 riso-shadow-sm'
                : 'bg-white/60 border-white/60'
            ]"
          >
            {{ bg.icon }}
          </div>
          <p class="text-[10px] mt-1 text-riso-dark/40">{{ bg.name }}</p>
          <p v-if="bg.locked" class="text-[10px] text-riso-dark/20">Lv.{{ bg.level }}</p>
        </div>
      </div>

      <!-- Stats -->
      <div class="flex gap-3">
        <div class="flex-1 bg-white/70 rounded-2xl p-3 border border-white/50 text-center backdrop-blur-sm">
          <p class="text-xs text-riso-dark/30">Placed</p>
          <p class="font-bold text-lg text-riso-dark">{{ placedItems.length }}</p>
        </div>
        <div class="flex-1 bg-white/70 rounded-2xl p-3 border border-white/50 text-center backdrop-blur-sm">
          <p class="text-xs text-riso-dark/30">Available</p>
          <p class="font-bold text-lg text-riso-dark">{{ sampleItems.reduce((a, b) => a + b.qty, 0) }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { is } = useLayoutVariant()

// === Shared state ===
const jarMode = ref<'view' | 'edit'>('view')
const jarModes = [
  { key: 'view' as const, label: 'View' },
  { key: 'edit' as const, label: 'Edit' },
]
const shelfTab = ref<'items' | 'bg'>('items')
const windowDayMode = ref(true)

// === Mock data ===
const sampleItems = [
  { name: '작은 풀', icon: '🌿', qty: 2 },
  { name: '버섯', icon: '🍄', qty: 1 },
  { name: '돌멩이', icon: '🪨', qty: 3 },
  { name: '해바라기', icon: '🌻', qty: 1 },
  { name: '튤립', icon: '🌷', qty: 2 },
]

const backgrounds = [
  { name: '기본 유리병', icon: '🫧', active: true, locked: false, level: 0 },
  { name: '둥근 어항', icon: '🐠', active: false, locked: true, level: 5 },
  { name: '큰 화분', icon: '🪴', active: false, locked: true, level: 10 },
]

const placedItems = [
  { icon: '🌿', x: 28, y: 38, rotation: -5 },
  { icon: '🍄', x: 55, y: 52, rotation: 3 },
  { icon: '🪨', x: 40, y: 68, rotation: 0 },
  { icon: '🌱', x: 65, y: 72, rotation: -2 },
]

const activeBackground = computed(() => backgrounds.find(b => b.active) ?? backgrounds[0])

// Pre-computed positions for bubble variant floating items
const bubblePositions = [
  { x: 8, y: 12 },
  { x: 75, y: 8 },
  { x: 82, y: 55 },
  { x: 5, y: 65 },
  { x: 70, y: 80 },
]
</script>
