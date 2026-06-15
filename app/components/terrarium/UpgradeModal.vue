<!--
  Modal G — 테라리움 진화 단계 전환 모달.
  사용자가 잠금 해제된 단계 사이에서 자유롭게 전환 가능. CUSTOM 은 freePlacement entitlement 필요.
-->
<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      @click.self="close"
    >
      <div class="bg-riso-cream max-w-md w-[92%] rounded-xl p-6 riso-shadow">
        <h2 id="upgrade-modal-title" class="text-xl font-bold text-riso-dark mb-2">
          {{ $t('terrarium.evolutionTitle') }}
        </h2>
        <p class="text-sm text-riso-dark/70 mb-4">
          {{ $t('terrarium.evolutionCurrentStage') }}: <strong>{{ currentLabel }}</strong>
        </p>

        <ul class="space-y-2 mb-4">
          <li
            v-for="stage in stages"
            :key="stage.id"
            class="border border-riso-dark/10 rounded-lg p-3 flex items-center justify-between"
            :class="stage.id === current ? 'bg-riso-sage/10 border-riso-sage' : ''"
          >
            <div>
              <div class="font-semibold text-riso-dark flex items-center gap-2">
                {{ stage.meta.label }}
                <span v-if="stage.locked" class="text-xs text-riso-dark/50">🔒 Lv {{ stage.meta.unlockLevel }}+</span>
                <span v-else-if="stage.id === 'CUSTOM' && !entitled" class="text-xs text-riso-poppy">{{ $t('terrarium.paid') }}</span>
              </div>
              <div class="text-xs text-riso-dark/60">{{ stage.meta.description }}</div>
            </div>
            <button
              type="button"
              :disabled="stage.locked || stage.id === current || (stage.id === 'CUSTOM' && !entitled) || pending"
              class="text-sm px-3 py-1 rounded-md bg-riso-sage text-white disabled:bg-riso-dark/20 disabled:text-riso-dark/40"
              @click="select(stage.id)"
            >
              {{ stage.id === current ? $t('terrarium.currentStage') : $t('terrarium.selectStage') }}
            </button>
          </li>
        </ul>

        <div v-if="errorMsg" class="text-sm text-riso-poppy mb-2">{{ errorMsg }}</div>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 text-sm text-riso-dark/70 hover:text-riso-dark"
            @click="close"
          >
            {{ $t('common.close') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { EvolutionStage, type TerrariumResponse } from '@terraworld-it/openapi-frontend'
import { EVOLUTION_STAGE_META } from '~/composables/useEvolution'

const { t } = useI18n()

const props = defineProps<{
  open: boolean
  terrarium: TerrariumResponse | null
  entitledFreePlacement?: boolean
}>()

const emit = defineEmits<{
  close: []
  upgraded: [TerrariumResponse]
}>()

const { upgrade, loading: pending } = useEvolution()
const errorMsg = ref<string | null>(null)
const entitled = computed<boolean>(() => Boolean(props.entitledFreePlacement))

const allStageIds: EvolutionStage[] = [
  EvolutionStage.POT,
  EvolutionStage.BOTTLE,
  EvolutionStage.PALUDARIUM,
  EvolutionStage.WORLD,
  EvolutionStage.CUSTOM,
]

const current = computed<EvolutionStage>(() =>
  ((props.terrarium?.evolutionStage as EvolutionStage) ?? 'BOTTLE'),
)

const currentLabel = computed<string>(() => EVOLUTION_STAGE_META[current.value].label)

const stages = computed(() => {
  const unlocked = new Set((props.terrarium?.unlockedStages ?? []) as readonly EvolutionStage[])
  return allStageIds.map((id) => ({
    id,
    meta: EVOLUTION_STAGE_META[id],
    locked: !unlocked.has(id),
  }))
})

async function select(target: EvolutionStage) {
  errorMsg.value = null
  const result = await upgrade(target)
  if (result?.terrarium) {
    emit('upgraded', result.terrarium)
    close()
  } else {
    errorMsg.value = t('terrarium.evolutionError')
  }
}

function close() {
  errorMsg.value = null
  emit('close')
}
</script>
