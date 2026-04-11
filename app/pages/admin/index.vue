<template>
  <div class="py-6 space-y-6">
    <div class="space-y-1">
      <h1 class="text-xl font-bold text-riso-dark">Admin Dashboard</h1>
      <p class="text-sm text-riso-dark/50">아이템, 보상, 경제 관리</p>
    </div>

    <!-- Dashboard cards -->
    <div class="grid grid-cols-2 gap-3">
      <NuxtLink
        v-for="menu in menus"
        :key="menu.path"
        :to="menu.path"
        class="bg-white rounded-2xl p-5 border border-riso-walnut/10 riso-shadow-sm hover:-translate-y-0.5 transition-all active:scale-[0.98] space-y-3"
      >
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl" :style="{ backgroundColor: menu.bg }">
          {{ menu.icon }}
        </div>
        <div>
          <p class="font-bold text-sm text-riso-dark">{{ menu.label }}</p>
          <p class="text-[11px] text-riso-dark/40 mt-0.5">{{ menu.desc }}</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const menus = [
  { path: '/admin/items', icon: '🎨', label: '아이템 관리', desc: '스탬프 추가/수정/삭제', bg: '#E8A0BF22' },
  { path: '/admin/categories', icon: '📂', label: '카테고리', desc: '보상 설정 조정', bg: '#7B9E6B22' },
  { path: '/admin/exchange', icon: '💱', label: '교환 비율', desc: '토큰 교환 레이트', bg: '#A8D8EA22' },
  { path: '/admin/levels', icon: '📊', label: '레벨 설정', desc: 'EXP/보상 테이블', bg: '#F4E4BA44' },
]
</script>
