<template>
  <span
    class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none"
    :class="cls"
    :aria-label="$t('rarity.ariaLabel', { rarity: label })"
  >
    <span class="text-[8px]">{{ icon }}</span>
    {{ label }}
  </span>
</template>

<script setup lang="ts">
/**
 * 아이템 카드·상점 UI 의 희귀도 배지. F-1 에서 추가한 rarity-* 토큰을 사용.
 * 0420 참고: 일반 = 회색 outline, 레어 = 파란색, 에픽 = 보라색.
 */
type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'common' | 'rare' | 'epic'

const props = defineProps<{ rarity: Rarity }>()

const normalized = computed(() => props.rarity.toUpperCase() as 'COMMON' | 'RARE' | 'EPIC')

const cls = computed(() => {
  switch (normalized.value) {
    case 'RARE':
      return 'bg-rarity-rare/12 text-rarity-rare border border-rarity-rare/25'
    case 'EPIC':
      return 'bg-rarity-epic/12 text-rarity-epic border border-rarity-epic/25'
    default:
      return 'bg-rarity-common/10 text-rarity-common border border-rarity-common/25'
  }
})

const { t } = useI18n()

const label = computed(() => {
  switch (normalized.value) {
    case 'RARE': return t('rarity.rare')
    case 'EPIC': return t('rarity.fantasy')
    default: return t('shop.common')
  }
})

const icon = computed(() => {
  switch (normalized.value) {
    case 'RARE': return '✦'
    case 'EPIC': return '✧'
    default: return '◌'
  }
})
</script>
