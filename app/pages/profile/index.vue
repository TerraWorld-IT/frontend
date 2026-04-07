<template>
  <div class="min-h-screen pb-24">
    <!-- Layout Selector -->
    <CommonLayoutSelector />

    <!-- ================================================================== -->
    <!-- 1. JAR - Profile card inside glass jar shape                       -->
    <!-- ================================================================== -->
    <div v-if="is('jar')" class="px-4 py-4 space-y-4">
      <!-- Glass Jar Profile -->
      <div class="relative mx-auto max-w-sm">
        <!-- Jar lid -->
        <div class="mx-8 h-6 bg-riso-walnut/30 rounded-t-lg border-2 border-riso-walnut/40 flex items-center justify-center">
          <span class="text-[10px] text-riso-walnut/60 font-medium tracking-wider">TERRA PROFILE</span>
        </div>
        <!-- Jar body -->
        <div class="relative border-2 border-riso-sage/30 rounded-b-[2rem] bg-gradient-to-b from-white/80 to-riso-sage/10 overflow-hidden min-h-[70vh]">
          <!-- Glass reflection -->
          <div class="absolute top-0 left-3 w-3 h-full bg-white/30 rounded-full blur-sm" />

          <!-- Jar fill level (level progress) -->
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-riso-sage/20 to-transparent transition-all duration-700" :style="{ height: levelPercent + '%' }" />

          <!-- Avatar floating in jar -->
          <div class="relative pt-8 text-center">
            <div class="w-20 h-20 mx-auto bg-riso-pink/30 rounded-full flex items-center justify-center text-4xl animate-float riso-shadow">
              🌱
            </div>
            <h2 class="font-bold text-lg mt-3 text-riso-dark">{{ user.nickname }}</h2>
            <p class="text-xs text-riso-dark/40">{{ user.email }}</p>
          </div>

          <!-- Floating stat labels around jar -->
          <div class="relative mt-6 px-4">
            <!-- Level badge -->
            <div class="flex justify-center mb-4">
              <span class="bg-riso-sage text-white text-xs px-3 py-1 rounded-full font-medium riso-shadow-sm">
                Lv.{{ user.level }} &middot; {{ user.totalExp }}/{{ user.maxExp }} EXP
              </span>
            </div>

            <!-- Floating stat bubbles -->
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-white/60 backdrop-blur-sm rounded-2xl p-3 text-center border border-riso-sage/20 animate-sway">
                <p class="text-2xl font-bold text-riso-forest">{{ stats.totalRecords }}</p>
                <p class="text-[10px] text-riso-dark/40 mt-0.5">total records</p>
              </div>
              <div class="bg-white/60 backdrop-blur-sm rounded-2xl p-3 text-center border border-riso-sage/20 animate-sway" style="animation-delay: 0.3s">
                <p class="text-2xl font-bold text-riso-terracotta">{{ stats.streakDays }}</p>
                <p class="text-[10px] text-riso-dark/40 mt-0.5">streak days</p>
              </div>
              <div class="bg-white/60 backdrop-blur-sm rounded-2xl p-3 text-center border border-riso-sage/20 animate-sway" style="animation-delay: 0.6s">
                <p class="text-2xl font-bold text-riso-sky">{{ stats.items }}</p>
                <p class="text-[10px] text-riso-dark/40 mt-0.5">items</p>
              </div>
              <div class="bg-white/60 backdrop-blur-sm rounded-2xl p-3 text-center border border-riso-sage/20 animate-sway" style="animation-delay: 0.9s">
                <p class="text-2xl font-bold text-riso-pink">{{ stats.shares }}</p>
                <p class="text-[10px] text-riso-dark/40 mt-0.5">shares</p>
              </div>
            </div>

            <!-- Category as floating labels -->
            <div class="mt-4 space-y-2">
              <div
                v-for="cat in categoryStats"
                :key="cat.name"
                class="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-xl px-3 py-2 border border-riso-sage/15"
              >
                <span class="text-lg">{{ cat.icon }}</span>
                <span class="text-xs font-medium flex-1">{{ cat.name }}</span>
                <div class="w-24 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div :class="['h-full rounded-full', cat.color]" :style="{ width: cat.percent + '%' }" />
                </div>
                <span class="text-[10px] text-riso-dark/40 w-8 text-right">{{ cat.count }}</span>
              </div>
            </div>

            <!-- Token list -->
            <div class="mt-4 grid grid-cols-2 gap-2">
              <div
                v-for="token in tokenList"
                :key="token.name"
                class="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-xl px-3 py-2 border border-riso-sage/15"
              >
                <span>{{ token.icon }}</span>
                <div>
                  <p class="text-[10px] text-riso-dark/40">{{ token.name }}</p>
                  <p class="text-sm font-bold text-riso-dark">{{ token.amount }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Spacer before bottom -->
          <div class="h-6" />
        </div>
        <!-- Jar bottom reflection -->
        <div class="mx-4 h-2 bg-riso-sage/10 rounded-b-full" />
      </div>

      <!-- Settings (outside jar) -->
      <div class="bg-white rounded-2xl border border-riso-sage/20 divide-y divide-riso-sage/10">
        <button class="w-full px-4 py-3.5 text-left text-sm flex justify-between items-center">
          <span>Settings</span>
          <span class="text-riso-dark/30">&rsaquo;</span>
        </button>
        <button class="w-full px-4 py-3.5 text-left text-sm flex justify-between items-center">
          <span>Notifications</span>
          <span class="text-riso-dark/30">&rsaquo;</span>
        </button>
        <button class="w-full px-4 py-3.5 text-left text-sm text-riso-poppy">
          Logout
        </button>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 2. POSTCARD - Vintage postcard with photo area & handwritten stats  -->
    <!-- ================================================================== -->
    <div v-if="is('postcard')" class="px-4 py-4 space-y-4">
      <!-- Postcard -->
      <div class="bg-riso-cream border-2 border-riso-walnut/20 rounded-xl overflow-hidden riso-shadow">
        <!-- Postcard top: stamp area -->
        <div class="flex justify-between items-start p-4 pb-0">
          <div class="flex items-center gap-3">
            <div class="w-16 h-16 bg-riso-peach/40 rounded-lg flex items-center justify-center text-3xl border border-riso-walnut/10">
              🌱
            </div>
            <div>
              <h2 class="font-bold text-lg text-riso-dark" style="font-family: serif">{{ user.nickname }}</h2>
              <p class="text-xs text-riso-dark/40 italic">{{ user.email }}</p>
            </div>
          </div>
          <!-- Stamp -->
          <div class="w-14 h-16 bg-riso-poppy/10 border-2 border-dashed border-riso-poppy/30 rounded flex flex-col items-center justify-center">
            <span class="text-lg">Lv.</span>
            <span class="text-xl font-bold text-riso-poppy">{{ user.level }}</span>
          </div>
        </div>

        <!-- Divider line -->
        <div class="mx-4 my-3 border-t border-dashed border-riso-walnut/20" />

        <!-- Handwritten stats -->
        <div class="px-4 pb-3">
          <p class="text-xs text-riso-dark/40 mb-2 italic">Dear diary,</p>
          <div class="grid grid-cols-2 gap-x-6 gap-y-2" style="font-family: serif">
            <p class="text-sm"><span class="text-riso-forest font-bold">{{ stats.totalRecords }}</span> records written</p>
            <p class="text-sm"><span class="text-riso-terracotta font-bold">{{ stats.streakDays }}</span> days in a row</p>
            <p class="text-sm"><span class="text-riso-sky font-bold">{{ stats.items }}</span> items collected</p>
            <p class="text-sm"><span class="text-riso-pink font-bold">{{ stats.shares }}</span> stories shared</p>
          </div>
        </div>

        <!-- Level progress as postmark -->
        <div class="px-4 pb-3">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] text-riso-dark/40 uppercase tracking-wider">EXP Progress</span>
            <span class="text-[10px] text-riso-dark/30">{{ user.totalExp }}/{{ user.maxExp }}</span>
          </div>
          <div class="h-2 bg-riso-walnut/10 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-riso-poppy to-riso-terracotta rounded-full" :style="{ width: levelPercent + '%' }" />
          </div>
        </div>

        <!-- Postmark achievements (category stats) -->
        <div class="px-4 pb-4">
          <p class="text-[10px] text-riso-dark/40 uppercase tracking-wider mb-2">Postmarks</p>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="cat in categoryStats"
              :key="cat.name"
              class="flex items-center gap-1.5 bg-white/60 border border-riso-walnut/15 rounded-full px-3 py-1.5"
            >
              <span class="text-sm">{{ cat.icon }}</span>
              <span class="text-xs font-medium">{{ cat.name }}</span>
              <span class="text-xs text-riso-dark/40">x{{ cat.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Category distribution bar -->
      <div class="bg-white rounded-2xl p-4 border border-riso-walnut/10">
        <h3 class="text-sm font-bold mb-3" style="font-family: serif">Category Distribution</h3>
        <div class="flex h-4 rounded-full overflow-hidden">
          <div
            v-for="cat in categoryStats"
            :key="cat.name"
            :class="['h-full first:rounded-l-full last:rounded-r-full', cat.color]"
            :style="{ width: cat.percent + '%' }"
          />
        </div>
        <div class="flex justify-between mt-2">
          <div v-for="cat in categoryStats" :key="cat.name" class="flex items-center gap-1">
            <span class="text-xs">{{ cat.icon }}</span>
            <span class="text-[10px] text-riso-dark/40">{{ cat.percent }}%</span>
          </div>
        </div>
      </div>

      <!-- Token list as postage collection -->
      <div class="bg-white rounded-2xl p-4 border border-riso-walnut/10">
        <h3 class="text-sm font-bold mb-3" style="font-family: serif">Token Collection</h3>
        <div class="grid grid-cols-2 gap-2">
          <div
            v-for="token in tokenList"
            :key="token.name"
            class="flex items-center gap-2 bg-riso-cream/50 rounded-lg p-3 border border-dashed border-riso-walnut/15"
          >
            <span class="text-xl">{{ token.icon }}</span>
            <div>
              <p class="text-[10px] text-riso-dark/40">{{ token.name }}</p>
              <p class="text-sm font-bold" style="font-family: serif">{{ token.amount }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings -->
      <div class="bg-white rounded-2xl border border-riso-walnut/10 divide-y divide-riso-walnut/10">
        <button class="w-full px-4 py-3.5 text-left text-sm flex justify-between items-center">
          <span style="font-family: serif">Settings</span>
          <span class="text-riso-dark/30">&rsaquo;</span>
        </button>
        <button class="w-full px-4 py-3.5 text-left text-sm text-riso-poppy" style="font-family: serif">
          Logout
        </button>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 3. SHELF - Bookshelf profile. Stats as framed photos.              -->
    <!-- ================================================================== -->
    <div v-if="is('shelf')" class="px-4 py-4 space-y-4">
      <!-- Bookshelf header -->
      <div class="bg-riso-walnut/10 rounded-2xl p-5 border border-riso-walnut/15">
        <!-- Top shelf: avatar + name -->
        <div class="flex items-center gap-4 pb-4 border-b border-riso-walnut/15">
          <div class="w-16 h-16 bg-riso-butter/50 rounded-lg flex items-center justify-center text-3xl border-2 border-riso-walnut/20 riso-shadow-sm">
            🌱
          </div>
          <div class="flex-1">
            <h2 class="font-bold text-lg text-riso-dark">{{ user.nickname }}</h2>
            <p class="text-xs text-riso-dark/40">{{ user.email }}</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs bg-riso-walnut/15 text-riso-walnut px-2 py-0.5 rounded font-medium">Lv.{{ user.level }}</span>
              <span class="text-[10px] text-riso-dark/30">{{ user.totalExp }}/{{ user.maxExp }}</span>
            </div>
          </div>
        </div>

        <!-- Level progress as wood bar -->
        <div class="mt-3">
          <div class="h-2.5 bg-riso-walnut/10 rounded border border-riso-walnut/15 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-riso-walnut/60 to-riso-walnut/40 rounded" :style="{ width: levelPercent + '%' }" />
          </div>
        </div>
      </div>

      <!-- Framed photos shelf (stats) -->
      <div class="bg-riso-walnut/5 rounded-2xl p-4 border border-riso-walnut/10">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-sm">🖼️</span>
          <h3 class="text-sm font-bold text-riso-walnut">Framed Memories</h3>
        </div>
        <div class="grid grid-cols-4 gap-2">
          <div class="bg-white rounded-lg p-2 text-center border-2 border-riso-walnut/15 riso-shadow-sm">
            <p class="text-xl font-bold text-riso-forest">{{ stats.totalRecords }}</p>
            <p class="text-[9px] text-riso-dark/40 mt-0.5">Records</p>
          </div>
          <div class="bg-white rounded-lg p-2 text-center border-2 border-riso-walnut/15 riso-shadow-sm">
            <p class="text-xl font-bold text-riso-terracotta">{{ stats.streakDays }}</p>
            <p class="text-[9px] text-riso-dark/40 mt-0.5">Streak</p>
          </div>
          <div class="bg-white rounded-lg p-2 text-center border-2 border-riso-walnut/15 riso-shadow-sm">
            <p class="text-xl font-bold text-riso-sky">{{ stats.items }}</p>
            <p class="text-[9px] text-riso-dark/40 mt-0.5">Items</p>
          </div>
          <div class="bg-white rounded-lg p-2 text-center border-2 border-riso-walnut/15 riso-shadow-sm">
            <p class="text-xl font-bold text-riso-pink">{{ stats.shares }}</p>
            <p class="text-[9px] text-riso-dark/40 mt-0.5">Shares</p>
          </div>
        </div>
      </div>

      <!-- Book spines (category bars) -->
      <div class="bg-riso-walnut/5 rounded-2xl p-4 border border-riso-walnut/10">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-sm">📚</span>
          <h3 class="text-sm font-bold text-riso-walnut">Category Shelf</h3>
        </div>
        <div class="flex gap-2 h-40 items-end">
          <div
            v-for="cat in categoryStats"
            :key="cat.name"
            class="flex-1 flex flex-col items-center"
          >
            <div
              :class="['w-full rounded-t-sm border border-riso-walnut/20', cat.color, 'transition-all duration-500']"
              :style="{ height: cat.percent * 1.5 + 'px' }"
            />
            <div class="w-full bg-riso-walnut/10 rounded-b-sm p-1 text-center border border-t-0 border-riso-walnut/15">
              <span class="text-xs">{{ cat.icon }}</span>
              <p class="text-[9px] text-riso-dark/40">{{ cat.count }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Token drawer -->
      <div class="bg-riso-walnut/5 rounded-2xl border border-riso-walnut/10 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-3 border-b border-riso-walnut/10">
          <span class="text-sm">🗄️</span>
          <h3 class="text-sm font-bold text-riso-walnut">Token Drawer</h3>
        </div>
        <div class="divide-y divide-riso-walnut/10">
          <div
            v-for="token in tokenList"
            :key="token.name"
            class="flex items-center justify-between px-4 py-3 bg-white/50"
          >
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ token.icon }}</span>
              <span class="text-sm">{{ token.name }}</span>
            </div>
            <span class="font-bold text-riso-walnut">{{ token.amount }}</span>
          </div>
        </div>
      </div>

      <!-- Settings as drawer -->
      <div class="bg-white rounded-2xl border border-riso-walnut/15 divide-y divide-riso-walnut/10">
        <button class="w-full px-4 py-3.5 text-left text-sm flex justify-between items-center">
          <span class="flex items-center gap-2"><span>⚙️</span> Settings</span>
          <span class="text-riso-dark/30">&rsaquo;</span>
        </button>
        <button class="w-full px-4 py-3.5 text-left text-sm flex justify-between items-center">
          <span class="flex items-center gap-2"><span>🔔</span> Notifications</span>
          <span class="text-riso-dark/30">&rsaquo;</span>
        </button>
        <button class="w-full px-4 py-3.5 text-left text-sm text-riso-poppy">
          Logout
        </button>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 4. WINDOW - Profile banner with sky gradient, window pane stats     -->
    <!-- ================================================================== -->
    <div v-if="is('window')" class="px-4 py-4 space-y-4">
      <!-- Sky gradient banner -->
      <div class="rounded-2xl overflow-hidden riso-shadow">
        <!-- Sky area -->
        <div class="bg-gradient-to-b from-riso-sky/30 via-riso-sky/15 to-riso-peach/20 p-6 text-center">
          <div class="w-18 h-18 mx-auto bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl riso-shadow-sm animate-float">
            🌱
          </div>
          <h2 class="font-bold text-lg mt-3 text-riso-dark">{{ user.nickname }}</h2>
          <p class="text-xs text-riso-dark/40">{{ user.email }}</p>
          <!-- Level as horizon line -->
          <div class="mt-3 mx-auto max-w-48">
            <div class="flex justify-between text-[10px] text-riso-dark/40 mb-1">
              <span>Lv.{{ user.level }}</span>
              <span>{{ user.totalExp }}/{{ user.maxExp }}</span>
            </div>
            <div class="h-1.5 bg-white/40 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-riso-sky to-riso-peach rounded-full" :style="{ width: levelPercent + '%' }" />
            </div>
          </div>
        </div>
      </div>

      <!-- Window pane stats -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-gradient-to-br from-riso-sky/10 to-white rounded-2xl p-4 text-center border border-riso-sky/20 riso-shadow-sm">
          <p class="text-2xl font-bold text-riso-forest">{{ stats.totalRecords }}</p>
          <p class="text-[10px] text-riso-dark/40 mt-1">Total Records</p>
        </div>
        <div class="bg-gradient-to-br from-riso-peach/10 to-white rounded-2xl p-4 text-center border border-riso-peach/20 riso-shadow-sm">
          <p class="text-2xl font-bold text-riso-terracotta">{{ stats.streakDays }}</p>
          <p class="text-[10px] text-riso-dark/40 mt-1">Streak Days</p>
        </div>
        <div class="bg-gradient-to-br from-riso-lavender/10 to-white rounded-2xl p-4 text-center border border-riso-lavender/20 riso-shadow-sm">
          <p class="text-2xl font-bold text-riso-navy">{{ stats.items }}</p>
          <p class="text-[10px] text-riso-dark/40 mt-1">Items</p>
        </div>
        <div class="bg-gradient-to-br from-riso-pink/10 to-white rounded-2xl p-4 text-center border border-riso-pink/20 riso-shadow-sm">
          <p class="text-2xl font-bold text-riso-pink">{{ stats.shares }}</p>
          <p class="text-[10px] text-riso-dark/40 mt-1">Shares</p>
        </div>
      </div>

      <!-- Category chart as landscape layers -->
      <div class="bg-white rounded-2xl p-4 border border-riso-sky/15 overflow-hidden">
        <h3 class="text-sm font-bold mb-3 text-riso-navy">Landscape View</h3>
        <div class="relative h-32">
          <!-- Layered landscape bars -->
          <div
            v-for="(cat, i) in categoryStats"
            :key="cat.name"
            class="absolute bottom-0 left-0 right-0 flex items-end justify-center transition-all"
            :style="{ height: (cat.percent * 1.2) + 'px', zIndex: categoryStats.length - i }"
          >
            <div
              :class="['w-full rounded-t-2xl opacity-70', cat.color]"
              :style="{ height: '100%' }"
            />
          </div>
          <!-- Labels overlay -->
          <div class="absolute bottom-2 left-0 right-0 flex justify-around z-10">
            <div v-for="cat in categoryStats" :key="cat.name" class="text-center">
              <span class="text-lg">{{ cat.icon }}</span>
              <p class="text-[9px] text-riso-dark/60 font-medium">{{ cat.percent }}%</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Token list -->
      <div class="bg-white rounded-2xl p-4 border border-riso-sky/15">
        <h3 class="text-sm font-bold mb-3 text-riso-navy">Tokens</h3>
        <div class="grid grid-cols-2 gap-2">
          <div
            v-for="token in tokenList"
            :key="token.name"
            class="flex items-center gap-2 bg-riso-sky/5 rounded-xl px-3 py-2.5 border border-riso-sky/10"
          >
            <span class="text-lg">{{ token.icon }}</span>
            <div>
              <p class="text-[10px] text-riso-dark/40">{{ token.name }}</p>
              <p class="text-sm font-bold text-riso-navy">{{ token.amount }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings -->
      <div class="bg-white rounded-2xl border border-riso-sky/15 divide-y divide-riso-sky/10">
        <button class="w-full px-4 py-3.5 text-left text-sm flex justify-between items-center">
          <span>Settings</span>
          <span class="text-riso-dark/30">&rsaquo;</span>
        </button>
        <button class="w-full px-4 py-3.5 text-left text-sm text-riso-poppy">
          Logout
        </button>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 5. GARDEN - Garden stats map. Each stat is a garden plot.           -->
    <!-- ================================================================== -->
    <div v-if="is('garden')" class="px-4 py-4 space-y-4">
      <!-- Garden header -->
      <div class="bg-gradient-to-br from-riso-sage/15 to-riso-forest/10 rounded-2xl p-5 border border-riso-sage/20">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-riso-sage/20 rounded-full flex items-center justify-center text-3xl border-2 border-riso-sage/30">
            🌱
          </div>
          <div class="flex-1">
            <h2 class="font-bold text-lg text-riso-forest">{{ user.nickname }}</h2>
            <p class="text-xs text-riso-dark/40">{{ user.email }}</p>
          </div>
        </div>
        <!-- Level progress as soil bar -->
        <div class="mt-3">
          <div class="flex justify-between text-[10px] text-riso-dark/40 mb-1">
            <span>Lv.{{ user.level }} Gardener</span>
            <span>{{ user.totalExp }}/{{ user.maxExp }} EXP</span>
          </div>
          <div class="h-2.5 bg-riso-earth/20 rounded-full overflow-hidden border border-riso-earth/20">
            <div class="h-full bg-gradient-to-r from-riso-sage to-riso-forest rounded-full" :style="{ width: levelPercent + '%' }" />
          </div>
        </div>
      </div>

      <!-- Garden plots (stats) -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-riso-sage/10 rounded-2xl p-4 text-center border border-riso-sage/20 relative overflow-hidden">
          <div class="text-3xl mb-1" :style="{ transform: `scale(${0.5 + stats.totalRecords / 60})` }">🌳</div>
          <p class="text-xl font-bold text-riso-forest">{{ stats.totalRecords }}</p>
          <p class="text-[10px] text-riso-dark/40">Records</p>
          <div class="absolute bottom-0 left-0 right-0 h-2 bg-riso-earth/20" />
        </div>
        <div class="bg-riso-terracotta/10 rounded-2xl p-4 text-center border border-riso-terracotta/20 relative overflow-hidden">
          <div class="text-3xl mb-1" :style="{ transform: `scale(${0.5 + stats.streakDays / 10})` }">🔥</div>
          <p class="text-xl font-bold text-riso-terracotta">{{ stats.streakDays }}</p>
          <p class="text-[10px] text-riso-dark/40">Streak</p>
          <div class="absolute bottom-0 left-0 right-0 h-2 bg-riso-earth/20" />
        </div>
        <div class="bg-riso-sky/10 rounded-2xl p-4 text-center border border-riso-sky/20 relative overflow-hidden">
          <div class="text-3xl mb-1" :style="{ transform: `scale(${0.5 + stats.items / 16})` }">🌸</div>
          <p class="text-xl font-bold text-riso-sky">{{ stats.items }}</p>
          <p class="text-[10px] text-riso-dark/40">Items</p>
          <div class="absolute bottom-0 left-0 right-0 h-2 bg-riso-earth/20" />
        </div>
        <div class="bg-riso-pink/10 rounded-2xl p-4 text-center border border-riso-pink/20 relative overflow-hidden">
          <div class="text-3xl mb-1" :style="{ transform: `scale(${0.5 + stats.shares / 4})` }">🦋</div>
          <p class="text-xl font-bold text-riso-pink">{{ stats.shares }}</p>
          <p class="text-[10px] text-riso-dark/40">Shares</p>
          <div class="absolute bottom-0 left-0 right-0 h-2 bg-riso-earth/20" />
        </div>
      </div>

      <!-- Category distribution as garden beds -->
      <div class="bg-white rounded-2xl p-4 border border-riso-sage/15">
        <h3 class="text-sm font-bold mb-3 text-riso-forest">Garden Beds</h3>
        <div class="space-y-3">
          <div v-for="cat in categoryStats" :key="cat.name">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-sm">{{ cat.icon }}</span>
              <span class="text-xs font-medium flex-1">{{ cat.name }}</span>
              <span class="text-[10px] text-riso-dark/40">{{ cat.count }} planted</span>
            </div>
            <div class="h-3 bg-riso-earth/10 rounded-full overflow-hidden border border-riso-earth/15">
              <div :class="['h-full rounded-full', cat.color]" :style="{ width: cat.percent + '%' }" />
            </div>
          </div>
        </div>
      </div>

      <!-- 4-week heatmap as garden beds -->
      <div class="bg-white rounded-2xl p-4 border border-riso-sage/15">
        <h3 class="text-sm font-bold mb-3 text-riso-forest">4-Week Garden</h3>
        <div class="grid grid-cols-7 gap-1.5">
          <span v-for="d in dayLabels" :key="d" class="text-center text-[9px] text-riso-dark/30">{{ d }}</span>
          <div
            v-for="i in 28"
            :key="'h' + i"
            :class="['aspect-square rounded-sm', heatmapColor(i)]"
          />
        </div>
      </div>

      <!-- Token garden -->
      <div class="bg-white rounded-2xl p-4 border border-riso-sage/15">
        <h3 class="text-sm font-bold mb-3 text-riso-forest">Token Harvest</h3>
        <div class="grid grid-cols-2 gap-2">
          <div
            v-for="token in tokenList"
            :key="token.name"
            class="flex items-center gap-2 bg-riso-sage/5 rounded-xl px-3 py-2.5 border border-riso-sage/15"
          >
            <span class="text-lg">{{ token.icon }}</span>
            <div>
              <p class="text-[10px] text-riso-dark/40">{{ token.name }}</p>
              <p class="text-sm font-bold text-riso-forest">{{ token.amount }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings -->
      <div class="bg-white rounded-2xl border border-riso-sage/15 divide-y divide-riso-sage/10">
        <button class="w-full px-4 py-3.5 text-left text-sm flex justify-between items-center">
          <span>Settings</span>
          <span class="text-riso-dark/30">&rsaquo;</span>
        </button>
        <button class="w-full px-4 py-3.5 text-left text-sm text-riso-poppy">
          Logout
        </button>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 6. STORYBOOK - Character sheet from a storybook. RPG attributes.   -->
    <!-- ================================================================== -->
    <div v-if="is('storybook')" class="px-4 py-4 space-y-4">
      <!-- Character sheet -->
      <div class="bg-riso-butter/20 rounded-2xl p-5 border-2 border-riso-walnut/20 riso-shadow">
        <!-- Character header -->
        <div class="text-center pb-4 border-b border-dashed border-riso-walnut/20">
          <p class="text-[10px] uppercase tracking-[0.3em] text-riso-walnut/50 mb-2">Character Sheet</p>
          <div class="w-20 h-20 mx-auto bg-riso-butter/40 rounded-full flex items-center justify-center text-4xl border-2 border-riso-walnut/20">
            🌱
          </div>
          <h2 class="font-bold text-xl mt-3 text-riso-dark" style="font-family: serif">{{ user.nickname }}</h2>
          <p class="text-xs text-riso-dark/40 italic">{{ user.email }}</p>
          <div class="inline-flex items-center gap-1 mt-2 bg-riso-walnut/10 px-3 py-1 rounded-full">
            <span class="text-xs font-bold text-riso-walnut">Level {{ user.level }}</span>
            <span class="text-[10px] text-riso-dark/40">Gardener</span>
          </div>
        </div>

        <!-- EXP bar -->
        <div class="mt-3">
          <div class="flex justify-between text-[10px] text-riso-dark/40 mb-1">
            <span>EXP</span>
            <span>{{ user.totalExp }} / {{ user.maxExp }}</span>
          </div>
          <div class="h-3 bg-riso-walnut/10 rounded-full overflow-hidden border border-riso-walnut/15">
            <div class="h-full bg-gradient-to-r from-riso-butter to-riso-terracotta rounded-full" :style="{ width: levelPercent + '%' }" />
          </div>
        </div>

        <!-- RPG attribute stats -->
        <div class="mt-4 grid grid-cols-2 gap-2">
          <div class="bg-white/50 rounded-xl p-3 border border-riso-walnut/10">
            <div class="flex items-center gap-1.5">
              <span class="text-xs">📝</span>
              <span class="text-[10px] text-riso-dark/40 uppercase tracking-wider">STR</span>
            </div>
            <p class="text-xl font-bold text-riso-forest mt-1">{{ stats.totalRecords }}</p>
            <p class="text-[9px] text-riso-dark/30">Record Power</p>
          </div>
          <div class="bg-white/50 rounded-xl p-3 border border-riso-walnut/10">
            <div class="flex items-center gap-1.5">
              <span class="text-xs">🔥</span>
              <span class="text-[10px] text-riso-dark/40 uppercase tracking-wider">END</span>
            </div>
            <p class="text-xl font-bold text-riso-terracotta mt-1">{{ stats.streakDays }}</p>
            <p class="text-[9px] text-riso-dark/30">Endurance</p>
          </div>
          <div class="bg-white/50 rounded-xl p-3 border border-riso-walnut/10">
            <div class="flex items-center gap-1.5">
              <span class="text-xs">🎒</span>
              <span class="text-[10px] text-riso-dark/40 uppercase tracking-wider">INT</span>
            </div>
            <p class="text-xl font-bold text-riso-navy mt-1">{{ stats.items }}</p>
            <p class="text-[9px] text-riso-dark/30">Inventory</p>
          </div>
          <div class="bg-white/50 rounded-xl p-3 border border-riso-walnut/10">
            <div class="flex items-center gap-1.5">
              <span class="text-xs">💫</span>
              <span class="text-[10px] text-riso-dark/40 uppercase tracking-wider">CHA</span>
            </div>
            <p class="text-xl font-bold text-riso-pink mt-1">{{ stats.shares }}</p>
            <p class="text-[9px] text-riso-dark/30">Charisma</p>
          </div>
        </div>
      </div>

      <!-- Quest log (category distribution) -->
      <div class="bg-riso-butter/10 rounded-2xl p-4 border border-riso-walnut/15">
        <h3 class="text-sm font-bold mb-3 text-riso-walnut" style="font-family: serif">Quest Log</h3>
        <div class="space-y-2.5">
          <div
            v-for="cat in categoryStats"
            :key="cat.name"
            class="flex items-center gap-3 bg-white/60 rounded-xl px-3 py-2.5 border border-riso-walnut/10"
          >
            <span class="text-lg">{{ cat.icon }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-center mb-1">
                <span class="text-xs font-medium">{{ cat.name }} Quest</span>
                <span class="text-[10px] text-riso-dark/40">{{ cat.count }}/{{ Math.round(cat.count / cat.percent * 100) }}</span>
              </div>
              <div class="h-2 bg-riso-walnut/10 rounded-full overflow-hidden">
                <div :class="['h-full rounded-full', cat.color]" :style="{ width: cat.percent + '%' }" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Token inventory -->
      <div class="bg-riso-butter/10 rounded-2xl p-4 border border-riso-walnut/15">
        <h3 class="text-sm font-bold mb-3 text-riso-walnut" style="font-family: serif">Inventory</h3>
        <div class="grid grid-cols-4 gap-2">
          <div
            v-for="token in tokenList"
            :key="token.name"
            class="bg-white/60 rounded-xl p-2 text-center border border-riso-walnut/10"
          >
            <span class="text-2xl block">{{ token.icon }}</span>
            <p class="text-xs font-bold text-riso-walnut mt-1">{{ token.amount }}</p>
            <p class="text-[8px] text-riso-dark/30 truncate">{{ token.name }}</p>
          </div>
        </div>
      </div>

      <!-- Settings -->
      <div class="bg-white rounded-2xl border border-riso-walnut/15 divide-y divide-riso-walnut/10">
        <button class="w-full px-4 py-3.5 text-left text-sm flex justify-between items-center" style="font-family: serif">
          <span>Character Settings</span>
          <span class="text-riso-dark/30">&rsaquo;</span>
        </button>
        <button class="w-full px-4 py-3.5 text-left text-sm text-riso-poppy" style="font-family: serif">
          Logout
        </button>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 7. WINDOWSILL - Clean plant catalog. Token list as potted plants.   -->
    <!-- ================================================================== -->
    <div v-if="is('windowsill')" class="px-4 py-4 space-y-4">
      <!-- Profile header -->
      <div class="bg-gradient-to-b from-riso-cream to-white rounded-2xl p-5 border border-riso-sage/15 riso-shadow-sm">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-riso-sage/15 rounded-2xl flex items-center justify-center text-3xl border border-riso-sage/20">
            🌱
          </div>
          <div class="flex-1">
            <h2 class="font-bold text-lg text-riso-dark">{{ user.nickname }}</h2>
            <p class="text-xs text-riso-dark/40">{{ user.email }}</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-[10px] bg-riso-sage/15 text-riso-forest px-2 py-0.5 rounded-full font-medium">Lv.{{ user.level }}</span>
            </div>
          </div>
        </div>
        <!-- Level bar -->
        <div class="mt-3">
          <div class="flex justify-between text-[10px] text-riso-dark/40 mb-1">
            <span>Growth Progress</span>
            <span>{{ user.totalExp }}/{{ user.maxExp }}</span>
          </div>
          <div class="h-2 bg-riso-sage/10 rounded-full overflow-hidden">
            <div class="h-full bg-riso-sage rounded-full" :style="{ width: levelPercent + '%' }" />
          </div>
        </div>
      </div>

      <!-- Stats as minimal grid -->
      <div class="grid grid-cols-4 gap-2">
        <div class="bg-white rounded-xl p-3 text-center border border-riso-sage/10">
          <p class="text-lg font-bold text-riso-forest">{{ stats.totalRecords }}</p>
          <p class="text-[9px] text-riso-dark/40">Records</p>
        </div>
        <div class="bg-white rounded-xl p-3 text-center border border-riso-sage/10">
          <p class="text-lg font-bold text-riso-terracotta">{{ stats.streakDays }}</p>
          <p class="text-[9px] text-riso-dark/40">Streak</p>
        </div>
        <div class="bg-white rounded-xl p-3 text-center border border-riso-sage/10">
          <p class="text-lg font-bold text-riso-sky">{{ stats.items }}</p>
          <p class="text-[9px] text-riso-dark/40">Items</p>
        </div>
        <div class="bg-white rounded-xl p-3 text-center border border-riso-sage/10">
          <p class="text-lg font-bold text-riso-pink">{{ stats.shares }}</p>
          <p class="text-[9px] text-riso-dark/40">Shares</p>
        </div>
      </div>

      <!-- Collection rate as shelf fill -->
      <div class="bg-white rounded-2xl p-4 border border-riso-sage/10">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-sm font-bold text-riso-forest">Collection Shelf</h3>
          <span class="text-[10px] text-riso-dark/40">{{ stats.items }} / 30</span>
        </div>
        <!-- Shelf visualization -->
        <div class="flex gap-1 h-8 items-end bg-riso-cream/50 rounded-lg p-1 border border-riso-sage/10">
          <div
            v-for="i in 30"
            :key="'c' + i"
            :class="['flex-1 rounded-t-sm transition-all', i <= stats.items ? 'bg-riso-sage' : 'bg-riso-sage/10']"
            :style="{ height: i <= stats.items ? '100%' : '30%' }"
          />
        </div>
        <div class="flex justify-between text-[9px] text-riso-dark/30 mt-1.5">
          <span>COMMON 8/15</span>
          <span>RARE 3/10</span>
          <span>EPIC 1/5</span>
        </div>
      </div>

      <!-- Category distribution -->
      <div class="bg-white rounded-2xl p-4 border border-riso-sage/10">
        <h3 class="text-sm font-bold mb-3 text-riso-forest">Categories</h3>
        <div class="space-y-2.5">
          <div v-for="cat in categoryStats" :key="cat.name" class="flex items-center gap-3">
            <span class="text-lg w-7">{{ cat.icon }}</span>
            <div class="flex-1">
              <div class="flex justify-between text-xs mb-1">
                <span>{{ cat.name }}</span>
                <span class="text-riso-dark/40">{{ cat.count }}</span>
              </div>
              <div class="h-1.5 bg-riso-sage/10 rounded-full overflow-hidden">
                <div :class="['h-full rounded-full', cat.color]" :style="{ width: cat.percent + '%' }" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Token list as potted plants on shelves -->
      <div class="bg-white rounded-2xl p-4 border border-riso-sage/10">
        <h3 class="text-sm font-bold mb-3 text-riso-forest">Token Plants</h3>
        <!-- Shelf row -->
        <div class="grid grid-cols-4 gap-3">
          <div
            v-for="token in tokenList"
            :key="token.name"
            class="text-center"
          >
            <!-- Plant pot -->
            <div class="bg-riso-cream rounded-xl p-2 border border-riso-sage/10 mb-1">
              <span class="text-2xl block animate-sway">{{ token.icon }}</span>
            </div>
            <!-- Shelf line -->
            <div class="h-1 bg-riso-walnut/20 rounded-full mx-1" />
            <p class="text-xs font-bold text-riso-forest mt-1.5">{{ token.amount }}</p>
            <p class="text-[8px] text-riso-dark/30 truncate">{{ token.name }}</p>
          </div>
        </div>
      </div>

      <!-- Settings -->
      <div class="bg-white rounded-2xl border border-riso-sage/10 divide-y divide-riso-sage/10">
        <button class="w-full px-4 py-3.5 text-left text-sm flex justify-between items-center">
          <span>Settings</span>
          <span class="text-riso-dark/30">&rsaquo;</span>
        </button>
        <button class="w-full px-4 py-3.5 text-left text-sm flex justify-between items-center">
          <span>Notifications</span>
          <span class="text-riso-dark/30">&rsaquo;</span>
        </button>
        <button class="w-full px-4 py-3.5 text-left text-sm text-riso-poppy">
          Logout
        </button>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 8. BUBBLE - Stats floating as bubbles of varying sizes             -->
    <!-- ================================================================== -->
    <div v-if="is('bubble')" class="px-4 py-4 space-y-4">
      <!-- Center bubble: avatar -->
      <div class="flex flex-col items-center py-6">
        <div class="w-24 h-24 bg-gradient-to-br from-riso-sky/30 to-riso-lavender/30 rounded-full flex items-center justify-center text-4xl riso-shadow animate-float border-2 border-white/60">
          🌱
        </div>
        <h2 class="font-bold text-lg mt-3 text-riso-dark">{{ user.nickname }}</h2>
        <p class="text-xs text-riso-dark/40">{{ user.email }}</p>
        <!-- Level bubble -->
        <div class="mt-2 bg-riso-lavender/20 px-4 py-1.5 rounded-full border border-riso-lavender/30">
          <span class="text-xs font-medium text-riso-navy">Lv.{{ user.level }}</span>
          <span class="text-[10px] text-riso-dark/30 ml-1">{{ user.totalExp }}/{{ user.maxExp }}</span>
        </div>
        <!-- Level progress -->
        <div class="w-48 mt-2">
          <div class="h-1.5 bg-riso-lavender/20 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-riso-sky to-riso-lavender rounded-full" :style="{ width: levelPercent + '%' }" />
          </div>
        </div>
      </div>

      <!-- Floating stat bubbles -->
      <div class="relative h-48">
        <!-- Total records bubble -->
        <div class="absolute top-0 left-4 w-24 h-24 bg-gradient-to-br from-riso-sage/20 to-riso-forest/10 rounded-full flex flex-col items-center justify-center border border-riso-sage/20 riso-shadow-sm animate-float">
          <p class="text-xl font-bold text-riso-forest">{{ stats.totalRecords }}</p>
          <p class="text-[8px] text-riso-dark/40">Records</p>
        </div>
        <!-- Streak bubble -->
        <div class="absolute top-2 right-6 w-20 h-20 bg-gradient-to-br from-riso-peach/20 to-riso-terracotta/10 rounded-full flex flex-col items-center justify-center border border-riso-peach/20 riso-shadow-sm animate-float" style="animation-delay: 0.5s">
          <p class="text-lg font-bold text-riso-terracotta">{{ stats.streakDays }}</p>
          <p class="text-[8px] text-riso-dark/40">Streak</p>
        </div>
        <!-- Items bubble -->
        <div class="absolute bottom-0 left-1/4 w-20 h-20 bg-gradient-to-br from-riso-sky/20 to-riso-navy/10 rounded-full flex flex-col items-center justify-center border border-riso-sky/20 riso-shadow-sm animate-float" style="animation-delay: 1s">
          <p class="text-lg font-bold text-riso-navy">{{ stats.items }}</p>
          <p class="text-[8px] text-riso-dark/40">Items</p>
        </div>
        <!-- Shares bubble -->
        <div class="absolute bottom-2 right-10 w-16 h-16 bg-gradient-to-br from-riso-pink/20 to-riso-lavender/10 rounded-full flex flex-col items-center justify-center border border-riso-pink/20 riso-shadow-sm animate-float" style="animation-delay: 1.5s">
          <p class="text-lg font-bold text-riso-pink">{{ stats.shares }}</p>
          <p class="text-[8px] text-riso-dark/40">Shares</p>
        </div>
      </div>

      <!-- Category distribution as bubble cluster -->
      <div class="bg-white rounded-2xl p-4 border border-riso-lavender/15">
        <h3 class="text-sm font-bold mb-3 text-riso-navy">Category Bubbles</h3>
        <div class="flex items-end justify-center gap-3 h-32">
          <div
            v-for="cat in categoryStats"
            :key="cat.name"
            class="flex flex-col items-center"
          >
            <div
              :class="['rounded-full flex items-center justify-center border-2 border-white/60 riso-shadow-sm', cat.color + '/20']"
              :style="{
                width: (40 + cat.percent * 0.8) + 'px',
                height: (40 + cat.percent * 0.8) + 'px',
              }"
            >
              <span class="text-lg">{{ cat.icon }}</span>
            </div>
            <p class="text-[9px] text-riso-dark/40 mt-1.5">{{ cat.name }}</p>
            <p class="text-[9px] font-medium text-riso-dark/60">{{ cat.percent }}%</p>
          </div>
        </div>
      </div>

      <!-- Token list as small bubbles -->
      <div class="bg-white rounded-2xl p-4 border border-riso-lavender/15">
        <h3 class="text-sm font-bold mb-3 text-riso-navy">Token Bubbles</h3>
        <div class="flex flex-wrap justify-center gap-3">
          <div
            v-for="token in tokenList"
            :key="token.name"
            class="flex flex-col items-center"
          >
            <div class="w-16 h-16 bg-gradient-to-br from-riso-sky/15 to-riso-lavender/15 rounded-full flex items-center justify-center border border-riso-sky/20 animate-sway">
              <span class="text-xl">{{ token.icon }}</span>
            </div>
            <p class="text-xs font-bold text-riso-navy mt-1">{{ token.amount }}</p>
            <p class="text-[8px] text-riso-dark/30">{{ token.name }}</p>
          </div>
        </div>
      </div>

      <!-- Settings -->
      <div class="bg-white rounded-2xl border border-riso-lavender/15 divide-y divide-riso-lavender/10">
        <button class="w-full px-4 py-3.5 text-left text-sm flex justify-between items-center">
          <span>Settings</span>
          <span class="text-riso-dark/30">&rsaquo;</span>
        </button>
        <button class="w-full px-4 py-3.5 text-left text-sm text-riso-poppy">
          Logout
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { is } = useLayoutVariant()

const user = { nickname: '테라가드너', email: 'terra@email.com', level: 3, totalExp: 300, maxExp: 600 }
const stats = { totalRecords: 42, streakDays: 7, items: 12, shares: 3 }
const categoryStats = [
  { name: '산책', icon: '🚶', count: 18, percent: 43, color: 'bg-riso-green' },
  { name: '독서', icon: '📖', count: 12, percent: 29, color: 'bg-riso-blue' },
  { name: '러닝', icon: '🏃', count: 8, percent: 19, color: 'bg-riso-red' },
  { name: '낙서', icon: '🎨', count: 4, percent: 10, color: 'bg-riso-orange' },
]
const tokenList = [
  { name: '산책토큰', icon: '🚶', amount: 45 },
  { name: '독서토큰', icon: '📖', amount: 30 },
  { name: '러닝토큰', icon: '🏃', amount: 20 },
  { name: '낙서토큰', icon: '🎨', amount: 10 },
]

const levelPercent = computed(() => Math.round((user.totalExp / user.maxExp) * 100))

const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Deterministic heatmap color based on cell index */
function heatmapColor(i: number): string {
  const seed = (i * 7 + 3) % 10
  if (seed < 3) return 'bg-gray-100'
  if (seed < 6) return 'bg-riso-sage/40'
  return 'bg-riso-sage'
}
</script>
