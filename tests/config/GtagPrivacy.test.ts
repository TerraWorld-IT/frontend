import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useNuxtApp, useRuntimeConfig } from '#app'
import gtagPlugin from '../../node_modules/nuxt-gtag/dist/runtime/plugin.client'

const mocks = vi.hoisted(() => ({ head: vi.fn(), getSession: vi.fn().mockResolvedValue({ data: null }) }))
vi.mock('~/lib/auth-client', () => ({ authClient: { getSession: mocks.getSession } }))
mockNuxtImport('useHead', () => mocks.head)
vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
const { default: config } = await import('../../nuxt.config')
const analyticsWindow = window as typeof window & { dataLayer?: unknown[] }
let previousOptions: ReturnType<typeof useRuntimeConfig>['public']['gtag']
let previousDataLayer: unknown[] | undefined
afterAll(() => vi.unstubAllGlobals())
afterEach(() => {
  useRuntimeConfig().public.gtag = previousOptions
  analyticsWindow.dataLayer = previousDataLayer
})

beforeEach(() => {
  mocks.head.mockClear()
  previousOptions = useRuntimeConfig().public.gtag
  previousDataLayer = analyticsWindow.dataLayer
  useRuntimeConfig().public.gtag = { ...previousOptions, ...config.gtag, id: 'G-TEST', tags: [], initCommands: [] }
  analyticsWindow.dataLayer = []
})

describe('GA4 개인정보 설정 전달', () => {
  it('설치된 nuxt-gtag 플러그인이 두 옵션을 config 명령에 전달하되 동의 전 스크립트는 주입하지 않는다', async () => {
    expect(config.gtag && config.gtag.initMode).toBe('manual')
    const nuxt = useNuxtApp()
    await nuxt.runWithContext(() => gtagPlugin(nuxt))
    const commands = analyticsWindow.dataLayer!.map(command => Array.from(command as ArrayLike<unknown>))
    expect(commands).toContainEqual(['config', 'G-TEST', {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    }])
    expect(mocks.head).not.toHaveBeenCalled()
  })
})
