<template>
  <div class="riso-grain">
    <!-- 레이아웃 셀렉터 -->
    <div class="sticky top-14 z-30 bg-riso-cream/90 backdrop-blur-sm py-3 -mx-4 px-4 border-b border-riso-walnut/10">
      <div class="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        <button
          v-for="(l, i) in layouts"
          :key="l.id"
          :class="[
            'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
            current === i
              ? 'bg-riso-navy text-white riso-shadow-sm'
              : 'bg-white/70 text-riso-dark/50 border border-riso-walnut/15'
          ]"
          @click="current = i"
        >
          {{ l.emoji }} {{ l.name }}
        </button>
      </div>
      <p class="text-[10px] text-riso-dark/30 mt-1.5 text-center">{{ layouts[current].desc }}</p>
    </div>

    <!-- ===== 1. Jar View ===== -->
    <div v-if="current === 0" class="pt-4 pb-6 space-y-5">
      <!-- Glass dome header -->
      <div class="relative overflow-hidden rounded-b-[60px] bg-gradient-to-b from-white/40 to-riso-sage/10 border-b-2 border-white/50 mx-[-16px] px-4 pt-4 pb-8">
        <div class="absolute top-3 left-1/4 w-1/2 h-5 bg-white/30 rounded-full blur-md" />
        <div class="text-center relative z-10">
          <p class="text-xs text-riso-dark/40">Lv.1 · 경험치 0/100</p>
          <h2 class="font-bold mt-1">나의 테라리움 🫧</h2>
        </div>
      </div>

      <!-- Terrarium preview -->
      <div class="relative aspect-square mx-4 rounded-[2rem] bg-riso-cream border-2 border-riso-sage/20 overflow-hidden">
        <div class="absolute inset-6 border-2 border-riso-dark/5 rounded-[1.5rem]">
          <div class="absolute left-[28%] top-[38%] animate-sway"><span class="text-3xl">🌿</span></div>
          <div class="absolute left-[55%] top-[52%] animate-float" style="animation-delay: 1s"><span class="text-2xl">🍄</span></div>
          <div class="absolute left-[38%] top-[68%]"><span class="text-xl">🪨</span></div>
          <div class="absolute left-[65%] top-[72%] animate-sway" style="animation-delay: 0.5s"><span class="text-lg">🌱</span></div>
        </div>
        <div class="absolute bottom-0 inset-x-0 h-1/4 bg-gradient-to-t from-riso-earth/10 to-transparent rounded-b-[2rem]" />
      </div>

      <!-- Coin bar -->
      <div class="flex justify-center">
        <div class="inline-flex items-center gap-2 bg-white/70 px-4 py-2 rounded-full riso-shadow-sm">
          <span>🪙</span>
          <span class="font-bold text-sm">128</span>
          <span class="text-riso-dark/20">|</span>
          <span class="text-xs text-riso-sage font-medium">🔥 3일 연속</span>
        </div>
      </div>

      <!-- Today's activities -->
      <div class="px-1">
        <h3 class="text-sm font-bold mb-3">오늘의 기록</h3>
        <div class="flex gap-3 overflow-x-auto scrollbar-hide">
          <div v-for="cat in categories" :key="cat.name" class="shrink-0 w-20 text-center">
            <div :class="['w-16 h-20 mx-auto rounded-2xl flex flex-col items-center justify-center gap-1 riso-shadow-sm border', cat.border, cat.bg]">
              <span class="text-2xl">{{ cat.icon }}</span>
              <span class="text-[10px] font-bold text-riso-dark/60">{{ cat.count }}회</span>
            </div>
            <p class="text-xs mt-1.5 text-riso-dark/50">{{ cat.name }}</p>
          </div>
          <!-- Add button -->
          <div class="shrink-0 w-20 text-center">
            <div class="w-16 h-20 mx-auto rounded-2xl border-2 border-dashed border-riso-sage/30 flex items-center justify-center text-2xl text-riso-sage/40">
              +
            </div>
            <p class="text-xs mt-1.5 text-riso-dark/30">기록하기</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 2. Postcard Stack ===== -->
    <div v-if="current === 1" class="pt-4 pb-6 space-y-5">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <h2 class="font-bold">오늘의 엽서 💌</h2>
        <span class="text-xs text-riso-dark/40">2026.04.07</span>
      </div>

      <!-- Today's postcard -->
      <div class="relative mx-2">
        <!-- Yesterday peek -->
        <div class="absolute -bottom-3 left-3 right-3 h-12 bg-riso-cream/60 rounded-xl border border-riso-pink/20 rotate-[0.8deg] blur-[0.3px]" />

        <!-- Main postcard -->
        <div class="relative bg-riso-cream rounded-2xl p-5 border border-riso-pink/30 riso-shadow rotate-[-1deg] hover:rotate-0 transition-transform duration-300">
          <!-- Halftone dots -->
          <div class="absolute inset-0 rounded-2xl opacity-[0.04] riso-dots text-riso-navy" />

          <div class="relative z-10">
            <p class="text-xs text-riso-dark/40 mb-4">April 7, Monday</p>

            <!-- Stamp-style activities -->
            <div class="flex gap-3 mb-4">
              <div v-for="act in todayActivities" :key="act.name" class="text-center">
                <div :class="['p-2.5 border-2 border-dashed rounded-xl riso-shadow-sm', act.border, act.bg]">
                  <span class="text-2xl">{{ act.icon }}</span>
                </div>
                <p class="text-[10px] mt-1 text-riso-dark/50">{{ act.label }}</p>
              </div>
            </div>

            <!-- Note -->
            <p class="text-sm text-riso-dark/70 italic border-l-2 border-riso-pink/40 pl-3 mb-3">
              "한강 산책 30분, 아토믹 해빗 3장"
            </p>

            <!-- Rewards -->
            <div class="flex items-center gap-3 text-xs">
              <span class="bg-riso-butter/60 px-2.5 py-1 rounded-full">🪙 +24</span>
              <span class="bg-riso-sage/15 px-2.5 py-1 rounded-full">⭐ +30 EXP</span>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <button class="mx-auto block px-8 py-3 rounded-full bg-riso-pink text-white font-bold text-sm riso-shadow active:translate-x-[3px] active:translate-y-[4px] active:shadow-none transition-all duration-100">
        + 오늘 기록 추가하기
      </button>

      <!-- Mini terrarium -->
      <div class="flex gap-3">
        <div class="flex-1 bg-white/60 rounded-2xl p-4 border border-riso-pink/15 text-center">
          <div class="w-16 h-16 mx-auto bg-riso-cream rounded-xl flex items-center justify-center text-3xl mb-1 border border-riso-sage/10">🫧</div>
          <p class="text-xs text-riso-dark/40">내 테라리움</p>
        </div>
        <div class="flex-1 space-y-2">
          <div class="bg-white/60 rounded-xl p-3 border border-riso-pink/15">
            <p class="text-[10px] text-riso-dark/30">코인</p>
            <p class="font-bold text-riso-dark">128</p>
          </div>
          <div class="bg-white/60 rounded-xl p-3 border border-riso-pink/15">
            <p class="text-[10px] text-riso-dark/30">Lv.1</p>
            <div class="h-1.5 bg-riso-pink/10 rounded-full mt-1">
              <div class="h-full bg-riso-pink rounded-full" style="width: 30%" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 3. Cozy Shelf ===== -->
    <div v-if="current === 2" class="pt-2 pb-6">
      <!-- Top shelf: Terrarium -->
      <div class="h-3 bg-gradient-to-b from-riso-walnut via-riso-walnut to-riso-earth rounded-sm mx-1 shadow-[0_3px_6px_rgba(0,0,0,0.15)]" />
      <div class="bg-riso-butter/30 mx-1 p-4 rounded-b-lg min-h-[180px] flex items-center justify-center">
        <div class="relative">
          <div class="w-36 h-36 bg-riso-cream rounded-[2rem] border-2 border-riso-sage/15 flex items-center justify-center overflow-hidden">
            <div class="relative w-full h-full">
              <span class="absolute left-[25%] top-[30%] text-2xl animate-sway">🌿</span>
              <span class="absolute left-[55%] top-[45%] text-xl animate-float">🍄</span>
              <span class="absolute left-[40%] top-[65%] text-sm">🪨</span>
            </div>
          </div>
          <p class="text-center text-xs text-riso-walnut/60 mt-2">나의 테라리움 · Lv.1</p>
        </div>
      </div>

      <!-- Middle shelf: Activity books -->
      <div class="h-3 bg-gradient-to-b from-riso-walnut via-riso-walnut to-riso-earth rounded-sm mx-1 shadow-[0_3px_6px_rgba(0,0,0,0.15)] mt-4" />
      <div class="bg-riso-butter/20 mx-1 p-4 rounded-b-lg">
        <p class="text-xs text-riso-walnut/50 mb-3">오늘의 기록</p>
        <div class="flex gap-2 justify-center">
          <div
            v-for="book in bookSpines"
            :key="book.name"
            :class="['w-14 h-28 rounded-sm cursor-pointer flex items-end justify-center pb-2 transition-transform duration-200 hover:-translate-y-2 hover:rotate-[-2deg]', book.bg]"
            :style="{ boxShadow: '2px 0px 0px 0px rgba(0,0,0,0.1)' }"
          >
            <span class="text-[9px] font-bold text-white/80 [writing-mode:vertical-rl]">{{ book.name }}</span>
          </div>
          <!-- Empty slot -->
          <div class="w-14 h-28 rounded-sm border-2 border-dashed border-riso-walnut/20 flex items-center justify-center text-riso-walnut/30 text-xl">
            +
          </div>
        </div>
      </div>

      <!-- Bottom shelf: Stats -->
      <div class="h-3 bg-gradient-to-b from-riso-walnut via-riso-walnut to-riso-earth rounded-sm mx-1 shadow-[0_3px_6px_rgba(0,0,0,0.15)] mt-4" />
      <div class="bg-riso-butter/15 mx-1 p-4 rounded-b-lg flex justify-around items-end">
        <!-- Coin jar -->
        <div class="text-center">
          <div class="relative w-12 h-16 mx-auto rounded-b-xl rounded-t-md border-2 border-riso-butter/60 bg-white/30 overflow-hidden">
            <div class="absolute bottom-0 w-full h-[65%] bg-gradient-to-t from-amber-400 to-amber-300 rounded-b-lg">
              <div class="absolute top-1 left-1 w-2 h-2 rounded-full bg-amber-500/40" />
              <div class="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-amber-500/30" />
            </div>
          </div>
          <p class="text-xs text-riso-walnut/60 mt-1">128 코인</p>
        </div>

        <!-- Streak plant -->
        <div class="text-center">
          <div class="text-3xl animate-sway">🌱</div>
          <p class="text-xs text-riso-walnut/60 mt-1">3일 연속</p>
        </div>

        <!-- Level badge -->
        <div class="text-center">
          <div class="w-12 h-12 rounded-full bg-riso-sage/20 flex items-center justify-center border-2 border-riso-sage/30">
            <span class="font-bold text-sm text-riso-forest">1</span>
          </div>
          <p class="text-xs text-riso-walnut/60 mt-1">레벨</p>
        </div>
      </div>
    </div>

    <!-- ===== 4. Morning Window ===== -->
    <div v-if="current === 3" class="pt-2 pb-6 space-y-4">
      <!-- Greeting -->
      <div class="text-center py-2">
        <p class="text-xs text-riso-dark/40">{{ timeGreeting.sub }}</p>
        <h2 class="text-lg font-bold mt-1">{{ timeGreeting.main }}</h2>
      </div>

      <!-- Window -->
      <div class="mx-2">
        <!-- Window panes -->
        <div class="grid grid-cols-3 gap-[3px] bg-riso-walnut p-[4px] rounded-t-xl overflow-hidden">
          <div v-for="i in 3" :key="i" :class="['relative h-24 rounded-sm overflow-hidden', timeGreeting.skyGrad]">
            <div
              class="absolute w-10 h-3 bg-white/40 rounded-full blur-sm animate-drift"
              :style="{ top: 20 + i * 15 + '%', animationDelay: i * 3 + 's' }"
            />
            <div
              v-if="i === 2"
              class="absolute w-6 h-2 bg-white/25 rounded-full blur-sm animate-drift"
              style="top: 60%; animation-delay: 7s; animation-duration: 25s"
            />
          </div>
        </div>

        <!-- Windowsill -->
        <div class="h-4 bg-gradient-to-b from-riso-walnut to-riso-earth rounded-b-sm shadow-[0_4px_8px_rgba(0,0,0,0.1)]" />

        <!-- Sill items -->
        <div class="bg-riso-butter/30 rounded-b-xl p-4 flex justify-center gap-4 -mt-1 border-x border-b border-riso-walnut/10">
          <div class="w-20 h-20 bg-riso-cream rounded-2xl border border-riso-sage/15 flex items-center justify-center overflow-hidden relative">
            <span class="text-3xl">🫧</span>
            <div class="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-riso-sage/10 to-transparent" />
          </div>
          <div class="text-center flex flex-col justify-center">
            <p class="text-xs text-riso-dark/40">내 테라리움</p>
            <p class="text-sm font-bold">Lv.1</p>
            <p class="text-[10px] text-riso-dark/30">아이템 3개</p>
          </div>
        </div>
      </div>

      <!-- Light beam activity cards -->
      <div class="space-y-2.5 px-1">
        <h3 class="text-sm font-bold text-riso-dark/60">오늘의 빛 ✨</h3>
        <div
          v-for="act in todayActivities"
          :key="act.name"
          class="relative p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-riso-peach/20"
        >
          <div class="absolute -top-3 -left-3 w-20 h-20 rounded-full blur-2xl" :class="act.glow" />
          <div class="relative z-10 flex items-center gap-3">
            <span class="text-2xl">{{ act.icon }}</span>
            <div class="flex-1">
              <p class="text-sm font-medium">{{ act.label }}</p>
              <p class="text-xs text-riso-dark/40">{{ act.detail }}</p>
            </div>
            <span class="text-xs font-medium text-riso-sage bg-riso-sage/10 px-2 py-1 rounded-full">+{{ act.coin }}</span>
          </div>
        </div>

        <!-- Empty state -->
        <button class="w-full p-4 rounded-2xl border-2 border-dashed border-riso-peach/25 text-center text-sm text-riso-dark/30">
          + 오늘의 기록 추가하기
        </button>
      </div>

      <!-- Stats -->
      <div class="flex gap-2">
        <div class="flex-1 bg-white/50 rounded-xl p-3 text-center border border-riso-peach/10">
          <p class="font-bold text-lg text-riso-poppy">🪙 128</p>
          <p class="text-[10px] text-riso-dark/30">코인</p>
        </div>
        <div class="flex-1 bg-white/50 rounded-xl p-3 text-center border border-riso-peach/10">
          <p class="font-bold text-lg text-riso-sage">🔥 3</p>
          <p class="text-[10px] text-riso-dark/30">연속 기록일</p>
        </div>
      </div>
    </div>

    <!-- ===== 5. Garden Map ===== -->
    <div v-if="current === 4" class="pt-2 pb-6 space-y-4">
      <!-- Floating stats (signposts) -->
      <div class="flex justify-between px-1">
        <div class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-riso-walnut text-riso-cream text-xs font-bold rounded-md riso-shadow-sm">
          🪙 128
        </div>
        <div class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-riso-poppy text-white text-xs font-bold rounded-md riso-shadow-sm">
          🔥 3일 연속
        </div>
      </div>

      <!-- Garden map -->
      <div class="relative mx-1 rounded-3xl overflow-hidden" style="height: 420px; background: linear-gradient(135deg, #A8C686 0%, #8DB66D 40%, #C4D9A0 100%);">
        <!-- Riso overprint texture -->
        <div class="absolute inset-0 opacity-[0.06] mix-blend-multiply riso-dots text-riso-navy" />

        <!-- Winding path -->
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 400 420">
          <path d="M 80,380 C 80,300 320,280 200,220 C 80,160 320,120 200,60"
                fill="none" stroke="#B8926A" stroke-width="16" stroke-linecap="round" stroke-dasharray="3,10" opacity="0.5" />
        </svg>

        <!-- Activity plots -->
        <div class="absolute left-[12%] top-[78%]">
          <div class="w-14 h-14 rounded-xl bg-riso-walnut/20 border-2 border-dashed border-riso-walnut/30 flex items-center justify-center riso-shadow-sm hover:scale-110 transition-transform">
            <span class="text-2xl">🚶</span>
          </div>
          <p class="text-[9px] text-center text-white/70 mt-0.5 font-medium">산책</p>
        </div>
        <div class="absolute left-[65%] top-[55%]">
          <div class="w-14 h-14 rounded-xl bg-riso-walnut/20 border-2 border-dashed border-riso-walnut/30 flex items-center justify-center riso-shadow-sm hover:scale-110 transition-transform">
            <span class="text-2xl">📖</span>
          </div>
          <p class="text-[9px] text-center text-white/70 mt-0.5 font-medium">독서</p>
        </div>
        <div class="absolute left-[15%] top-[30%]">
          <div class="w-14 h-14 rounded-xl bg-riso-walnut/20 border-2 border-dashed border-riso-walnut/30 flex items-center justify-center riso-shadow-sm hover:scale-110 transition-transform">
            <span class="text-2xl">🏃</span>
          </div>
          <p class="text-[9px] text-center text-white/70 mt-0.5 font-medium">러닝</p>
        </div>
        <div class="absolute right-[18%] top-[12%]">
          <div class="w-14 h-14 rounded-xl bg-riso-walnut/20 border-2 border-dashed border-riso-walnut/30 flex items-center justify-center riso-shadow-sm hover:scale-110 transition-transform">
            <span class="text-2xl">🎨</span>
          </div>
          <p class="text-[9px] text-center text-white/70 mt-0.5 font-medium">낙서</p>
        </div>

        <!-- Greenhouse (center) -->
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div class="w-20 h-24 rounded-t-[2rem] rounded-b-lg bg-gradient-to-b from-white/30 to-riso-sage/20 border-2 border-white/50 backdrop-blur-[2px] flex items-center justify-center shadow-[0_0_20px_rgba(168,198,134,0.3)]">
            <span class="text-3xl">🫧</span>
          </div>
          <p class="text-[10px] text-center text-white/80 mt-1 font-bold">테라리움</p>
        </div>

        <!-- Decorative flowers -->
        <span class="absolute left-[40%] top-[85%] text-lg animate-sway">🌸</span>
        <span class="absolute left-[75%] top-[75%] text-sm animate-sway" style="animation-delay: 0.5s">🌼</span>
        <span class="absolute left-[85%] top-[25%] text-lg animate-sway" style="animation-delay: 1s">🌻</span>
        <span class="absolute left-[5%] top-[55%] text-sm animate-sway" style="animation-delay: 1.5s">🍀</span>
      </div>

      <!-- CTA -->
      <button class="mx-auto block px-8 py-3 rounded-full bg-riso-poppy text-white font-bold text-sm riso-shadow active:translate-x-[3px] active:translate-y-[4px] active:shadow-none transition-all duration-100">
        🌱 기록 심기
      </button>
    </div>

    <!-- ===== 6. Storybook (나의 작은 테라리움 참고) ===== -->
    <div v-if="current === 5" class="pt-4 pb-6 space-y-5">
      <!-- 동화책 표지 헤더 -->
      <div class="relative bg-gradient-to-br from-riso-butter via-riso-cream to-riso-peach/30 rounded-3xl p-6 mx-1 border border-riso-terracotta/15 overflow-hidden">
        <div class="absolute top-0 right-0 w-32 h-32 bg-riso-pink/10 rounded-full blur-3xl" />
        <div class="absolute bottom-0 left-0 w-24 h-24 bg-riso-sage/10 rounded-full blur-2xl" />
        <div class="relative z-10 text-center">
          <p class="text-[10px] text-riso-terracotta/60 tracking-widest uppercase mb-2">Chapter 7</p>
          <h2 class="text-xl font-bold text-riso-dark mb-1">4월 7일의 이야기</h2>
          <p class="text-xs text-riso-dark/40">오늘도 작은 세계가 자라고 있어요</p>
        </div>
      </div>

      <!-- 테라리움 + 동물 캐릭터 (동화 일러스트 느낌) -->
      <div class="relative mx-4">
        <div class="aspect-[4/3] bg-gradient-to-b from-riso-sky/20 via-riso-cream to-riso-sage/10 rounded-[2rem] border-2 border-riso-terracotta/10 overflow-hidden">
          <!-- 유리병 실루엣 -->
          <div class="absolute inset-x-8 top-4 bottom-4 border-2 border-riso-dark/5 rounded-[1.5rem]">
            <span class="absolute left-[20%] top-[25%] text-3xl animate-sway">🌿</span>
            <span class="absolute left-[50%] top-[35%] text-2xl animate-float" style="animation-delay: 0.7s">🌸</span>
            <span class="absolute left-[70%] top-[50%] text-xl animate-sway" style="animation-delay: 1.2s">🍄</span>
            <span class="absolute left-[35%] top-[60%] text-sm">🪨</span>
            <span class="absolute left-[55%] top-[70%] text-xl animate-sway" style="animation-delay: 0.3s">🌱</span>
          </div>
          <!-- 동물 캐릭터 (동화풍) -->
          <span class="absolute right-6 bottom-6 text-3xl animate-float" style="animation-delay: 2s">🐱</span>
          <span class="absolute left-6 bottom-8 text-2xl animate-float" style="animation-delay: 1s">🦊</span>
          <!-- 유리 반사광 -->
          <div class="absolute top-3 left-1/4 w-1/3 h-3 bg-white/25 rounded-full blur-sm" />
        </div>
        <!-- 장식 라벨 -->
        <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-riso-cream px-4 py-1 rounded-full border border-riso-terracotta/15 text-xs text-riso-dark/50 riso-shadow-sm">
          Lv.1 · 🌿 5개 · 🐱 2마리
        </div>
      </div>

      <!-- 오늘의 이야기 카드들 (페이지 넘기는 느낌) -->
      <div class="space-y-3 pt-2">
        <p class="text-xs text-riso-dark/40 px-1 italic">"오늘 테라리움에 새 친구가 찾아왔어요"</p>
        <div v-for="(story, i) in storyCards" :key="story.title" class="relative">
          <div
            :class="['p-4 rounded-2xl border transition-transform', story.bgClass]"
            :style="{ transform: `rotate(${(i % 2 === 0 ? -0.5 : 0.8)}deg)` }"
          >
            <div class="flex items-start gap-3">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-white/50">
                {{ story.icon }}
              </div>
              <div class="flex-1">
                <p class="font-medium text-sm">{{ story.title }}</p>
                <p class="text-xs text-riso-dark/40 mt-0.5">{{ story.desc }}</p>
                <div class="flex gap-2 mt-2">
                  <span class="text-[10px] bg-white/60 px-2 py-0.5 rounded-full">🪙 +{{ story.coin }}</span>
                  <span class="text-[10px] bg-white/60 px-2 py-0.5 rounded-full">⭐ +{{ story.exp }} EXP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 하단: 코인 + 다음 챕터 예고 -->
      <div class="flex gap-3">
        <div class="flex-1 bg-riso-butter/40 rounded-2xl p-3 text-center border border-riso-terracotta/10">
          <p class="text-lg font-bold">🪙 128</p>
          <p class="text-[10px] text-riso-dark/30">골드</p>
        </div>
        <button class="flex-1 bg-riso-terracotta text-white rounded-2xl p-3 font-bold text-sm riso-shadow active:translate-x-[2px] active:translate-y-[3px] active:shadow-none transition-all">
          + 이야기 이어가기
        </button>
      </div>
    </div>

    <!-- ===== 7. Windowsill (Terrarium Garden Idle 참고) ===== -->
    <div v-if="current === 6" class="pt-2 pb-6">
      <!-- 하늘 배경 + 나이트 모드 토글 -->
      <div class="relative rounded-3xl overflow-hidden mx-1 mb-4" :class="isNight ? 'bg-gradient-to-b from-indigo-900 via-indigo-800 to-purple-900' : 'bg-gradient-to-b from-riso-sky via-sky-200 to-sky-100'">
        <!-- 구름/별 -->
        <template v-if="!isNight">
          <div class="absolute w-16 h-5 bg-white/50 rounded-full blur-sm top-6 animate-drift" />
          <div class="absolute w-10 h-3 bg-white/40 rounded-full blur-sm top-12 animate-drift" style="animation-delay: 5s" />
          <div class="absolute w-12 h-4 bg-white/35 rounded-full blur-sm top-8 right-0 animate-drift" style="animation-delay: 10s" />
        </template>
        <template v-else>
          <div v-for="s in 12" :key="s" class="absolute w-1 h-1 bg-white rounded-full animate-float" :style="{ left: (s * 8) + '%', top: (5 + (s * 3) % 20) + '%', animationDelay: s * 0.3 + 's', opacity: 0.4 + Math.random() * 0.6 }" />
          <span class="absolute top-4 right-8 text-2xl">🌙</span>
        </template>

        <!-- 낮/밤 토글 -->
        <button class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm" @click="isNight = !isNight">
          {{ isNight ? '☀️' : '🌙' }}
        </button>

        <!-- 레벨 표시 -->
        <div class="absolute top-3 left-3 z-10">
          <span :class="['text-xs px-2.5 py-1 rounded-full font-bold', isNight ? 'bg-indigo-700/60 text-white' : 'bg-white/60 text-riso-dark/70']">
            Lv.1 · 🪙 128
          </span>
        </div>

        <!-- 창틀 선반 + 화분들 -->
        <div class="pt-24 pb-2">
          <!-- 선반 1 (메인) -->
          <div class="relative">
            <div class="flex justify-center gap-3 px-4 pb-2">
              <div v-for="plant in windowPlants" :key="plant.name" class="text-center group">
                <div class="relative">
                  <!-- 산소 버블 -->
                  <div class="absolute -top-4 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-riso-sky/30 animate-float border border-riso-sky/20" :style="{ animationDelay: plant.delay }" />
                  <div class="absolute -top-7 left-1/3 w-2 h-2 rounded-full bg-riso-sky/20 animate-float" :style="{ animationDelay: (parseFloat(plant.delay) + 0.5) + 's' }" />
                  <!-- 식물 -->
                  <div class="text-3xl group-hover:-translate-y-1 transition-transform animate-sway" :style="{ animationDelay: plant.delay }">
                    {{ plant.icon }}
                  </div>
                  <!-- 화분 -->
                  <div :class="['w-10 h-5 mx-auto rounded-b-lg -mt-1', plant.potColor]" />
                </div>
                <p :class="['text-[9px] mt-1 font-medium', isNight ? 'text-white/50' : 'text-riso-dark/40']">{{ plant.name }}</p>
              </div>
            </div>
            <!-- 나무 선반 -->
            <div :class="['h-3 mx-2 rounded-sm', isNight ? 'bg-gradient-to-b from-amber-900 to-amber-950' : 'bg-gradient-to-b from-riso-walnut to-riso-earth']" style="box-shadow: 0 3px 8px rgba(0,0,0,0.2)" />
          </div>

          <!-- 선반 2 (잠금) -->
          <div class="relative mt-6">
            <div class="flex justify-center gap-3 px-4 pb-2">
              <div v-for="i in 3" :key="i" class="text-center">
                <div class="w-10 h-10 rounded-lg border-2 border-dashed flex items-center justify-center text-sm" :class="isNight ? 'border-white/15 text-white/20' : 'border-riso-dark/10 text-riso-dark/15'">
                  🔒
                </div>
                <p :class="['text-[9px] mt-1', isNight ? 'text-white/30' : 'text-riso-dark/25']">Lv.3</p>
              </div>
            </div>
            <div :class="['h-3 mx-2 rounded-sm', isNight ? 'bg-gradient-to-b from-amber-900/50 to-amber-950/50' : 'bg-gradient-to-b from-riso-walnut/40 to-riso-earth/40']" />
          </div>
        </div>
      </div>

      <!-- 기록 카드 (심플) -->
      <div class="space-y-2 px-1">
        <div class="flex justify-between items-center mb-1">
          <h3 class="text-sm font-bold">오늘의 기록</h3>
          <span class="text-xs text-riso-dark/30">3/5 완료</span>
        </div>
        <div v-for="cat in categories" :key="cat.name" class="flex items-center gap-3 bg-white/50 rounded-xl p-3 border border-riso-walnut/8">
          <span class="text-xl">{{ cat.icon }}</span>
          <div class="flex-1">
            <p class="text-sm font-medium">{{ cat.name }}</p>
          </div>
          <span class="text-xs text-riso-dark/30">{{ cat.count }}회</span>
          <button class="w-8 h-8 rounded-lg bg-riso-sage/15 flex items-center justify-center text-sm text-riso-sage">+</button>
        </div>
      </div>

      <!-- 하단 통계 -->
      <div class="flex gap-2 px-1">
        <div class="flex-1 bg-riso-sage/10 rounded-xl p-3 text-center">
          <p class="font-bold text-riso-sage">🔥 3</p>
          <p class="text-[10px] text-riso-dark/30">연속</p>
        </div>
        <div class="flex-1 bg-riso-butter/40 rounded-xl p-3 text-center">
          <p class="font-bold">⭐ 30</p>
          <p class="text-[10px] text-riso-dark/30">EXP</p>
        </div>
        <div class="flex-1 bg-riso-pink/10 rounded-xl p-3 text-center">
          <p class="font-bold text-riso-pink">🫧 3</p>
          <p class="text-[10px] text-riso-dark/30">아이템</p>
        </div>
      </div>
    </div>

    <!-- ===== 8. Bubble Pop ===== -->
    <div v-if="current === 7" class="pt-4 pb-6 space-y-5">
      <!-- 중앙 원형 테라리움 -->
      <div class="relative flex justify-center">
        <div class="relative w-56 h-56">
          <!-- 외곽 원 (유리 효과) -->
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-riso-sage/10 to-riso-sky/10 border-2 border-white/50 shadow-[0_0_30px_rgba(168,198,134,0.2)]">
            <!-- 내부 아이템 -->
            <span class="absolute left-[28%] top-[25%] text-2xl animate-sway">🌿</span>
            <span class="absolute left-[55%] top-[35%] text-xl animate-float" style="animation-delay: 1s">🌸</span>
            <span class="absolute left-[40%] top-[55%] text-lg">🪨</span>
            <span class="absolute left-[65%] top-[60%] text-xl animate-sway" style="animation-delay: 0.5s">🍄</span>
            <!-- 유리 반사 -->
            <div class="absolute top-4 left-8 w-12 h-3 bg-white/30 rounded-full blur-sm rotate-[-20deg]" />
          </div>
          <!-- 레벨 뱃지 -->
          <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-riso-cream px-3 py-1 rounded-full border border-riso-sage/20 text-xs font-bold riso-shadow-sm">
            Lv.1
          </div>
        </div>

        <!-- 주변 떠다니는 버블들 (재화) -->
        <div class="absolute -left-2 top-4 animate-float" style="animation-delay: 0.5s">
          <div class="w-14 h-14 rounded-full bg-riso-butter/60 border border-riso-butter flex items-center justify-center riso-shadow-sm">
            <div class="text-center">
              <span class="text-sm">🪙</span>
              <p class="text-[8px] font-bold">128</p>
            </div>
          </div>
        </div>
        <div class="absolute -right-2 top-8 animate-float" style="animation-delay: 1.5s">
          <div class="w-12 h-12 rounded-full bg-riso-poppy/15 border border-riso-poppy/30 flex items-center justify-center">
            <div class="text-center">
              <span class="text-sm">🔥</span>
              <p class="text-[8px] font-bold">3일</p>
            </div>
          </div>
        </div>
        <div class="absolute left-4 -bottom-4 animate-float" style="animation-delay: 2s">
          <div class="w-11 h-11 rounded-full bg-riso-sage/15 border border-riso-sage/30 flex items-center justify-center">
            <span class="text-xs font-bold text-riso-sage">⭐30</span>
          </div>
        </div>
      </div>

      <!-- 카테고리 버블 그리드 -->
      <div class="px-4">
        <p class="text-xs text-riso-dark/40 text-center mb-3">탭해서 기록하기</p>
        <div class="flex justify-center gap-4">
          <div v-for="cat in categories" :key="cat.name" class="text-center group cursor-pointer">
            <div :class="['w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 transition-all duration-200 group-hover:scale-110 group-active:scale-95', cat.bg, cat.border]">
              {{ cat.icon }}
            </div>
            <p class="text-[10px] mt-1.5 text-riso-dark/50 font-medium">{{ cat.name }}</p>
            <p class="text-[9px] text-riso-dark/30">{{ cat.count }}회</p>
          </div>
        </div>
      </div>

      <!-- 오늘 기록 버블 타임라인 -->
      <div class="px-1">
        <h3 class="text-sm font-bold mb-3">오늘의 방울 💧</h3>
        <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          <div v-for="act in todayActivities" :key="act.name" class="shrink-0">
            <div :class="['w-20 h-20 rounded-full flex flex-col items-center justify-center border-2 riso-shadow-sm', act.bg, act.border]">
              <span class="text-xl">{{ act.icon }}</span>
              <span class="text-[8px] font-medium mt-0.5 text-riso-dark/60">+{{ act.coin }}</span>
            </div>
            <p class="text-[9px] text-center mt-1 text-riso-dark/40">{{ act.label }}</p>
          </div>
          <!-- 추가 버블 -->
          <div class="shrink-0">
            <div class="w-20 h-20 rounded-full border-2 border-dashed border-riso-dark/10 flex items-center justify-center text-riso-dark/20 text-xl">
              +
            </div>
            <p class="text-[9px] text-center mt-1 text-riso-dark/25">추가</p>
          </div>
        </div>
      </div>

      <!-- 경험치 바 (둥근 형태) -->
      <div class="mx-auto w-48">
        <div class="flex justify-between text-[10px] text-riso-dark/30 mb-1">
          <span>Lv.1</span>
          <span>30/100 EXP</span>
        </div>
        <div class="h-3 bg-riso-dark/5 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-riso-sage to-riso-sky rounded-full" style="width: 30%" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const current = ref(0)

const layouts = [
  { id: 'jar', emoji: '🫧', name: 'Jar View', desc: '유리병 속 세상 — 테라리움이 중심' },
  { id: 'postcard', emoji: '💌', name: 'Postcard', desc: '오늘의 엽서 — 하루를 카드로 기록' },
  { id: 'shelf', emoji: '📚', name: 'Cozy Shelf', desc: '나의 선반 — 책장 속 아늑한 공간' },
  { id: 'window', emoji: '🪟', name: 'Window', desc: '창가의 아침 — 시간에 따라 변하는 풍경' },
  { id: 'garden', emoji: '🗺️', name: 'Garden Map', desc: '나의 정원 지도 — 기록이 꽃으로 피어남' },
  { id: 'storybook', emoji: '📖', name: 'Storybook', desc: '동화책 — 매일이 새로운 챕터 (나의 작은 테라리움 참고)' },
  { id: 'windowsill', emoji: '🪴', name: 'Windowsill', desc: '창틀 위 화분 — 산소 버블이 올라오는 정원 (Garden Idle 참고)' },
  { id: 'bubble', emoji: '💧', name: 'Bubble Pop', desc: '방울 세상 — 둥글둥글 떠다니는 기록들' },
]

const categories = [
  { name: '산책', icon: '🚶', count: 1, bg: 'bg-green-50', border: 'border-green-200/50' },
  { name: '독서', icon: '📖', count: 0, bg: 'bg-blue-50', border: 'border-blue-200/50' },
  { name: '러닝', icon: '🏃', count: 0, bg: 'bg-red-50', border: 'border-red-200/50' },
  { name: '낙서', icon: '🎨', count: 0, bg: 'bg-orange-50', border: 'border-orange-200/50' },
]

const todayActivities = [
  { name: 'walk', icon: '🚶', label: '산책 30분', detail: '한강 산책로', coin: 10, border: 'border-green-300/60', bg: 'bg-green-50/50', glow: 'bg-green-200/20' },
  { name: 'read', icon: '📖', label: '독서 1시간', detail: '아토믹 해빗 3장', coin: 10, border: 'border-blue-300/60', bg: 'bg-blue-50/50', glow: 'bg-blue-200/20' },
  { name: 'run', icon: '🏃', label: '러닝 5km', detail: '아침 조깅', coin: 15, border: 'border-red-300/60', bg: 'bg-red-50/50', glow: 'bg-red-200/20' },
]

const bookSpines = [
  { name: '산책', bg: 'bg-gradient-to-r from-riso-sage to-riso-forest' },
  { name: '독서', bg: 'bg-gradient-to-r from-riso-sky to-riso-blue' },
  { name: '러닝', bg: 'bg-gradient-to-r from-riso-poppy to-riso-red' },
  { name: '낙서', bg: 'bg-gradient-to-r from-riso-orange to-riso-terracotta' },
]

const isNight = ref(false)

const storyCards = [
  { icon: '🚶', title: '산책 30분', desc: '한강 산책로를 따라 걸었어요', coin: 10, exp: 10, bgClass: 'bg-green-50/60 border-green-200/30' },
  { icon: '📖', title: '독서 1시간', desc: '아토믹 해빗 3장을 읽었어요', coin: 10, exp: 10, bgClass: 'bg-blue-50/60 border-blue-200/30' },
  { icon: '🏃', title: '러닝 5km', desc: '아침 조깅으로 하루를 시작했어요', coin: 15, exp: 15, bgClass: 'bg-red-50/60 border-red-200/30' },
]

const windowPlants = [
  { name: '선인장', icon: '🌵', potColor: 'bg-riso-terracotta', delay: '0s' },
  { name: '해바라기', icon: '🌻', potColor: 'bg-riso-walnut', delay: '0.5s' },
  { name: '허브', icon: '🌿', potColor: 'bg-riso-sage', delay: '1s' },
  { name: '튤립', icon: '🌷', potColor: 'bg-riso-pink', delay: '1.5s' },
  { name: '버섯', icon: '🍄', potColor: 'bg-riso-poppy', delay: '2s' },
]

const timeGreeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return { main: '좋은 아침이에요 🌅', sub: '오늘도 기록을 남겨볼까요?', skyGrad: 'bg-gradient-to-b from-riso-sky to-riso-peach' }
  if (hour < 18) return { main: '좋은 오후예요 ☀️', sub: '오늘 무엇을 하셨나요?', skyGrad: 'bg-gradient-to-b from-riso-sky to-riso-butter' }
  return { main: '편안한 저녁이에요 🌙', sub: '오늘 하루를 돌아봐요', skyGrad: 'bg-gradient-to-b from-riso-lavender to-riso-navy' }
})
</script>
