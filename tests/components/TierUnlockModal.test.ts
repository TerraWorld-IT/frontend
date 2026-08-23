import { describe, it, expect, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TierUnlockModal from '~/components/terrarium/TierUnlockModal.vue'
import type { JarLevel } from '~/utils/tierLevels'

// 해금 팝업 CTA 3상태(해금 가능 / 루비 부족 / 이전 레벨 미해금) + 성공 팝업 카피 — Figma 나의 테라 탭 SoT.
function level(overrides: Partial<JarLevel> = {}): JarLevel {
  return {
    level: 2,
    tier: 'LARGE_JAR',
    nameKo: '큰 병',
    rubyCost: 30,
    slots: 20,
    spiritCode: null,
    unlocked: false,
    prevUnlocked: true,
    descriptionKo: '언덕과 바위가 있는 오픈형 테라리움 입니다.',
    ...overrides,
  }
}

function cta(): HTMLButtonElement | null {
  return document.body.querySelector<HTMLButtonElement>('[data-testid="tier-unlock-cta"]')
}

describe('TierUnlockModal', () => {
  afterEach(() => {
    // Teleport 잔류 DOM + 스크롤 잠금 상태 초기화 (Modal.test 와 동일 격리 규약)
    document.body.innerHTML = ''
    document.documentElement.classList.remove('scroll-locked')
    document.documentElement.removeAttribute('data-scroll-lock-count')
  })

  it('루비가 충분하고 이전 레벨이 해금됐으면 검정 CTA "루비 N개로 해금하기"', async () => {
    await mountSuspended(TierUnlockModal, {
      props: { open: true, target: level(), rubyBalance: 100, busy: false, success: null },
    })
    const btn = cta()
    expect(btn).not.toBeNull()
    expect(btn!.disabled).toBe(false)
    expect(btn!.textContent).toContain('루비 30개로 해금하기')
    expect(document.body.textContent).toContain('Lv.2 테라리움 해금하기')
    expect(document.body.textContent).toContain('배치 가능한 아이템 : 20개')
  })

  it('루비 부족이면 비활성 "루비 N개 사용 | 루비가 부족합니다"', async () => {
    await mountSuspended(TierUnlockModal, {
      props: { open: true, target: level(), rubyBalance: 10, busy: false, success: null },
    })
    const btn = cta()
    expect(btn!.disabled).toBe(true)
    expect(btn!.textContent).toContain('루비 30개 사용 | 루비가 부족합니다')
  })

  it('이전 레벨 미해금이면 루비가 있어도 비활성 "이전 레벨을 먼저 해금해 주세요"', async () => {
    await mountSuspended(TierUnlockModal, {
      props: { open: true, target: level({ level: 3, tier: 'GRAND_TANK', rubyCost: 50, slots: 40, spiritCode: 'pigeon', prevUnlocked: false }), rubyBalance: 999, busy: false, success: null },
    })
    const btn = cta()
    expect(btn!.disabled).toBe(true)
    expect(btn!.textContent).toContain('이전 레벨을 먼저 해금해 주세요')
    // 정령이 딸린 레벨은 SET 뱃지
    expect(document.body.textContent).toContain('SET')
  })

  it('success 가 있으면 성공 팝업 — 정령 획득 카피 + 관리 모드 바로가기', async () => {
    await mountSuspended(TierUnlockModal, {
      props: { open: true, target: level(), rubyBalance: 0, busy: false, success: { level: 3, tier: 'GRAND_TANK', grantedSpirit: 'pigeon' } },
    })
    expect(document.body.querySelector('[data-testid="tier-unlock-success"]')).not.toBeNull()
    expect(document.body.textContent).toContain('비둘기 정령을 획득했어요')
    expect(document.body.textContent).toContain('새로운 테라리움을 관리해 보세요')
    expect(document.body.querySelector('[data-testid="tier-unlock-manage"]')).not.toBeNull()
    // 성공 상태에서는 해금 본문이 닫혀 있다
    expect(document.body.querySelector('[data-testid="tier-unlock-body"]')).toBeNull()
  })
})
