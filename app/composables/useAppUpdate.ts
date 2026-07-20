import { Capacitor } from '@capacitor/core'

/**
 * 강제 업데이트 게이트.
 *
 * 원격 URL WebView 셸(Capacitor)에서는 웹이 즉시 배포되지만 네이티브 셸은 스토어 심사를 거치므로,
 * 웹 코드가 새 네이티브 플러그인/능력에 의존하기 시작하면 구버전 셸이 조용히 깨진다. 이를 막기 위해
 * 네이티브 셸 버전을 읽어 `NUXT_PUBLIC_MIN_APP_VERSION` 미만이면 업데이트를 유도한다.
 *
 * - 웹(비네이티브)에서는 항상 no-op (updateRequired=false).
 * - `minAppVersion` 이 빈 값이면 게이트 비활성(출시 전 기본).
 * - 버전 비교는 dot-separated numeric (semver 의 major.minor.patch 부분만; prerelease 태그 무시).
 */
export function useAppUpdate() {
  const config = useRuntimeConfig()
  const { isNative, isIOS } = useNative()

  const nativeVersion = ref<string | null>(null)
  const updateRequired = ref<boolean>(false)
  const checked = ref<boolean>(false)

  /**
   * "1.2.3" → [1,2,3]. 숫자 아닌 접미(-beta, +ci.7 등 prerelease/build metadata)는 제거.
   * 단 core 세그먼트 중 하나라도 숫자가 아니면(예: "1.x.9") 빈 배열을 반환해 게이트를
   * fail-open 시킨다 — 잘못된 비교로 최신 앱을 업데이트하라고 막는 것보다 안 막는 쪽이 안전.
   * `+` 미처리 시 CI dispatch 빌드 "0.0.0+ci.N" 이 [0,0,0,N] 으로 파싱되던 함정(audit B5-1).
   */
  function parseVersion(v: string): number[] {
    const nums = v.split('+')[0]!.split('-')[0]!.split('.').map(n => Number.parseInt(n, 10))
    if (nums.some(n => !Number.isFinite(n))) return []
    return nums
  }

  /** a < b 이면 true. 길이가 다르면 짧은 쪽을 0 으로 패딩. */
  function isLower(a: number[], b: number[]): boolean {
    const len = Math.max(a.length, b.length)
    for (let i = 0; i < len; i++) {
      const x = a[i] ?? 0
      const y = b[i] ?? 0
      if (x < y) return true
      if (x > y) return false
    }
    return false
  }

  async function check(): Promise<void> {
    checked.value = false
    updateRequired.value = false
    nativeVersion.value = null

    if (!isNative) { checked.value = true; return }

    const min = String(config.public.minAppVersion || '').trim()
    if (!min) { checked.value = true; return } // 게이트 비활성

    // 현재 플랫폼의 스토어 URL 이 없으면 게이트를 켜지 않는다 — 업데이트 버튼이 no-op 인 채로
    // 사용자를 막으면(dead-button strand) 이탈시킨다. URL 이 있을 때만 강제한다.
    const storeUrl = String((isIOS ? config.public.iosStoreUrl : config.public.androidStoreUrl) || '').trim()
    if (!storeUrl) { checked.value = true; return }

    // getAppInfo() 가 throw 해도(플러그인/네이티브 오류) 게이트는 fail-open 되어야 한다 —
    // 내부에서 삼키고 미차단으로 종료. (throw 가 check() 밖으로 새면 호출부의 후속 배선이 끊긴다.)
    let info: { version: string; build: string } | null = null
    try {
      const { getAppInfo } = useNative()
      info = await getAppInfo()
    }
    catch { checked.value = true; return }
    if (!info?.version) { checked.value = true; return } // 버전 못 읽으면 막지 않음

    nativeVersion.value = info.version
    const cur = parseVersion(info.version)
    const wanted = parseVersion(min)
    if (!cur.length || !wanted.length) { checked.value = true; return } // 파싱 실패 시 막지 않음
    // core 0.0.0 = CI workflow_dispatch 테스터 빌드(release.yml 이 "0.0.0+ci.N" 주입) —
    // 스토어 릴리스가 아니므로 게이트 면제. 미면제 시 Firebase App Distribution 테스터 전원이
    // 업데이트 게이트에 하드블록된다 (audit B5-1).
    if (cur.every(n => n === 0)) { checked.value = true; return }
    updateRequired.value = isLower(cur, wanted)
    checked.value = true
  }

  /** 플랫폼별 스토어 열기. URL 미설정이면 no-op. */
  async function openStore(): Promise<void> {
    if (!import.meta.client) return
    // 괄호 주의: `a ? b : c || ''` 는 `||` 가 c 에만 걸려 iOS+URL 미설정 시 "undefined" 문자열이
    // 빈값 가드를 통과한다 (audit B5-2).
    const url = String((isIOS ? config.public.iosStoreUrl : config.public.androidStoreUrl) || '').trim()
    if (!url) return
    if (isNative) {
      // 시스템 브라우저/스토어 앱으로 위임 (in-WebView 로 열지 않음).
      window.open(url, '_system')
    }
    else {
      window.open(url, '_blank')
    }
  }

  return { nativeVersion, updateRequired, checked, check, openStore, isNative, platform: Capacitor.getPlatform() }
}
