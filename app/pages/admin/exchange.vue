<template>
  <div class="py-6 space-y-5">
    <div>
      <NuxtLink to="/admin" class="text-xs text-riso-dark/40 hover:text-riso-dark">← Admin</NuxtLink>
      <h1 class="text-xl font-bold text-riso-dark mt-1">{{ $t('admin.exchange.title') }}</h1>
    </div>

    <div class="bg-white rounded-2xl p-5 border border-riso-walnut/10 space-y-4">
      <h3 class="font-bold text-sm text-riso-dark">{{ $t('admin.exchange.editTitle') }}</h3>

      <label class="block space-y-1">
        <span class="text-[11px] text-riso-dark/50">{{ $t('admin.exchange.rateId') }}</span>
        <input
          v-model.number="form.rateId"
          type="number"
          min="1"
          class="w-full h-10 px-3 rounded-xl bg-riso-cream/50 text-sm text-riso-dark outline-none focus:bg-white border border-riso-walnut/10"
        >
      </label>

      <label class="block space-y-1">
        <span class="text-[11px] text-riso-dark/50">{{ $t('admin.exchange.rate') }}</span>
        <input
          v-model.number="form.rate"
          type="number"
          min="0"
          step="0.01"
          class="w-full h-10 px-3 rounded-xl bg-riso-cream/50 text-sm text-riso-dark outline-none focus:bg-white border border-riso-walnut/10"
        >
      </label>

      <label class="flex items-center justify-between py-1">
        <span class="text-sm text-riso-dark/60">{{ $t('admin.exchange.isActive') }}</span>
        <input
          v-model="form.isActive"
          type="checkbox"
          class="w-5 h-5 accent-riso-sage"
        >
      </label>

      <button
        class="w-full h-11 rounded-full bg-riso-sage text-white font-medium text-sm riso-shadow-sm active:scale-95 transition-transform disabled:opacity-40"
        :disabled="saving"
        @click="saveRate"
      >
        {{ saving ? $t('admin.common.saving') : $t('admin.common.save') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['auth', 'admin'] })

const { sdk, client } = useOpenApi()
const { t } = useI18n()
const toast = useToast()

const saving = ref(false)
const form = reactive({
  rateId: 1,
  rate: 2,
  isActive: true,
})

async function saveRate() {
  // code-review CDX-006: server (AdminService) 는 rate > 0 (유한값) 요구 — frontend 도 일치
  if (form.rate <= 0 || !Number.isFinite(form.rate)) {
    toast.error(t('admin.common.negativeError'))
    return
  }
  if (!form.rateId || form.rateId < 1) {
    toast.error(t('admin.exchange.rateIdError'))
    return
  }
  saving.value = true
  try {
    await sdk.updateExchangeRate({
      client,
      path: { rateId: form.rateId },
      body: {
        rate: form.rate,
        isActive: form.isActive,
      },
    })
    toast.success(t('admin.common.saveSuccess'))
  }
  catch {
    toast.error(t('admin.common.saveError'))
  }
  finally {
    saving.value = false
  }
}
</script>
