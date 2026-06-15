<!--
  Section — 메모지/배경 프리미엄 테마 갤러리.
  /profile 에 임베드. 프리미엄 테마는 entitlements.premiumThemes 로 해금.
  선택값은 useThemeSelection() 로 localStorage persist.
-->
<template>
  <section class="bg-riso-cream rounded-xl p-4 riso-shadow">
    <div class="flex items-center justify-between mb-1">
      <h3 class="font-bold flex items-center gap-2 text-riso-dark">
        <Icon name="lucide:palette" class="w-5 h-5" />
        {{ $t('theme.title') }}
      </h3>
      <span v-if="!unlocked" class="text-xs text-riso-dark/50 flex items-center gap-1">
        <Icon name="lucide:lock" class="w-3.5 h-3.5" aria-hidden="true" />
        {{ $t('theme.locked') }}
      </span>
    </div>
    <p class="text-xs text-riso-dark/50 mb-3">{{ $t('theme.subtitle') }}</p>

    <ul class="grid grid-cols-2 gap-3" role="radiogroup" :aria-label="$t('theme.title')">
      <li v-for="theme in THEME_OPTIONS" :key="theme.id">
        <button
          type="button"
          role="radio"
          :aria-checked="theme.id === selectedThemeId"
          :disabled="theme.premium && !unlocked"
          :class="[
            'relative w-full rounded-[12px] border p-3 text-left transition-all',
            theme.id === selectedThemeId
              ? 'border-riso-sage riso-shadow-sm bg-white'
              : 'border-black/10 bg-white/60 hover:bg-white',
            theme.premium && !unlocked ? 'opacity-60 cursor-not-allowed' : '',
          ]"
          @click="onSelect(theme)"
        >
          <!-- Swatch -->
          <div class="flex gap-1 mb-2">
            <span
              v-for="(color, i) in theme.swatch"
              :key="i"
              class="h-6 flex-1 rounded-[6px] border border-black/5"
              :style="{ backgroundColor: color }"
              aria-hidden="true"
            />
          </div>

          <div class="flex items-center justify-between gap-1">
            <span class="text-sm font-medium text-riso-dark truncate">
              {{ $t(`theme.name.${theme.nameKey}`) }}
            </span>

            <Icon
              v-if="theme.id === selectedThemeId"
              name="lucide:check"
              class="w-4 h-4 text-riso-sage shrink-0"
              :aria-label="$t('theme.applied')"
            />
            <Icon
              v-else-if="theme.premium && !unlocked"
              name="lucide:lock"
              class="w-4 h-4 text-riso-dark/40 shrink-0"
              aria-hidden="true"
            />
          </div>
        </button>
      </li>
    </ul>

    <p v-if="!unlocked" class="mt-3 text-xs text-riso-dark/50">
      {{ $t('theme.unlockHint') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { THEME_OPTIONS, type ThemeOption } from '~/composables/useThemeSelection'

const props = defineProps<{
  /** entitlements.premiumThemes — 프리미엄 테마 해금 여부 */
  premiumUnlocked?: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const { selectedThemeId, selectTheme, loadPersisted } = useThemeSelection(() => Boolean(props.premiumUnlocked))

const unlocked = computed<boolean>(() => Boolean(props.premiumUnlocked))

function onSelect(theme: ThemeOption) {
  if (theme.id === selectedThemeId.value) return
  if (theme.premium && !unlocked.value) {
    toast.info(t('theme.lockedToast'))
    return
  }
  selectTheme(theme.id)
  toast.success(t('theme.appliedToast', { name: t(`theme.name.${theme.nameKey}`) }))
}

onMounted(loadPersisted)
</script>
