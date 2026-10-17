<template>
  <CommonModal
    :model-value="supported && modelValue"
    :title="t('dailyReminder.promptTitle')"
    :message="t('dailyReminder.promptDescription')"
    :confirm-text="t('dailyReminder.accept')"
    :cancel-text="t('dailyReminder.decline')"
    :busy="busy"
    @confirm="accept"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean; userId: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const { t } = useI18n()
const { supported, busy, update } = useDailyReminder(() => props.userId)

async function accept() {
  await update(true, '21:00')
  emit('update:modelValue', false)
}
</script>
