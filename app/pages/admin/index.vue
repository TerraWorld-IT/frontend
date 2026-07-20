<template>
  <div class="py-6 space-y-6">
    <div class="space-y-1">
      <h1 class="text-xl font-bold text-riso-dark">Admin Dashboard</h1>
      <p class="text-sm text-riso-dark/50">{{ $t('admin.index.subtitle') }}</p>
    </div>

    <!-- Dashboard stats: 실패를 "0건"으로 위장하지 않는다 (audit C4-6) — 배너 + 재시도로 구분 -->
    <div
      v-if="dashboardError"
      class="bg-white rounded-2xl p-4 border border-riso-poppy/30 riso-shadow-sm flex items-center justify-between gap-3"
    >
      <p class="text-sm text-riso-poppy">{{ $t('admin.index.loadError') }}</p>
      <button
        type="button"
        class="shrink-0 px-3 py-1.5 rounded-full bg-riso-sage text-white text-xs font-medium active:scale-95 transition-transform"
        @click="loadDashboard"
      >
        {{ $t('common.retry') }}
      </button>
    </div>
    <div v-else class="grid grid-cols-2 gap-3">
      <div
        v-for="stat in stats"
        :key="stat.key"
        class="bg-white rounded-2xl p-4 border border-riso-walnut/10 riso-shadow-sm space-y-1"
      >
        <p class="text-[11px] text-riso-dark/40">{{ stat.label }}</p>
        <p class="text-2xl font-bold text-riso-dark">
          <span v-if="dashboardLoading" class="text-riso-dark/20">—</span>
          <span v-else>{{ stat.value }}</span>
        </p>
      </div>
    </div>

    <!-- Menu cards -->
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
interface AdminDashboard {
  totalUsers: number
  totalItems: number
  totalCategories: number
  totalLevels: number
}

definePageMeta({ layout: 'default', middleware: ['auth', 'admin'] })

const { t } = useI18n()
const { sdk, client } = useOpenApi()

const dashboardLoading = ref<boolean>(true)
const dashboardError = ref<boolean>(false)
const dashboard = ref<AdminDashboard | null>(null)

const stats = computed(() => [
  { key: 'users', label: t('admin.index.totalUsers'), value: dashboard.value?.totalUsers ?? 0 },
  { key: 'items', label: t('admin.index.totalItems'), value: dashboard.value?.totalItems ?? 0 },
  { key: 'categories', label: t('admin.index.totalCategories'), value: dashboard.value?.totalCategories ?? 0 },
])

const menus = computed(() => [
  { path: '/admin/items', icon: '🎨', label: t('admin.index.items'), desc: t('admin.index.itemsDesc'), bg: '#E8A0BF22' },
  { path: '/admin/categories', icon: '📂', label: t('admin.index.categories'), desc: t('admin.index.categoriesDesc'), bg: '#7B9E6B22' },
  // H2 (code-review R1): 구 admin 환전 화면 제거 — 편집 대상(token_exchange_rates)이 실 환전(exchange_rates, 7화폐)과
  //   무관해 no-op(오도). 실 환전 비율/수수료/일일캡은 백엔드 exchange_rates SoT(V28 시드 관리).
])

async function loadDashboard() {
  dashboardLoading.value = true
  dashboardError.value = false
  try {
    // @hey-api client 는 서버 거부(4xx/5xx)를 throw 가 아닌 { error } 로 resolve — 미확인 시
    // 대시보드가 조용히 "0건" 으로 위장된다 (audit C4-6). 명시 체크로 catch 라우팅.
    const { data, error } = await sdk.getAdminDashboard({ client })
    if (error) throw error
    dashboard.value = castData<AdminDashboard>(data) ?? null
  }
  catch {
    dashboardError.value = true
  }
  finally {
    dashboardLoading.value = false
  }
}

onMounted(loadDashboard)
</script>
