import { computed, ref, type Ref } from 'vue'

/**
 * P-EFFECT-001: 이펙트 파티클 자동 분기.
 *
 * 파티클은 "시간대 / 테라리움 티어" 에 따라 분기. 낙서장 리팩토링으로 구 '진화 단계'가
 * 티어(GLASS_JAR/LARGE_JAR/GRAND_TANK/HOUSE_TANK, 화폐 잠금해제)로 대체됨 — 수중형 티어(대형 탱크)는
 * 산소방울(bubble). 날씨 API 미도입 — rain/snow 의 날씨 기반 분기는 후속.
 */
export type ParticleEffect = 'off' | 'rain' | 'snow' | 'firefly' | 'bubble'

const KST_OFFSET_HOURS = 9

/** 수중형(탱크) 티어 — 산소방울 파티클. 낙서장 티어 확장 시 본 집합만 갱신. */
const AQUATIC_TIERS: ReadonlySet<string> = new Set(['GRAND_TANK', 'HOUSE_TANK'])

/** 티어 + 시간대 기반 파티클 자동 결정 (순수 함수 — 테스트 용이). */
export function resolveParticleEffect(opts: {
  hour: number
  tier?: string | null
}): ParticleEffect {
  // 수중형(대형 탱크) 티어 → 산소방울
  if (opts.tier && AQUATIC_TIERS.has(opts.tier)) {
    return 'bubble'
  }
  // 밤 (18:00 ~ 06:00 KST) → 반딧불
  if (opts.hour < 6 || opts.hour >= 18) {
    return 'firefly'
  }
  // 낮 → 효과 없음 (날씨 API 도입 시 rain/snow 분기는 후속)
  return 'off'
}

/**
 * @param tier 현재 테라리움 티어 코드 (reactive)
 * @returns autoEffect — 시간대 + 티어로 자동 결정된 파티클. 사용처는 수동 override 와
 *          `manual ?? autoEffect` 형태로 합성.
 */
export function useParticleEffect(tier: Ref<string | null | undefined>) {
  // code-review CDX-003 (2026-05-21): 시간을 reactive source 로 — 1분마다 tick 갱신.
  // 이전엔 computed 가 `new Date()` 를 읽되 reactive dependency 가 없어, 페이지를
  // 06:00/18:00 KST 경계에 걸쳐 유지 시 파티클이 구시간 결과로 고정됐다.
  const nowTick = ref<number>(Date.now())
  // useIntervalFn — @vueuse/nuxt auto-import, 컴포넌트 unmount 시 자동 정리
  useIntervalFn(() => {
    nowTick.value = Date.now()
  }, 60_000)

  const autoEffect = computed<ParticleEffect>(() => {
    // nowTick 을 읽어 reactive dependency 등록
    const tickedDate = new Date(nowTick.value)
    const hour = (tickedDate.getUTCHours() + KST_OFFSET_HOURS) % 24
    return resolveParticleEffect({ hour, tier: tier.value })
  })

  return { autoEffect, resolveParticleEffect }
}
