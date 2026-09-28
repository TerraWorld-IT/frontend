import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'

const source = readFileSync('app/components/notifications/Center.vue', 'utf8')
const { descriptor, errors } = parse(source)
const template = descriptor.template?.content ?? ''
const css = descriptor.styles[0]?.content ?? ''
const [wideScreenCss, narrowScreenAndReducedCss = ''] = css.split('@media (max-width: 448px)')
const [narrowScreenCss = '', reducedMotionCss = ''] = narrowScreenAndReducedCss.split('@media (prefers-reduced-motion: reduce)')

describe('알림함 전환', () => {
  it('패널 경계를 뷰포트 안에 고정하고 이동하는 콘텐츠를 그 안에서 자른다', () => {
    expect(errors).toHaveLength(0)
    expect(template).toMatch(/class="notif-panel fixed inset-y-0 inset-x-0 w-full max-w-md mx-auto overflow-hidden shadow-2xl"/)
    expect(template).toMatch(/class="notif-panel-content absolute inset-0 flex flex-col"/)
    expect(template.indexOf('notif-panel-content')).toBeGreaterThan(template.indexOf('data-testid="notifications-panel"'))
  })

  it('448px 이하에서 진입과 퇴장 모두 내부 콘텐츠를 오른쪽으로 이동시킨다', () => {
    expect(narrowScreenCss).toMatch(/\.notif-panel-enter-from \.notif-panel,\s*\.notif-panel-leave-to \.notif-panel\s*\{\s*transform: none;\s*\}/)
    expect(narrowScreenCss).toMatch(/\.notif-panel-enter-active \.notif-panel-content,\s*\.notif-panel-leave-active \.notif-panel-content\s*\{\s*transition: transform 0\.28s/)
    expect(narrowScreenCss).toMatch(/\.notif-panel-enter-from \.notif-panel-content,\s*\.notif-panel-leave-to \.notif-panel-content\s*\{\s*transform: translateX\(100%\);\s*\}/)
  })

  it('넓은 화면의 기존 이동 거리와 동작을 유지한다', () => {
    expect(wideScreenCss).toMatch(/\.notif-panel-enter-active \.notif-panel,\s*\.notif-panel-leave-active \.notif-panel\s*\{\s*transition: transform 0\.28s/)
    expect(wideScreenCss).toContain('transform: translateX(min(100%, max(0px, calc((100vw - 28rem) / 2))))')
  })

  it('모션 감소 설정에서 내부 콘텐츠를 포함한 전환 시간을 줄인다', () => {
    expect(reducedMotionCss).toMatch(/\.notif-panel-enter-active \.notif-panel-content,\s*\.notif-panel-leave-active \.notif-panel-content\s*\{\s*transition-duration: 0\.01ms;/)
  })
})
