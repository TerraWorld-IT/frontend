import type { TerrariumResponse, UpgradeTerrariumResponse } from '@terraworld-it/openapi-frontend'

export type EvolutionStage = 'POT' | 'BOTTLE' | 'PALUDARIUM' | 'WORLD' | 'CUSTOM'

export const EVOLUTION_STAGE_META: Record<EvolutionStage, { label: string, description: string, unlockLevel: number }> = {
  POT: { label: '토분', description: '작은 화분 — 시작 단계', unlockLevel: 1 },
  BOTTLE: { label: '유리병', description: '기본 테라리움', unlockLevel: 5 },
  PALUDARIUM: { label: '팔루다리움', description: '수중 + 육상 — 산소방울 효과', unlockLevel: 10 },
  WORLD: { label: '나만의 세계', description: '확장 배경 — 4종 해금', unlockLevel: 20 },
  CUSTOM: { label: '자유 배치', description: '슬롯 제약 없음 — 유료 권리 필요', unlockLevel: 30 },
}

/**
 * 테라리움 진화 단계 전환.
 * - upgrade(target): 잠금 해제된 단계만 허용. CUSTOM 은 freePlacement entitlement 필수.
 */
export function useEvolution() {
  const { sdk, client } = useOpenApi()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function upgrade(targetStage: EvolutionStage): Promise<UpgradeTerrariumResponse | null> {
    loading.value = true
    error.value = null
    try {
      const res = await sdk.upgradeTerrarium({ client, body: { targetStage } })
      if (res.error) throw res.error
      return castData<UpgradeTerrariumResponse>(res.data) ?? null
    } catch (e) {
      error.value = errMsg(e, '진화 실패')
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
