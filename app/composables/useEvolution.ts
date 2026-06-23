import type { EvolutionStage, TerrariumResponse, UpgradeTerrariumResponse } from '@terraworld-it/openapi-frontend'

export type { EvolutionStage }

// unlockLevel 은 백엔드 SoT (Terrarium.EvolutionStage, N4 수정 2026-05-21) 와 일치해야 한다.
// 잠금 판정 자체는 isUnlocked() 가 backend unlockedStages 로 하지만, UpgradeModal 의
// "🔒 Lv N+" 라벨이 이 값으로 표시되므로 불일치 시 라벨이 실 잠금과 어긋난다.
// P4-3 (i18n): label/description 은 i18n 키로 보관 — consumer(UpgradeModal)가 t() 로 해석(다국어).
export const EVOLUTION_STAGE_META: Record<EvolutionStage, { labelKey: string, descKey: string, unlockLevel: number }> = {
  POT: { labelKey: 'terrarium.evolution.POT.label', descKey: 'terrarium.evolution.POT.desc', unlockLevel: 1 },
  BOTTLE: { labelKey: 'terrarium.evolution.BOTTLE.label', descKey: 'terrarium.evolution.BOTTLE.desc', unlockLevel: 2 },
  PALUDARIUM: { labelKey: 'terrarium.evolution.PALUDARIUM.label', descKey: 'terrarium.evolution.PALUDARIUM.desc', unlockLevel: 5 },
  WORLD: { labelKey: 'terrarium.evolution.WORLD.label', descKey: 'terrarium.evolution.WORLD.desc', unlockLevel: 8 },
  CUSTOM: { labelKey: 'terrarium.evolution.CUSTOM.label', descKey: 'terrarium.evolution.CUSTOM.desc', unlockLevel: 10 },
}

/**
 * 테라리움 진화 단계 전환.
 * - upgrade(target): 잠금 해제된 단계만 허용. CUSTOM 은 freePlacement entitlement 필수.
 */
export function useEvolution() {
  const { sdk, client } = useOpenApi()
  // setup 컨텍스트 밖(직접 단위테스트 등)에서도 동작하도록 useI18n() 대신 nuxtApp.$i18n 사용.
  const { $i18n } = useNuxtApp()
  const t = (key: string): string => $i18n.t(key)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function upgrade(targetStage: EvolutionStage): Promise<UpgradeTerrariumResponse | null> {
    loading.value = true
    error.value = null
    try {
      const res = await sdk.upgradeTerrarium({ client, body: { targetStage } })
      if (res.error) throw res.error
      return castData<UpgradeTerrariumResponse>(res.data) ?? null
    } catch (e) {
      error.value = errMsg(e, t('terrarium.evolutionError'))
      return null
    } finally {
      loading.value = false
    }
  }

  function isUnlocked(terrarium: TerrariumResponse | null | undefined, stage: EvolutionStage): boolean {
    if (!terrarium) return false
    const list = (terrarium.unlockedStages ?? []) as readonly string[]
    return list.includes(stage)
  }

  return { loading, error, upgrade, isUnlocked }
}
