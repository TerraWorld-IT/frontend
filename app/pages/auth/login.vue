<template>
  <div class="min-h-screen bg-riso-cream relative overflow-hidden">
    <!-- Layout Selector (sticky top) -->
    <CommonLayoutSelector />

    <!-- ========== 1. JAR: Glass jar with login form inside ========== -->
    <div v-if="is('jar')" class="min-h-screen flex items-center justify-center px-4 py-20">
      <!-- Floating plant decorations -->
      <div class="absolute top-16 left-6 text-4xl animate-sway opacity-60">
        <svg viewBox="0 0 32 32" class="w-10 h-10"><text y="26" font-size="26">&#x1F33F;</text></svg>
      </div>
      <div class="absolute top-24 right-8 text-3xl animate-float opacity-50">
        <svg viewBox="0 0 32 32" class="w-8 h-8"><text y="26" font-size="26">&#x1F343;</text></svg>
      </div>
      <div class="absolute bottom-20 left-10 text-2xl animate-drift opacity-40">
        <svg viewBox="0 0 32 32" class="w-7 h-7"><text y="26" font-size="26">&#x1F331;</text></svg>
      </div>
      <div class="absolute bottom-32 right-12 text-3xl animate-sway opacity-50">
        <svg viewBox="0 0 32 32" class="w-8 h-8"><text y="26" font-size="26">&#x1F340;</text></svg>
      </div>

      <!-- Glass jar container -->
      <div class="relative w-full max-w-sm">
        <!-- Jar lid -->
        <div class="mx-auto w-32 h-5 bg-riso-walnut/30 rounded-t-lg border-2 border-riso-walnut/20" />
        <div class="mx-auto w-40 h-3 bg-riso-walnut/20 rounded-b-sm -mt-px" />

        <!-- Jar body -->
        <div
          class="relative mx-auto w-full bg-white/30 backdrop-blur-md border-2 border-white/50
                 rounded-[2rem] rounded-t-[1rem] px-8 pt-10 pb-10 riso-shadow"
          style="background: linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.2) 100%);"
        >
          <!-- Glass refraction highlights -->
          <div class="absolute top-6 left-6 w-16 h-2 bg-white/60 rounded-full rotate-[-20deg]" />
          <div class="absolute top-12 left-4 w-8 h-1.5 bg-white/40 rounded-full rotate-[-20deg]" />

          <!-- Logo -->
          <div class="text-center mb-8">
            <div class="text-4xl mb-2">&#x1FABB;</div>
            <h1 class="text-xl font-bold text-riso-dark">TerraWorld</h1>
            <p class="text-xs text-riso-dark/40 mt-1">&#xC720;&#xB9AC;&#xBCD1; &#xC18D; &#xC791;&#xC740; &#xC138;&#xACC4;</p>
          </div>

          <!-- Form -->
          <div class="space-y-3">
            <input
              v-model="email"
              type="email"
              :placeholder="'\uC774\uBA54\uC77C'"
              class="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl
                     text-sm text-riso-dark placeholder-riso-dark/30
                     focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
            />
            <input
              v-model="password"
              type="password"
              :placeholder="'\uBE44\uBC00\uBC88\uD638'"
              class="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl
                     text-sm text-riso-dark placeholder-riso-dark/30
                     focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
            />
            <button
              class="w-full py-3.5 bg-riso-sage text-white rounded-xl font-bold text-sm
                     hover:bg-riso-sage/90 active:scale-[0.98] transition-all riso-shadow-sm"
            >
              &#xB85C;&#xADF8;&#xC778;
            </button>
          </div>

          <p class="text-center text-xs text-riso-dark/40 mt-5">
            &#xACC4;&#xC815;&#xC774; &#xC5C6;&#xC2E0;&#xAC00;&#xC694;?
            <NuxtLink to="/auth/signup" class="text-riso-sage font-medium hover:underline">&#xD68C;&#xC6D0;&#xAC00;&#xC785;</NuxtLink>
          </p>

          <!-- Mini plants inside jar -->
          <div class="absolute bottom-3 left-5 text-lg opacity-60">&#x1F331;</div>
          <div class="absolute bottom-4 right-6 text-base opacity-50">&#x1F33F;</div>
        </div>
      </div>
    </div>

    <!-- ========== 2. POSTCARD: Letter/postcard login form ========== -->
    <div v-if="is('postcard')" class="min-h-screen flex items-center justify-center px-4 py-20">
      <!-- Subtle background texture -->
      <div class="absolute inset-0 riso-grain opacity-30" />

      <!-- Scattered stamps decoration -->
      <div class="absolute top-20 right-10 w-14 h-14 bg-riso-pink/20 border-2 border-dashed border-riso-pink/40 rounded-sm rotate-12 flex items-center justify-center text-lg">
        &#x1F33F;
      </div>
      <div class="absolute bottom-28 left-8 w-12 h-12 bg-riso-sage/20 border-2 border-dashed border-riso-sage/40 rounded-sm -rotate-6 flex items-center justify-center text-sm">
        &#x1F331;
      </div>

      <!-- Postcard -->
      <div
        class="relative w-full max-w-md bg-riso-cream border-2 border-riso-walnut/20 rounded-lg
               px-8 py-10 riso-shadow rotate-[-1deg] hover:rotate-0 transition-transform duration-500"
      >
        <!-- Postcard grain -->
        <div class="absolute inset-0 riso-grain opacity-20 rounded-lg" />

        <!-- Stamp in top-right -->
        <div class="absolute -top-3 -right-3 w-20 h-24 bg-riso-poppy/15 border-[3px] border-riso-poppy/30 rounded-sm flex flex-col items-center justify-center rotate-3 z-10">
          <div class="text-2xl">&#x1FABB;</div>
          <div class="text-[8px] text-riso-poppy font-bold mt-1 tracking-wider">TERRA</div>
          <div class="text-[6px] text-riso-poppy/60">WORLD</div>
          <div class="absolute inset-1 border border-dashed border-riso-poppy/20 rounded-sm" />
        </div>

        <!-- Postmark -->
        <div class="absolute top-4 right-20 w-16 h-16 border-2 border-riso-dark/10 rounded-full flex items-center justify-center rotate-[-15deg]">
          <span class="text-[8px] text-riso-dark/20 font-mono text-center leading-tight">2026<br />APR</span>
        </div>

        <!-- Content -->
        <div class="relative z-[1]">
          <!-- "To:" header -->
          <div class="mb-6">
            <p class="text-xs text-riso-walnut/50 font-mono mb-1">TO: My Garden</p>
            <h1 class="text-2xl font-bold text-riso-dark">TerraWorld</h1>
            <p class="text-xs text-riso-dark/40 mt-1 italic">&#xC624;&#xB298;&#xC758; &#xAE30;&#xB85D;&#xC744; &#xBCF4;&#xB0B4;&#xC8FC;&#xC138;&#xC694;</p>
          </div>

          <!-- Divider line -->
          <div class="border-b border-riso-walnut/15 mb-6" />

          <!-- Form -->
          <div class="space-y-3">
            <div>
              <label class="text-[10px] text-riso-walnut/50 font-mono uppercase tracking-wider">From</label>
              <input
                v-model="email"
                type="email"
                :placeholder="'\uC774\uBA54\uC77C \uC8FC\uC18C'"
                class="w-full px-4 py-3 bg-white/50 border border-riso-walnut/15 rounded-lg
                       text-sm text-riso-dark placeholder-riso-dark/25
                       focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
              />
            </div>
            <div>
              <label class="text-[10px] text-riso-walnut/50 font-mono uppercase tracking-wider">Secret</label>
              <input
                v-model="password"
                type="password"
                :placeholder="'\uBE44\uBC00\uBC88\uD638'"
                class="w-full px-4 py-3 bg-white/50 border border-riso-walnut/15 rounded-lg
                       text-sm text-riso-dark placeholder-riso-dark/25
                       focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
              />
            </div>
            <button
              class="w-full py-3.5 bg-riso-sage text-white rounded-lg font-bold text-sm
                     hover:bg-riso-sage/90 active:scale-[0.98] transition-all riso-shadow-sm"
            >
              &#xC5FD;&#xC11C; &#xBCF4;&#xB0B4;&#xAE30;
            </button>
          </div>

          <p class="text-center text-xs text-riso-dark/40 mt-5">
            &#xCC98;&#xC74C; &#xC624;&#xC168;&#xB098;&#xC694;?
            <NuxtLink to="/auth/signup" class="text-riso-sage font-medium hover:underline">&#xD68C;&#xC6D0;&#xAC00;&#xC785;</NuxtLink>
          </p>
        </div>
      </div>
    </div>

    <!-- ========== 3. SHELF: Bulletin board / noticeboard ========== -->
    <div v-if="is('shelf')" class="min-h-screen flex items-center justify-center px-4 py-20">
      <!-- Warm walnut background -->
      <div class="absolute inset-0 bg-gradient-to-b from-riso-walnut/15 to-riso-walnut/5" />
      <div class="absolute inset-0 riso-grain opacity-40" />

      <!-- Cork board -->
      <div class="relative w-full max-w-md">
        <!-- Board frame -->
        <div class="absolute -inset-3 bg-riso-walnut/30 rounded-xl" />
        <div class="absolute -inset-2 bg-riso-walnut/20 rounded-lg" />

        <!-- Board surface -->
        <div class="relative bg-riso-butter/60 rounded-lg px-8 py-10 riso-shadow">
          <!-- Push pin decorations -->
          <div class="absolute -top-2 left-1/4 w-5 h-5 bg-riso-poppy rounded-full border-2 border-riso-poppy/80 riso-shadow-sm" />
          <div class="absolute -top-2 right-1/4 w-5 h-5 bg-riso-sage rounded-full border-2 border-riso-sage/80 riso-shadow-sm" />

          <!-- Pinned note: logo -->
          <div class="bg-white rounded-lg p-4 mb-6 rotate-[1deg] riso-shadow-sm border border-riso-walnut/10">
            <div class="text-center">
              <div class="text-3xl mb-1">&#x1F331;</div>
              <h1 class="text-xl font-bold text-riso-dark">TerraWorld</h1>
              <p class="text-[10px] text-riso-dark/40 mt-0.5">&#xB098;&#xB9CC;&#xC758; &#xC544;&#xB291;&#xD55C; &#xACF5;&#xAC04;</p>
            </div>
          </div>

          <!-- Pinned note: login form -->
          <div class="bg-white rounded-lg p-6 rotate-[-0.5deg] riso-shadow-sm border border-riso-walnut/10">
            <div class="space-y-3">
              <input
                v-model="email"
                type="email"
                :placeholder="'\uC774\uBA54\uC77C'"
                class="w-full px-4 py-3 bg-riso-cream/50 border border-riso-walnut/15 rounded-lg
                       text-sm text-riso-dark placeholder-riso-dark/30
                       focus:outline-none focus:border-riso-walnut focus:ring-2 focus:ring-riso-walnut/20 transition"
              />
              <input
                v-model="password"
                type="password"
                :placeholder="'\uBE44\uBC00\uBC88\uD638'"
                class="w-full px-4 py-3 bg-riso-cream/50 border border-riso-walnut/15 rounded-lg
                       text-sm text-riso-dark placeholder-riso-dark/30
                       focus:outline-none focus:border-riso-walnut focus:ring-2 focus:ring-riso-walnut/20 transition"
              />
              <button
                class="w-full py-3.5 bg-riso-walnut text-white rounded-lg font-bold text-sm
                       hover:bg-riso-walnut/90 active:scale-[0.98] transition-all riso-shadow-sm"
              >
                &#xB85C;&#xADF8;&#xC778;
              </button>
            </div>

            <p class="text-center text-xs text-riso-dark/40 mt-4">
              &#xACC4;&#xC815;&#xC774; &#xC5C6;&#xC2E0;&#xAC00;&#xC694;?
              <NuxtLink to="/auth/signup" class="text-riso-walnut font-medium hover:underline">&#xD68C;&#xC6D0;&#xAC00;&#xC785;</NuxtLink>
            </p>
          </div>

          <!-- Small decorative pinned items -->
          <div class="absolute bottom-4 right-4 bg-riso-pink/20 text-xs px-2 py-1 rounded rotate-3 text-riso-pink/60 font-mono">
            &#x1F4DA; read more
          </div>
          <div class="absolute bottom-8 left-4 text-2xl opacity-40 rotate-[-8deg]">&#x1F342;</div>
        </div>
      </div>
    </div>

    <!-- ========== 4. WINDOW: Looking through window to garden ========== -->
    <div v-if="is('window')" class="min-h-screen flex items-center justify-center px-4 py-20">
      <!-- Sky gradient background -->
      <div class="absolute inset-0 bg-gradient-to-b from-riso-sky/30 via-riso-sky/10 to-riso-cream" />

      <!-- Clouds -->
      <div class="absolute top-20 left-[10%] w-24 h-8 bg-white/60 rounded-full animate-drift" />
      <div class="absolute top-28 left-[25%] w-16 h-6 bg-white/40 rounded-full animate-drift" style="animation-delay: -3s;" />
      <div class="absolute top-16 right-[15%] w-20 h-7 bg-white/50 rounded-full animate-drift" style="animation-delay: -7s;" />

      <!-- Window frame -->
      <div class="relative w-full max-w-md">
        <!-- Outer frame -->
        <div class="bg-white border-4 border-riso-earth/30 rounded-2xl p-2 riso-shadow">
          <!-- Inner frame with cross bar -->
          <div class="relative bg-gradient-to-b from-riso-sky/20 to-riso-sage/10 rounded-xl overflow-hidden">
            <!-- Window cross bars -->
            <div class="absolute top-1/2 left-0 right-0 h-1 bg-white/80 -translate-y-1/2 z-10" />
            <div class="absolute top-0 bottom-0 left-1/2 w-1 bg-white/80 -translate-x-1/2 z-10" />

            <!-- Garden scene behind window -->
            <div class="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-riso-sage/20 to-transparent" />
            <div class="absolute bottom-2 left-6 text-3xl">&#x1F331;</div>
            <div class="absolute bottom-4 right-8 text-2xl animate-sway">&#x1F33F;</div>
            <div class="absolute bottom-1 left-1/2 text-xl">&#x1F338;</div>

            <!-- Form overlay -->
            <div class="relative z-20 px-8 py-10">
              <div class="bg-white/85 backdrop-blur-sm rounded-2xl p-7 riso-shadow-sm border border-white/50">
                <div class="text-center mb-6">
                  <div class="text-3xl mb-2">&#x1FABB;</div>
                  <h1 class="text-xl font-bold text-riso-dark">TerraWorld</h1>
                  <p class="text-xs text-riso-dark/40 mt-1">&#xCC3D;&#xB108;&#xBA38;&#xC758; &#xC815;&#xC6D0;&#xC73C;&#xB85C;</p>
                </div>

                <div class="space-y-3">
                  <input
                    v-model="email"
                    type="email"
                    :placeholder="'\uC774\uBA54\uC77C'"
                    class="w-full px-4 py-3 bg-white/70 border border-riso-sky/30 rounded-xl
                           text-sm text-riso-dark placeholder-riso-dark/30
                           focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
                  />
                  <input
                    v-model="password"
                    type="password"
                    :placeholder="'\uBE44\uBC00\uBC88\uD638'"
                    class="w-full px-4 py-3 bg-white/70 border border-riso-sky/30 rounded-xl
                           text-sm text-riso-dark placeholder-riso-dark/30
                           focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
                  />
                  <button
                    class="w-full py-3.5 bg-riso-sage text-white rounded-xl font-bold text-sm
                           hover:bg-riso-sage/90 active:scale-[0.98] transition-all riso-shadow-sm"
                  >
                    &#xB85C;&#xADF8;&#xC778;
                  </button>
                </div>

                <p class="text-center text-xs text-riso-dark/40 mt-5">
                  &#xACC4;&#xC815;&#xC774; &#xC5C6;&#xC2E0;&#xAC00;&#xC694;?
                  <NuxtLink to="/auth/signup" class="text-riso-sage font-medium hover:underline">&#xD68C;&#xC6D0;&#xAC00;&#xC785;</NuxtLink>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Windowsill ledge -->
        <div class="h-4 bg-white border-x-4 border-b-4 border-riso-earth/30 rounded-b-lg -mt-1" />
      </div>
    </div>

    <!-- ========== 5. GARDEN: Garden gate entrance ========== -->
    <div v-if="is('garden')" class="min-h-screen flex flex-col items-center justify-center px-4 py-20">
      <!-- Green gradient background -->
      <div class="absolute inset-0 bg-gradient-to-b from-riso-sage/10 via-riso-cream to-riso-forest/5" />

      <!-- Path decoration -->
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-64 opacity-20">
        <div class="w-full h-full bg-gradient-to-t from-riso-earth/40 to-transparent" style="clip-path: polygon(35% 100%, 65% 100%, 55% 0%, 45% 0%);" />
      </div>

      <!-- Side greenery -->
      <div class="absolute bottom-16 left-4 text-5xl opacity-40 animate-sway">&#x1F33F;</div>
      <div class="absolute bottom-20 right-6 text-4xl opacity-35 animate-sway" style="animation-delay: -2s;">&#x1F343;</div>
      <div class="absolute bottom-8 left-16 text-3xl opacity-30">&#x1F338;</div>
      <div class="absolute bottom-12 right-16 text-2xl opacity-35">&#x1F33C;</div>

      <!-- Gate archway -->
      <div class="relative w-full max-w-sm z-10">
        <!-- Arch top -->
        <div class="mx-auto w-64 h-32 border-t-4 border-l-4 border-r-4 border-riso-forest/30 rounded-t-full flex items-end justify-center pb-2">
          <div class="flex items-center gap-2 text-riso-forest/50">
            <div class="w-8 h-px bg-riso-forest/20" />
            <span class="text-xs font-mono tracking-widest">ENTER</span>
            <div class="w-8 h-px bg-riso-forest/20" />
          </div>
        </div>

        <!-- Gate posts + form -->
        <div class="border-l-4 border-r-4 border-riso-forest/30 px-6 pb-8 pt-2">
          <!-- Garden plaque -->
          <div class="bg-white/80 backdrop-blur-sm border-2 border-riso-sage/20 rounded-2xl p-7 riso-shadow">
            <div class="text-center mb-6">
              <div class="text-3xl mb-2">&#x1F333;</div>
              <h1 class="text-xl font-bold text-riso-forest">TerraWorld</h1>
              <p class="text-xs text-riso-dark/40 mt-1">&#xB2F9;&#xC2E0;&#xC758; &#xC815;&#xC6D0;&#xC5D0; &#xB4E4;&#xC5B4;&#xC624;&#xC138;&#xC694;</p>
            </div>

            <div class="space-y-3">
              <input
                v-model="email"
                type="email"
                :placeholder="'\uC774\uBA54\uC77C'"
                class="w-full px-4 py-3 bg-white/60 border border-riso-sage/20 rounded-xl
                       text-sm text-riso-dark placeholder-riso-dark/30
                       focus:outline-none focus:border-riso-forest focus:ring-2 focus:ring-riso-forest/20 transition"
              />
              <input
                v-model="password"
                type="password"
                :placeholder="'\uBE44\uBC00\uBC88\uD638'"
                class="w-full px-4 py-3 bg-white/60 border border-riso-sage/20 rounded-xl
                       text-sm text-riso-dark placeholder-riso-dark/30
                       focus:outline-none focus:border-riso-forest focus:ring-2 focus:ring-riso-forest/20 transition"
              />
              <button
                class="w-full py-3.5 bg-riso-forest text-white rounded-xl font-bold text-sm
                       hover:bg-riso-forest/90 active:scale-[0.98] transition-all riso-shadow-sm"
              >
                &#xC815;&#xC6D0;&#xC5D0; &#xB4E4;&#xC5B4;&#xAC00;&#xAE30;
              </button>
            </div>

            <p class="text-center text-xs text-riso-dark/40 mt-5">
              &#xCC98;&#xC74C; &#xC624;&#xC168;&#xB098;&#xC694;?
              <NuxtLink to="/auth/signup" class="text-riso-forest font-medium hover:underline">&#xD68C;&#xC6D0;&#xAC00;&#xC785;</NuxtLink>
            </p>
          </div>
        </div>

        <!-- Gate bottom line -->
        <div class="flex justify-between -mt-1">
          <div class="w-4 h-8 bg-riso-forest/20 rounded-b" />
          <div class="w-4 h-8 bg-riso-forest/20 rounded-b" />
        </div>
      </div>
    </div>

    <!-- ========== 6. STORYBOOK: Book cover opening ========== -->
    <div v-if="is('storybook')" class="min-h-screen flex items-center justify-center px-4 py-20">
      <!-- Warm parchment background -->
      <div class="absolute inset-0 bg-gradient-to-br from-riso-butter/40 to-riso-peach/20" />
      <div class="absolute inset-0 riso-grain opacity-30" />

      <!-- Book -->
      <div class="relative w-full max-w-md">
        <!-- Book spine shadow -->
        <div class="absolute -left-2 top-4 bottom-4 w-4 bg-riso-walnut/20 rounded-l-sm" />

        <!-- Book cover -->
        <div class="relative bg-riso-cream border-2 border-riso-walnut/25 rounded-r-xl rounded-l-sm px-8 py-10 riso-shadow ml-2">
          <!-- Page edge lines -->
          <div class="absolute right-0 top-6 bottom-6 w-1 flex flex-col gap-px">
            <div v-for="n in 20" :key="n" class="flex-1 bg-riso-walnut/8 rounded-full" />
          </div>

          <!-- Chapter heading -->
          <div class="text-center mb-8">
            <p class="text-[10px] text-riso-walnut/40 font-mono uppercase tracking-[0.3em] mb-3">Chapter 1</p>
            <div class="flex items-center justify-center gap-3 mb-3">
              <div class="w-12 h-px bg-riso-walnut/20" />
              <div class="text-2xl">&#x1F4D6;</div>
              <div class="w-12 h-px bg-riso-walnut/20" />
            </div>
            <h1 class="text-2xl font-bold text-riso-dark font-serif">TerraWorld</h1>
            <p class="text-xs text-riso-dark/40 mt-2 italic">&#xB2F9;&#xC2E0;&#xC758; &#xC774;&#xC57C;&#xAE30;&#xB97C; &#xC2DC;&#xC791;&#xD558;&#xC138;&#xC694;</p>
          </div>

          <!-- Decorative divider -->
          <div class="flex items-center justify-center gap-2 mb-6">
            <div class="w-16 h-px bg-riso-walnut/15" />
            <div class="text-riso-walnut/30 text-xs">&#x273D;</div>
            <div class="w-16 h-px bg-riso-walnut/15" />
          </div>

          <!-- Form as "fill in the story" -->
          <div class="space-y-4">
            <div>
              <p class="text-xs text-riso-walnut/50 mb-1.5 italic">&#xC5B4;&#xB290; &#xB0A0;, &#xD55C; &#xC0AC;&#xB78C;&#xC774; &#xBB38;&#xC744; &#xC5F4;&#xC5C8;&#xC2B5;&#xB2C8;&#xB2E4;...</p>
              <input
                v-model="email"
                type="email"
                :placeholder="'\uC774\uBA54\uC77C \uC8FC\uC18C'"
                class="w-full px-4 py-3 bg-white/50 border border-riso-walnut/15 rounded-lg
                       text-sm text-riso-dark placeholder-riso-dark/25 font-serif
                       focus:outline-none focus:border-riso-walnut/40 focus:ring-2 focus:ring-riso-walnut/10 transition"
              />
            </div>
            <div>
              <p class="text-xs text-riso-walnut/50 mb-1.5 italic">&#xBE44;&#xBC00;&#xC758; &#xC5F4;&#xC1E0;&#xB97C; &#xC18D;&#xC0AD;&#xC774;&#xBA70;...</p>
              <input
                v-model="password"
                type="password"
                :placeholder="'\uBE44\uBC00\uBC88\uD638'"
                class="w-full px-4 py-3 bg-white/50 border border-riso-walnut/15 rounded-lg
                       text-sm text-riso-dark placeholder-riso-dark/25 font-serif
                       focus:outline-none focus:border-riso-walnut/40 focus:ring-2 focus:ring-riso-walnut/10 transition"
              />
            </div>
            <button
              class="w-full py-3.5 bg-riso-walnut text-white rounded-lg font-bold text-sm
                     hover:bg-riso-walnut/90 active:scale-[0.98] transition-all riso-shadow-sm"
            >
              &#xC774;&#xC57C;&#xAE30; &#xC2DC;&#xC791;&#xD558;&#xAE30;
            </button>
          </div>

          <p class="text-center text-xs text-riso-dark/40 mt-6">
            &#xC0C8;&#xB85C;&#xC6B4; &#xC774;&#xC57C;&#xAE30;&#xB97C; &#xC4F0;&#xACE0; &#xC2F6;&#xB2E4;&#xBA74;?
            <NuxtLink to="/auth/signup" class="text-riso-walnut font-medium hover:underline">&#xD68C;&#xC6D0;&#xAC00;&#xC785;</NuxtLink>
          </p>

          <!-- Page number -->
          <div class="text-center mt-6">
            <span class="text-[10px] text-riso-walnut/25 font-mono">- 1 -</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 7. WINDOWSILL: Clean minimal with plant ========== -->
    <div v-if="is('windowsill')" class="min-h-screen flex items-center justify-center px-4 py-20">
      <!-- Time-based background -->
      <div
        class="absolute inset-0 transition-colors duration-1000"
        :class="isDaytime ? 'bg-gradient-to-b from-riso-sky/15 via-riso-cream to-riso-cream' : 'bg-gradient-to-b from-riso-navy/20 via-riso-navy/5 to-riso-cream'"
      />

      <!-- Stars at night -->
      <template v-if="!isDaytime">
        <div class="absolute top-20 left-[20%] w-1 h-1 bg-riso-butter rounded-full animate-float" />
        <div class="absolute top-16 right-[25%] w-1.5 h-1.5 bg-riso-butter/80 rounded-full animate-float" style="animation-delay: -2s;" />
        <div class="absolute top-28 left-[40%] w-1 h-1 bg-riso-butter/60 rounded-full animate-float" style="animation-delay: -4s;" />
        <div class="absolute top-24 right-[35%] w-0.5 h-0.5 bg-riso-butter rounded-full animate-float" style="animation-delay: -1s;" />
      </template>

      <div class="relative w-full max-w-sm z-10">
        <!-- Sill / shelf surface -->
        <div class="relative">
          <!-- Potted plant decoration -->
          <div class="absolute -top-16 -left-2 z-20">
            <div class="text-4xl animate-sway">&#x1F331;</div>
            <div class="w-8 h-5 bg-riso-terracotta/60 rounded-b-lg rounded-t-sm mx-auto -mt-1" />
          </div>

          <!-- Small plant on right -->
          <div class="absolute -top-10 -right-1 z-20">
            <div class="text-2xl animate-sway" style="animation-delay: -1.5s;">&#x1F33F;</div>
            <div class="w-5 h-4 bg-riso-terracotta/40 rounded-b-md rounded-t-sm mx-auto -mt-0.5" />
          </div>

          <!-- Form card -->
          <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-8 riso-shadow border border-riso-dark/5">
            <div class="text-center mb-7">
              <h1 class="text-xl font-bold text-riso-dark">TerraWorld</h1>
              <p class="text-xs mt-1.5" :class="isDaytime ? 'text-riso-dark/40' : 'text-riso-lavender/70'">
                {{ isDaytime ? '\uD654\uCC3D\uD55C \uD558\uB8E8\uB97C \uC2DC\uC791\uD558\uC138\uC694' : '\uACE0\uC694\uD55C \uBC24, \uC624\uB298\uC758 \uAE30\uB85D\uC744' }}
              </p>
            </div>

            <div class="space-y-3">
              <input
                v-model="email"
                type="email"
                :placeholder="'\uC774\uBA54\uC77C'"
                class="w-full px-4 py-3 bg-riso-cream/50 border border-riso-dark/8 rounded-xl
                       text-sm text-riso-dark placeholder-riso-dark/25
                       focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
              />
              <input
                v-model="password"
                type="password"
                :placeholder="'\uBE44\uBC00\uBC88\uD638'"
                class="w-full px-4 py-3 bg-riso-cream/50 border border-riso-dark/8 rounded-xl
                       text-sm text-riso-dark placeholder-riso-dark/25
                       focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
              />
              <button
                class="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] riso-shadow-sm"
                :class="isDaytime ? 'bg-riso-sage text-white hover:bg-riso-sage/90' : 'bg-riso-navy text-white hover:bg-riso-navy/90'"
              >
                &#xB85C;&#xADF8;&#xC778;
              </button>
            </div>

            <p class="text-center text-xs text-riso-dark/40 mt-5">
              &#xACC4;&#xC815;&#xC774; &#xC5C6;&#xC2E0;&#xAC00;&#xC694;?
              <NuxtLink to="/auth/signup" class="font-medium hover:underline" :class="isDaytime ? 'text-riso-sage' : 'text-riso-lavender'">&#xD68C;&#xC6D0;&#xAC00;&#xC785;</NuxtLink>
            </p>
          </div>

          <!-- Shelf surface -->
          <div class="h-3 bg-riso-walnut/20 rounded-b-lg -mx-1 riso-shadow-sm" />
        </div>
      </div>
    </div>

    <!-- ========== 8. BUBBLE: Floating bubbles ========== -->
    <div v-if="is('bubble')" class="min-h-screen flex items-center justify-center px-4 py-20">
      <!-- Gradient background -->
      <div class="absolute inset-0 bg-gradient-to-b from-riso-lavender/15 via-riso-cream to-riso-sky/10" />

      <!-- Floating decorative bubbles -->
      <div class="absolute top-20 left-[10%] w-12 h-12 rounded-full bg-riso-sage/10 border border-riso-sage/20 animate-float" />
      <div class="absolute top-32 right-[12%] w-8 h-8 rounded-full bg-riso-pink/10 border border-riso-pink/20 animate-float" style="animation-delay: -2s;" />
      <div class="absolute bottom-28 left-[15%] w-10 h-10 rounded-full bg-riso-lavender/10 border border-riso-lavender/20 animate-float" style="animation-delay: -4s;" />
      <div class="absolute top-48 left-[30%] w-6 h-6 rounded-full bg-riso-sky/15 border border-riso-sky/20 animate-drift" />
      <div class="absolute bottom-40 right-[20%] w-14 h-14 rounded-full bg-riso-peach/10 border border-riso-peach/20 animate-float" style="animation-delay: -6s;" />
      <div class="absolute top-24 left-[55%] w-5 h-5 rounded-full bg-riso-butter/20 border border-riso-butter/30 animate-drift" style="animation-delay: -3s;" />
      <div class="absolute bottom-20 left-[45%] w-7 h-7 rounded-full bg-riso-sage/8 border border-riso-sage/15 animate-float" style="animation-delay: -5s;" />

      <!-- Main bubble with form -->
      <div class="relative w-full max-w-sm z-10">
        <!-- Outer bubble glow -->
        <div class="absolute -inset-4 rounded-[3rem] bg-white/20 blur-xl" />

        <!-- Bubble container -->
        <div
          class="relative bg-white/40 backdrop-blur-md border-2 border-white/60 rounded-[2.5rem] px-8 py-10"
          style="box-shadow: inset 0 2px 20px rgba(255,255,255,0.5), 0 8px 32px rgba(0,0,0,0.06);"
        >
          <!-- Bubble highlight -->
          <div class="absolute top-5 left-8 w-20 h-3 bg-white/50 rounded-full rotate-[-15deg]" />
          <div class="absolute top-9 left-6 w-10 h-2 bg-white/30 rounded-full rotate-[-15deg]" />

          <!-- Logo -->
          <div class="text-center mb-7">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/60 border border-white/80 mb-3">
              <span class="text-2xl">&#x1F4A7;</span>
            </div>
            <h1 class="text-xl font-bold text-riso-dark">TerraWorld</h1>
            <p class="text-xs text-riso-dark/40 mt-1">&#xB465;&#xAE00;&#xB465;&#xAE00; &#xB5A0;&#xB2E4;&#xB2C8;&#xB294; &#xC138;&#xACC4;</p>
          </div>

          <!-- Form -->
          <div class="space-y-3">
            <input
              v-model="email"
              type="email"
              :placeholder="'\uC774\uBA54\uC77C'"
              class="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-white/70 rounded-2xl
                     text-sm text-riso-dark placeholder-riso-dark/30
                     focus:outline-none focus:border-riso-lavender focus:ring-2 focus:ring-riso-lavender/20 transition"
            />
            <input
              v-model="password"
              type="password"
              :placeholder="'\uBE44\uBC00\uBC88\uD638'"
              class="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-white/70 rounded-2xl
                     text-sm text-riso-dark placeholder-riso-dark/30
                     focus:outline-none focus:border-riso-lavender focus:ring-2 focus:ring-riso-lavender/20 transition"
            />
            <button
              class="w-full py-3.5 bg-riso-sage text-white rounded-2xl font-bold text-sm
                     hover:bg-riso-sage/90 active:scale-[0.98] transition-all"
              style="box-shadow: 0 4px 15px rgba(0,0,0,0.08);"
            >
              &#xB85C;&#xADF8;&#xC778;
            </button>
          </div>

          <p class="text-center text-xs text-riso-dark/40 mt-5">
            &#xACC4;&#xC815;&#xC774; &#xC5C6;&#xC2E0;&#xAC00;&#xC694;?
            <NuxtLink to="/auth/signup" class="text-riso-lavender font-medium hover:underline">&#xD68C;&#xC6D0;&#xAC00;&#xC785;</NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { is } = useLayoutVariant()

const email = ref('')
const password = ref('')

// Windowsill variant: day/night detection
const isDaytime = ref(true)
if (import.meta.client) {
  const hour = new Date().getHours()
  isDaytime.value = hour >= 6 && hour < 19
}
</script>
