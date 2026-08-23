import type { TierCatalogResponse } from '@terraworld-it/openapi-frontend'

/**
 * 테라리움 티어 → 홈 병 캐러셀 레벨 뷰 변환 (아프젝 T14).
 *
 * 카탈로그(`GET /terrarium/tiers`)는 아프젝 v2 부터 3레벨 루비 전용이며 `TierInfo` 가
 * `level` / `descriptionKo` / `active` 를 직접 내려준다. 그 값을 그대로 쓰고, 4번째 이상
 * 레벨(비활성 티어가 섞여 오는 경우)만 숨긴다.
 */

/** 정령 코드 → 한글 이름 (해금 성공 카피 "비둘기 정령을 획득했어요") */
export const SPIRIT_NAME_KO: Record<string, string> = {
  'pigeon': '비둘기',
  'pigeon-spirit': '비둘기',
  'cat': '고양이',
  'cat-spirit': '고양이',
  'fish': '물고기',
  'fish-spirit': '물고기',
}

export function spiritNameKo(code: string | null | undefined): string {
  if (!code) return '새로운'
  return SPIRIT_NAME_KO[code] ?? SPIRIT_NAME_KO[code.toLowerCase()] ?? '새로운'
}

/** 홈 캐러셀이 쓰는 레벨 뷰 모델 */
export interface JarLevel {
  /** Lv 번호 (1~3) — `TierInfo.level` */
  level: number
  /** 티어 코드 (unlockTier / setActiveTier 호출용) */
  tier: string
  nameKo: string
  rubyCost: number
  slots: number
  spiritCode: string | null
  unlocked: boolean
  /** 현재 표시 중인 병(activeTier)인지 — 카탈로그 내 정확히 하나만 true */
  active: boolean
  /** 이전 레벨이 해금됐는지 — 순차 해금 CTA 판정 */
  prevUnlocked: boolean
  descriptionKo: string
}

/** 캐러셀에 노출할 최대 레벨 (Figma 3레벨) */
export const MAX_JAR_LEVEL = 3

/**
 * 카탈로그 → 레벨 목록(오름차순, Lv1 포함). 카탈로그가 없으면 빈 배열.
 * Lv1 은 기본 병이라 항상 unlocked 로 취급한다(서버 unlocked 가 false 여도 기본 병은 표시 대상).
 */
export function toJarLevels(catalog: TierCatalogResponse | null | undefined): JarLevel[] {
  if (!catalog) return []
  const sorted = [...catalog.tiers].sort((a, b) => a.level - b.level)
  const levels: JarLevel[] = []
  for (const t of sorted) {
    if (t.level > MAX_JAR_LEVEL) continue
    const prev = levels[levels.length - 1]
    levels.push({
      level: t.level,
      tier: t.tier,
      nameKo: t.nameKo,
      rubyCost: t.rubyCost,
      slots: t.slots,
      spiritCode: t.spiritCode ?? null,
      unlocked: t.level === 1 ? true : t.unlocked,
      active: t.active,
      prevUnlocked: prev ? prev.unlocked : true,
      descriptionKo: t.descriptionKo,
    })
  }
  return levels
}

/** 현재 표시 중인 병 레벨 — `active` 가 하나도 없으면(카탈로그 미로드 등) Lv1 */
export function activeJarLevel(levels: JarLevel[]): number {
  return levels.find(l => l.active)?.level ?? 1
}
