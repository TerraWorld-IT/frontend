<template>
  <div class="py-6 space-y-6">
    <div class="space-y-1">
      <h1 class="text-xl font-bold text-riso-dark">Admin Dashboard</h1>
      <p class="text-sm text-riso-dark/50">{{ $t('admin.index.subtitle') }}</p>
    </div>

    <!-- Dashboard stats -->
    <div class="grid grid-cols-2 gap-3">
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
const toast = useToast()

const dashboardLoading = ref<boolean>(true)
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

onMounted(async () => {
  try {
    const { data } = await sdk.getAdminDashboard({ client })
    dashboard.value = castData<AdminDashboard>(data) ?? null
  }
  catch {
    toast.error(t('admin.index.loadError'))
  }
  finally {
    dashboardLoading.value = false
  }
})
</script>
