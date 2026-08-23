// 2026-08-23 런타임 스모크 — `[Vue warn] Set operation on key "value" failed: target is readonly`
// 가 홈 6회·상점 4회·프로필/기록/성장 2회 찍히던 회귀 가드.
// Pinia 는 setup 스토어가 돌려준 ref 를 SSR 페이로드(initialState)로 하이드레이션할 때
// `ref.value = initialState[key]` 를 그대로 대입한다(pinia.mjs `shouldHydrate` 분기). readonly 프록시로
// 내보낸 상태는 그 대입이 막혀 경고가 나므로 `skipHydrate` 로 감싸야 한다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

mockNuxtImport('useOpenApi', () => () => ({ sdk: {}, client: {} }))

const READONLY_WARN = /target is readonly/

describe('스토어 readonly 상태 — SSR 하이드레이션 시 readonly 쓰기 경고 없음', () => {
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warn.mockRestore()
  })

  function readonlyWarnCount(): number {
    return warn.mock.calls.filter(args => READONLY_WARN.test(String(args[0]))).length
  }

  it('user 스토어 — 페이로드 상태가 있어도 me/loading 에 readonly 쓰기 경고가 나지 않는다', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    // SSR 페이로드가 있던 것처럼 스토어 생성 전에 상태를 미리 둔다.
    pinia.state.value.user = { me: { nickname: 'ssr' }, loading: true }
    const { useUserStore } = await import('~/stores/user')
    const store = useUserStore()
    expect(readonlyWarnCount()).toBe(0)
    // readonly 계약은 유지 — 밖에서 쓰면 여전히 무시된다(액션으로만 변경).
    expect(store.me).toBeNull()
  })

  it('homeSnapshot / items / terrarium 스토어 — 동일 규칙', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    pinia.state.value.homeSnapshot = { snapshot: null, loading: false }
    pinia.state.value.items = { items: [], loading: false }
    pinia.state.value.terrarium = { data: null, loading: false }
    const [{ useHomeSnapshotStore }, { useItemsStore }, { useTerrariumStore }] = await Promise.all([
      import('~/stores/homeSnapshot'),
      import('~/stores/items'),
      import('~/stores/terrarium'),
    ])
    useHomeSnapshotStore()
    useItemsStore()
    useTerrariumStore()
    expect(readonlyWarnCount()).toBe(0)
  })
})
