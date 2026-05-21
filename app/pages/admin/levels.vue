<template>
  <div class="py-6 space-y-5">
    <div>
      <NuxtLink to="/admin" class="text-xs text-riso-dark/40 hover:text-riso-dark">← Admin</NuxtLink>
      <h1 class="text-xl font-bold text-riso-dark mt-1">{{ $t('admin.levels.title') }}</h1>
    </div>

    <CommonLoading v-if="loading" />

    <div v-else class="space-y-2">
      <div
        v-for="row in rows"
        :key="row.level.level"
        class="bg-white rounded-2xl p-4 border border-riso-walnut/10 flex items-center gap-3"
      >
        <div class="w-10 h-10 rounded-full bg-riso-sage/15 flex items-center justify-center font-bold text-riso-sage shrink-0">
          {{ row.level.level }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm text-riso-dark">{{ $t('admin.levels.levelLabel', { n: row.level.level }) }}</p>
          <div class="flex gap-2 mt-1">
            <label class="flex-1 min-w-0">
              <span class="text-[10px] text-riso-dark/40 block">{{ $t('admin.levels.requiredExp') }}</span>
              <input
                v-model.number="row.form.requiredExp"
                type="number"
                min="0"
                class="w-full mt-0.5 bg-riso-cream/50 rounded px-2 py-1 text-sm font-bold text-riso-dark outline-none focus:bg-white"
              >
            </label>
            <label class="flex-1 min-w-0">
              <span class="text-[10px] text-riso-dark/40 block">{{ $t('admin.levels.maxSlots') }}</span>
              <input
                v-model.number="row.form.maxItems"
                type="number"
                min="0"
                class="w-full mt-0.5 bg-riso-cream/50 rounded px-2 py-1 text-sm font-bold text-riso-dark outline-none focus:bg-white"
              >
            </label>
          </div>
        </div>
        <button
          class="h-9 px-3 rounded-full bg-riso-sage text-white text-xs font-medium riso-shadow-sm active:scale-95 transition-transform disabled:opacity-40 shrink-0"
          :disabled="saving === row.level.level"
          @click="saveLevel(row.level.level)"
        >
          {{ saving === row.level.level ? $t('admin.common.saving') : $t('admin.common.save') }}
        </button>
      </div>

      <p v-if="rows.length === 0" class="text-center text-sm text-riso-dark/30 py-8">
        {{ $t('admin.levels.empty') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface LevelRow {
  level: number
  requiredExp: number
  maxSlots: number
}

interface LevelForm {
  requiredExp: number
  maxItems: number
}

definePageMeta({ layout: 'default', middleware: ['auth', 'admin'] })

const { sdk, client } = useOpenApi()
const { request } = useInternalApi()
const { t } = useI18n()
const toast = useToast()

interface LevelFormRow {
  level: LevelRow
  form: LevelForm
}

const loading = ref(true)
const saving = ref<number | null>(null)
const rows = ref<LevelFormRow[]>([])

async function loadLevels() {
  const { data, error } = await sdk.getLevels({ client })
  let levels: LevelRow[] = []
  if (!error && data) {
    levels = castData<{ levels: LevelRow[] }>(data)?.levels ?? []
  }
  rows.value = levels.map((level) => ({
    level,
    form: {
      requiredExp: level.requiredExp ?? 0,
      maxItems: level.maxSlots ?? 0,
    },
  }))
}

async function saveLevel(level: number) {
  const form = rows.value.find((r) => r.level.level === level)?.form
  if (!form) return
  // code-review CDX-005: server (AdminService) 는 maxItems >= 1 요구 — frontend 도 일치
  if (form.requiredExp < 0 || form.maxItems < 1) {
    toast.error(t('admin.common.negativeError'))
    return
  }
  saving.value = level
  try {
    await request(`/api/v1/admin/levels/${level}`, {
      method: 'PUT',
      body: {
        requiredExp: form.requiredExp,
        maxItems: form.maxItems,
      },
    })
    toast.success(t('admin.common.saveSuccess'))
    await loadLevels()
  }
  catch {
    toast.error(t('admin.common.saveError'))
  }
  finally {
    saving.value = null
  }
}

onMounted(async () => {
  await loadLevels()
  loading.value = false
})
</script>
