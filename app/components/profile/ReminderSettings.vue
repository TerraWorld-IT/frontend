<template>
  <div v-if="mounted && supported" class="apjek-card w-full relative" data-testid="daily-reminder-settings">
    <div class="p-[21px] flex flex-col gap-[16px]">
      <h2 class="font-bold text-[18px] text-apjek-text">{{ t('dailyReminder.title') }}</h2>
      <label class="flex items-center justify-between p-[13px] bg-apjek-surface border border-apjek-border rounded-[12px]">
        <span class="text-[14px] font-semibold text-apjek-text">{{ t('dailyReminder.title') }}</span>
        <input type="checkbox" :checked="state.enabled" :disabled="busy" class="w-5 h-5 accent-riso-sage" @change="toggle">
      </label>
      <label class="flex items-center justify-between p-[13px] bg-apjek-surface border border-apjek-border rounded-[12px]">
        <span class="text-[14px] text-apjek-text">{{ t('dailyReminder.time') }}</span>
        <input :key="inputRevision" type="time" :value="state.time" :disabled="busy" required :aria-label="t('dailyReminder.time')" class="text-apjek-text bg-apjek-surface" @change="changeTime">
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ userId: string | null }>()
const { t } = useI18n()
const { state, supported, busy, update } = useDailyReminder(() => props.userId)
const mounted = ref<boolean>(false)
const inputRevision = ref<number>(0)
onMounted(() => { mounted.value = true })

async function toggle(event: Event) {
  const input = event.target as HTMLInputElement
  await update(input.checked)
  input.checked = state.value.enabled
}

async function changeTime(event: Event) {
  await update(state.value.enabled, (event.target as HTMLInputElement).value)
  inputRevision.value++
}
</script>
