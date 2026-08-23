import type { TierCatalogResponse, TierInfo } from '@terraworld-it/openapi-frontend'

/**
 * 테라리움 티어 → 홈 병 캐러셀 레벨 뷰 변환 (아프젝 T14 FE 선행분).
 *
 * 현행 카탈로그(`GET /terrarium/tiers`)는 4티어(반짝이+루비)지만 Figma 는 3레벨 루비 전용이다.
 * tierOrder 1~3 을 Lv1~3 으로 매핑하고 4번째 이상은 숨긴다. 스펙 초안(N-B4)의 신규 필드
 * `level` / `descriptionKo` / `active` 는 아직 SDK 에 없어 optional chaining 으로 읽고 폴백한다.
 * TODO(WS-A N-B4 머지 후): TierInfo 에 level/descriptionKo/active 가 생기면 폴백 맵을 제거한다.
 */

/** Figma 해금 팝업 설명 카피 — 레벨별 폴백(서버 descriptionKo 우선) */
export const TIER_LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: '기본 유리병 테라리움 입니다.',
  2: '언덕과 바위가 있는 오픈형 테라리움 입니다.',
  3: '케이스형 테라리움 입니다. 비둘기 정령이 함께 해금됩니다.',
}

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
  /** Lv 번호 (1~3) */
  level: number
  /** 티어 코드 (unlockTier 호출용) */
  tier: string
  nameKo: string
  rubyCost: number
  slots: number
  spiritCode: string | null
  unlocked: boolean
  /** 이전 레벨이 해금됐는지 — 순차 해금 CTA 판정 */
  prevUnlocked: boolean
  descriptionKo: string
}

/** 스펙 초안의 선택 필드(아직 SDK 미반영) */
type TierInfoDraft = TierInfo & { level?: number | null, descriptionKo?: string | null, active?: boolean | null }

/** 캐러셀에 노출할 최대 레벨 (Figma 3레벨 — 4번째 티어는 숨김) */
export const MAX_JAR_LEVEL = 3

/**
 * 카탈로그 → 레벨 목록(오름차순, Lv1 포함). 카탈로그가 없으면 빈 배열.
 * Lv1 은 기본 병이라 항상 unlocked 로 취급한다(서버 unlocked 가 false 여도 기본 병은 표시 대상).
 */
export function toJarLevels(catalog: TierCatalogResponse | null | undefined): JarLevel[] {
  if (!catalog) return []
  const sorted = [...catalog.tiers].sort((a, b) => a.tierOrder - b.tierOrder)
  const levels: JarLevel[] = []
  for (const raw of sorted) {
    const t = raw as TierInfoDraft
    const level = t.level ?? t.tierOrder
    if (level > MAX_JAR_LEVEL) continue
    const prev = levels[levels.length - 1]
    levels.push({
      level,
      tier: t.tier,
      nameKo: t.nameKo,
      rubyCost: t.rubyCost,
      slots: t.slots,
      spiritCode: t.spiritCode ?? null,
      unlocked: level === 1 ? true : t.unlocked,
      prevUnlocked: prev ? prev.unlocked : true,
      descriptionKo: t.descriptionKo ?? TIER_LEVEL_DESCRIPTIONS[level] ?? '',
    })
  }
  return levels
}
