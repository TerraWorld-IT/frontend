/**
 * 메모지/배경 테마 선택 + persist.
 *
 * `entitlements.premiumThemes` (UserMeResponse) 는 boolean 권리 플래그일 뿐
 * 테마 카탈로그를 내려주지 않으므로, 카탈로그는 프론트 UI-only 상수로 정의한다.
 * (백엔드가 카탈로그 endpoint 를 추가하면 이 상수를 SDK 타입으로 교체)
 *
 * - `basic` 테마는 항상 해금 (premium=false).
 * - premium 테마는 `entitlements.premiumThemes === true` 일 때만 적용 가능.
 * - 선택값은 localStorage(STORAGE_KEYS.THEME) + useState 로 SSR-safe 하게 persist.
 *
 * 보안(코드리뷰 2026-06-15): entitlement 검증은 컴포넌트 클릭 핸들러뿐 아니라
 * loadPersisted/selectTheme 내부에도 둔다. 해금 취소(revoke) 또는 localStorage 변조로
 * 잠금 테마가 저장돼 있어도 복원/적용되지 않고 basic 으로 리셋된다.
 */

export interface ThemeOption {
  /** 안정 식별자 (localStorage 저장값) */
  id: string
  /** i18n 키 suffix — theme.name.{id} */
  nameKey: string
  /** 프리미엄 (해금 필요) 여부 */
  premium: boolean
  /** 스와치 미리보기용 riso 토큰 hex (2~3색) */
  swatch: string[]
}

/** 기본 테마 (항상 해금) + 프리미엄 팩 카탈로그. riso 팔레트 기준. */
export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'basic', nameKey: 'basic', premium: false, swatch: ['#FFF8EB', '#7B9E6B', '#2D2D2D'] },
  { id: 'sunset', nameKey: 'sunset', premium: true, swatch: ['#FFD4B2', '#E07A5F', '#C67B5C'] },
  { id: 'twilight', nameKey: 'twilight', premium: true, swatch: ['#C3AED6', '#2D3A6E', '#A8D8EA'] },
  { id: 'meadow', nameKey: 'meadow', premium: true, swatch: ['#7B9E6B', '#00A95C', '#F4E4BA'] },
  { id: 'blossom', nameKey: 'blossom', premium: true, swatch: ['#E8A0BF', '#FFD4B2', '#F4E4BA'] },
]

const DEFAULT_THEME_ID = 'basic'

/**
 * @param premiumUnlocked entitlements.premiumThemes — 프리미엄 테마 해금 여부.
 *   loadPersisted/selectTheme 가 이 값으로 잠금 테마 적용/복원을 차단한다.
 *   ref/getter 모두 허용 (반응형).
 */
export function useThemeSelection(premiumUnlocked?: MaybeRefOrGetter<boolean>) {
  const selectedThemeId = useState<string>('tw-theme', () => DEFAULT_THEME_ID)

  function isAllowed(id: string): boolean {
    const option = THEME_OPTIONS.find((t) => t.id === id)
    if (!option) return false
    if (!option.premium) return true
    return toValue(premiumUnlocked) === true
  }

  function loadPersisted() {
    if (!import.meta.client) return
    const stored = window.localStorage.getItem(STORAGE_KEYS.THEME)
    if (!stored) return
    if (isAllowed(stored)) {
      selectedThemeId.value = stored
    }
    else {
      // revoke / 변조로 적용 불가한 테마 → basic 으로 리셋 + 저장값 정정.
      selectedThemeId.value = DEFAULT_THEME_ID
      window.localStorage.setItem(STORAGE_KEYS.THEME, DEFAULT_THEME_ID)
    }
  }

  function selectTheme(id: string): boolean {
    if (!isAllowed(id)) return false
    selectedThemeId.value = id
    if (import.meta.client) {
      window.localStorage.setItem(STORAGE_KEYS.THEME, id)
    }
    return true
  }

  return {
    selectedThemeId,
    loadPersisted,
    selectTheme,
  }
}
