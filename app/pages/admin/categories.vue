<template>
  <div class="py-6 space-y-5">
    <div>
      <NuxtLink to="/admin" class="text-xs text-riso-dark/40 hover:text-riso-dark">← Admin</NuxtLink>
      <h1 class="text-xl font-bold text-riso-dark mt-1">{{ $t('admin.categories.title') }}</h1>
    </div>

    <CommonLoading v-if="loading" />

    <div v-else class="space-y-3">
      <div
        v-for="row in rows"
        :key="row.cat.id"
        class="bg-white rounded-2xl p-4 border border-riso-walnut/10 space-y-3"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl" :style="{ backgroundColor: row.cat.color + '22' }">
            {{ row.cat.emoji ?? '🏷️' }}
          </div>
          <div class="flex-1">
            <p class="font-bold text-sm text-riso-dark">{{ row.cat.name }}</p>
            <p class="text-[10px] text-riso-dark/40">{{ $t('admin.categories.token') }}: {{ row.cat.tokenName }}</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <label class="bg-riso-cream/50 rounded-xl p-2.5 text-center block">
            <span class="text-[10px] text-riso-dark/40">{{ $t('admin.categories.coinReward') }}</span>
            <input
              v-model.number="row.form.baseCoinReward"
              type="number"
              min="0"
              class="w-full mt-1 bg-transparent text-center font-bold text-sm text-riso-dark outline-none focus:bg-white rounded"
            >
          </label>
          <label class="bg-riso-cream/50 rounded-xl p-2.5 text-center block">
            <span class="text-[10px] text-riso-dark/40">{{ $t('admin.categories.tokenReward') }}</span>
            <input
              v-model.number="row.form.baseTokenReward"
              type="number"
              min="0"
              class="w-full mt-1 bg-transparent text-center font-bold text-sm text-riso-dark outline-none focus:bg-white rounded"
            >
          </label>
          <label class="bg-riso-cream/50 rounded-xl p-2.5 text-center block">
            <span class="text-[10px] text-riso-dark/40">{{ $t('admin.categories.dailyLimit') }}</span>
            <input
              v-model.number="row.form.dailyLimit"
              type="number"
              min="0"
              class="w-full mt-1 bg-transparent text-center font-bold text-sm text-riso-dark outline-none focus:bg-white rounded"
            >
          </label>
        </div>

        <button
          class="w-full h-9 rounded-full bg-riso-sage text-white text-xs font-medium riso-shadow-sm active:scale-95 transition-transform disabled:opacity-40"
          :disabled="saving === row.cat.id"
          @click="saveRewards(row.cat.id)"
        >
          {{ saving === row.cat.id ? $t('admin.common.saving') : $t('admin.common.save') }}
        </button>
      </div>

      <p v-if="rows.length === 0" class="text-center text-sm text-riso-dark/30 py-8">
        {{ $t('admin.categories.empty') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CategoryResponse } from '@terraworld-it/openapi-frontend'

interface RewardForm {
  baseCoinReward: number
  baseTokenReward: number
  dailyLimit: number
}

definePageMeta({ layout: 'default', middleware: ['auth', 'admin'] })

const { sdk, client } = useOpenApi()
const { request } = useInternalApi()
const { t } = useI18n()
const toast = useToast()

interface CategoryRow {
  cat: CategoryResponse
  form: RewardForm
}

const loading = ref(true)
const saving = ref<number | null>(null)
const rows = ref<CategoryRow[]>([])

async function loadCategories() {
  const { data, error } = await sdk.listCategories({ client })
  let categories: CategoryResponse[] = []
  if (!error && data) {
    categories = castData<import('@terraworld-it/openapi-frontend').CategoryListResponse>(data)?.categories ?? []
  }
  rows.value = categories.map((cat) => ({
    cat,
    form: {
      baseCoinReward: cat.baseCoinReward ?? 0,
      baseTokenReward: cat.baseTokenReward ?? 0,
      dailyLimit: cat.dailyLimit ?? 0,
    },
  }))
}

async function saveRewards(categoryId: number) {
  const form = rows.value.find((r) => r.cat.id === categoryId)?.form
  if (!form) return
  // code-review CDX-004: server (AdminService) 는 dailyLimit >= 1 요구 — frontend 도 일치
  if (form.baseCoinReward < 0 || form.baseTokenReward < 0 || form.dailyLimit < 1) {
    toast.error(t('admin.common.negativeError'))
    return
  }
  saving.value = categoryId
  try {
    await request(`/api/v1/admin/categories/${categoryId}/rewards`, {
      method: 'PUT',
      body: {
        baseCoinReward: form.baseCoinReward,
        baseTokenReward: form.baseTokenReward,
        dailyLimit: form.dailyLimit,
      },
    })
    toast.success(t('admin.common.saveSuccess'))
    await loadCategories()
  }
  catch {
    toast.error(t('admin.common.saveError'))
  }
  finally {
    saving.value = null
  }
}

onMounted(async () => {
  await loadCategories()
  loading.value = false
})
</script>
