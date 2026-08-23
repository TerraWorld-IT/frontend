import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useBgm, BGM_STORAGE_KEY } from '~/composables/useBgm'

type BgmApi = ReturnType<typeof useBgm>

// setup 안에서 useBgm 을 호출하는 최소 컴포넌트 — onMounted/onBeforeUnmount 훅이 실제로 걸리게 한다.
async function mountBgm(): Promise<BgmApi> {
  let api: BgmApi | null = null
  const Host = defineComponent({
    setup() {
      api = useBgm()
      return () => h('div')
    },
  })
  await mountSuspended(Host)
  return api!
}

describe('useBgm', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exports useBgm function', () => {
    expect(typeof useBgm).toBe('function')
  })

  it('기본값은 ON, 음원(bgmUrl) 미설정 환경은 무음 플레이스홀더(hasSource=false)', async () => {
    const bgm = await mountBgm()
    expect(bgm.enabled.value).toBe(true)
    expect(bgm.hasSource).toBe(false)
    // 음원이 없어도 play/stop 은 예외 없이 no-op
    await expect(bgm.play()).resolves.toBeUndefined()
    expect(bgm.playing.value).toBe(false)
    bgm.stop()
  })

  it('toggle 은 ON/OFF 를 뒤집고 localStorage 에 기억한다', async () => {
    const bgm = await mountBgm()
    await bgm.toggle()
    expect(bgm.enabled.value).toBe(false)
    expect(localStorage.getItem(BGM_STORAGE_KEY)).toBe('0')
    await bgm.toggle()
    expect(bgm.enabled.value).toBe(true)
    expect(localStorage.getItem(BGM_STORAGE_KEY)).toBe('1')
  })

  it('저장된 OFF 선호를 다음 마운트에서 복원한다', async () => {
    localStorage.setItem(BGM_STORAGE_KEY, '0')
    const bgm = await mountBgm()
    expect(bgm.enabled.value).toBe(false)
  })
})
