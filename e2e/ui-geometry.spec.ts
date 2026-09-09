import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { devices, expect, test, type Page } from '@playwright/test'
import { friends, installDenseData } from './fixtures/dense-data'

// 기존 playwright.config.ts의 Chromium 프로젝트에서 한 서버를 순차 사용한다.
test.describe.configure({ mode: 'serial' })

const output = join(process.cwd(), 'e2e/output-screenshots/ui-geometry')
const calendarTime = '2026-08-15T12:00:00+09:00'
const missingPath = '/ui-geometry-no-such-page'

type Scenario = {
  path: string
  name: string
  action?: (page: Page) => Promise<void>
  onboarding?: boolean
}
type ConsoleError = { text: string, url: string }

function allowedConsoleError(path: string, error: ConsoleError, previous: ConsoleError[]) {
  // layout-parity.spec.ts:361과 동일하게 서버 날짜와 page.clock의 날짜 차이로 생기는 달력 hydration 메시지만 허용한다.
  if (path === '/calendar' && error.text === 'Hydration completed but contains mismatches.') return true
  // 같은 캡처에서 앞서 관찰한 달력 hydration 불일치의 파생 slice 오류만 허용한다. pageerror에는 적용하지 않는다.
  if (path === '/calendar' && /Cannot read properties of undefined \(reading 'slice'\)/.test(error.text)
    && previous.some(entry => entry.text === 'Hydration completed but contains mismatches.')) return true
  if (path === missingPath) {
    // 404 오류 화면의 격리 프레임에서는 저장소 초기화 스크립트의 localStorage 접근이 거부될 수 있다.
    if (error.text === "Failed to read the 'localStorage' property from 'Window': Access is denied for this document.") return true
    // 404에서 관찰한 빈 격리 프레임 출처와 frame-src 지시문 원문만 허용해 다른 출처의 CSP 회귀는 잡는다.
    if (error.url === `http://localhost:3000${missingPath}`
      && error.text.trim() === `Framing '' violates the following Content Security Policy directive: "frame-src 'self' https://googleads.g.doubleclick.net https://*.googlesyndication.com https://www.google.com". The request has been blocked.`) return true
    // 의도적으로 요청한 없는 경로 자체의 404만 허용하며 다른 리소스 404는 실패시킨다.
    if (/Failed to load resource: the server responded with a status of 404/.test(error.text)
      && error.url === `http://localhost:3000${missingPath}`) return true
  }
  return false
}

type Rect = { x: number, y: number, width: number, height: number }

// 실측 콘텐츠와 합성 대조군이 같은 순수 교차 함수를 사용한다.
function intersection(a: Rect, b: Rect) {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return width > 0 && height > 0 ? { width, height } : null
}

const homeCard = ':scope > .relative > .rounded-3xl'
const intro = '[role="status"]:has(.mode-intro-jar)'

async function homeDialogVisible(page: Page, name: string) {
  await expect(page.getByRole('dialog', { name, exact: true }).locator(homeCard)).toBeVisible()
}

// safe-area.spec.ts와 임시 감사 하네스의 SFC 마운트 방식을 최소 복제한다.
// 상태만 주입하며 실제 앱 컴포넌트와 앱 컨텍스트를 사용한다.
async function mountOverlay(page: Page, name: string, props: Record<string, unknown>) {
  await page.evaluate(async ({ name, props }) => {
    const vueUrl = performance.getEntriesByType('resource').map(entry => entry.name)
      .find(url => url.includes('/vue/dist/vue.runtime'))
    if (!vueUrl) throw new Error('Vue 런타임 리소스를 찾을 수 없습니다')
    const vue = await import(vueUrl)
    const app = Reflect.get(document.getElementById('__nuxt')!, '__vue_app__').$nuxt
    const component = await import(`/_nuxt/components/${name}.vue`)
    const host = document.createElement('div')
    document.body.append(host)
    const vnode = vue.h(component.default, props)
    vnode.appContext = app.vueApp._context
    app.runWithContext(() => vue.render(vnode, host))
    await vue.nextTick()
  }, { name, props })
}

async function ready(page: Page) {
  await page.locator('[data-testid$="skeleton"]').first().waitFor({ state: 'hidden', timeout: 15_000 })
  await page.evaluate(() => {
    for (const [key, value] of Object.entries({ '--sat': '47px', '--sab': '34px', '--sal': '0px', '--sar': '0px' })) {
      document.documentElement.style.setProperty(key, value)
    }
  })
  await page.addStyleTag({ content: '#nuxt-devtools-container,nuxt-error-overlay,nuxt-devtools-frame,nuxt-devtools-anchor {display:none!important}' })
  // 시트·캐러셀 전환이 끝난 뒤 같은 시점의 이미지와 기하를 수집한다.
  await page.waitForTimeout(500)
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

async function measure(page: Page) {
  const geometry = await page.evaluate(() => {
    const selector = (element: Element) => element.id ? `#${CSS.escape(element.id)}`
      : element.getAttribute('data-testid') ? `[data-testid="${element.getAttribute('data-testid')}"]`
        : element.tagName.toLowerCase() + [...element.classList].slice(0, 3).map(name => `.${CSS.escape(name)}`).join('')
    const describe = (element: Element) => {
      const rect = element.getBoundingClientRect()
      return {
        selector: selector(element),
        text: (element.getAttribute('aria-label') || element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 110),
        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      }
    }
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
        && !element.closest('#nuxt-devtools-container,nuxt-devtools-frame,nuxt-devtools-anchor,nuxt-error-overlay')
    }
    const all = [...document.querySelectorAll('body *')].filter(visible)
    const hitArea = (element: Element) => {
      const box = element.getBoundingClientRect()
      let left = box.left, right = box.right, top = box.top, bottom = box.bottom
      const pseudoElements = []
      if (element instanceof HTMLElement) {
        // 계산된 의사요소 크기·inset·이동과 부모 배율을 클릭 사각형에 합친다.
        // 장식용 pointer-events:none 의사요소는 히트영역에 포함하지 않는다.
        const number = (value: string) => Number.parseFloat(value) || 0
        const ownStyle = getComputedStyle(element)
        const borderWidth = number(ownStyle.width) + (ownStyle.boxSizing === 'border-box' ? 0
          : number(ownStyle.paddingLeft) + number(ownStyle.paddingRight) + number(ownStyle.borderLeftWidth) + number(ownStyle.borderRightWidth))
        const borderHeight = number(ownStyle.height) + (ownStyle.boxSizing === 'border-box' ? 0
          : number(ownStyle.paddingTop) + number(ownStyle.paddingBottom) + number(ownStyle.borderTopWidth) + number(ownStyle.borderBottomWidth))
        // 정수 offsetHeight 반올림을 배율로 오인하지 않는다. 조상까지 변환이 없으면 정확히 1이다.
        let transformed = false
        for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor)
          if (style.transform !== 'none' || style.scale !== 'none') transformed = true
        }
        const scaleX = transformed && borderWidth ? box.width / borderWidth : 1
        const scaleY = transformed && borderHeight ? box.height / borderHeight : 1
        for (const pseudo of ['::before', '::after']) {
          const style = getComputedStyle(element, pseudo)
          if (style.content === 'none' || style.content === 'normal' || style.display === 'none'
            || style.visibility === 'hidden' || style.pointerEvents === 'none' || style.position !== 'absolute') continue
          const extraX = number(style.paddingLeft) + number(style.paddingRight) + number(style.borderLeftWidth) + number(style.borderRightWidth)
          const extraY = number(style.paddingTop) + number(style.paddingBottom) + number(style.borderTopWidth) + number(style.borderBottomWidth)
          const width = Math.max(number(style.width), number(style.minWidth)) + (style.boxSizing === 'border-box' ? 0 : extraX)
          const height = Math.max(number(style.height), number(style.minHeight)) + (style.boxSizing === 'border-box' ? 0 : extraY)
          if (!width || !height) continue
          const transform = new DOMMatrix(style.transform === 'none' ? undefined : style.transform)
          const translate = style.translate.split(' ')
          const translated = (value: string | undefined, size: number) => value?.includes('%') ? number(value) * size / 100 : number(value ?? '0')
          const x = element.clientLeft + (style.left !== 'auto' ? number(style.left) : element.clientWidth - number(style.right) - width)
            + transform.m41 + translated(translate[0], width)
          const y = element.clientTop + (style.top !== 'auto' ? number(style.top) : element.clientHeight - number(style.bottom) - height)
            + transform.m42 + translated(translate[1], height)
          const rect = { x: box.left + x * scaleX, y: box.top + y * scaleY, width: width * Math.abs(transform.a) * scaleX, height: height * Math.abs(transform.d) * scaleY }
          left = Math.min(left, rect.x); right = Math.max(right, rect.x + rect.width)
          top = Math.min(top, rect.y); bottom = Math.max(bottom, rect.y + rect.height)
          pseudoElements.push({ pseudo, ...rect })
        }
        // 스크롤로 노출할 수 있는 원래 클릭 사각형은 보존하고, hidden/clip이 자르는 의사요소 확장만 제한한다.
        for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor)
          const rect = ancestor.getBoundingClientRect()
          if (['hidden', 'clip'].includes(style.overflowX)) {
            left = Math.min(box.left, Math.max(left, rect.left)); right = Math.max(box.right, Math.min(right, rect.right))
          }
          if (['hidden', 'clip'].includes(style.overflowY)) {
            top = Math.min(box.top, Math.max(top, rect.top)); bottom = Math.max(box.bottom, Math.min(bottom, rect.bottom))
          }
        }
      }
      return { width: Math.max(0, right - left), height: Math.max(0, bottom - top), pseudoElements }
    }
    // 감사 하네스의 small처럼 시각 자식 대신 클릭 가능한 요소 자체를 측정한다.
    const small = all.filter(element => element.matches('button,a,[role=button],input[type=checkbox]'))
      .map(element => ({ ...describe(element), hitArea: hitArea(element), disabled: element.matches(':disabled') }))
      .filter(element => element.hitArea.width < 48 || element.hitArea.height < 48)
      .map(element => ({ ...element, severe: element.hitArea.width < 44 || element.hitArea.height < 44 }))
    // 내비게이션의 아이콘과 라벨은 서로 다른 행이므로 라벨 span의 텍스트만 검사한다.
    // CSS nowrap 여부에 의존하지 않아 그 규칙이 깨져도 회귀를 검출한다.
    const wrap = all.filter(element => element.matches('nav a > span:last-child,[role=tab],.apjek-chip,.apjek-cta'))
      .flatMap((element) => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
        const rows: number[] = []
        let rects = 0
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent?.trim() || node.parentElement?.closest('svg,[aria-hidden=true],.iconify')) continue
          const range = document.createRange()
          range.selectNodeContents(node)
          for (const rect of range.getClientRects()) {
            if (!rect.width || !rect.height) continue
            rects++
            if (!rows.some(y => Math.abs(y - rect.y) < 1)) rows.push(rect.y)
          }
        }
        return rows.length > 1 ? [{ ...describe(element), rects, rows }] : []
      })
    const clip = all.filter(element => element instanceof HTMLElement && getComputedStyle(element).overflowX === 'hidden'
      && element.scrollWidth > element.clientWidth && [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()))
      .map(element => ({ ...describe(element), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }))
    const dialogs = all.filter(element => element.matches('[role=dialog]')).map((root) => {
      // BottomSheet, CommonModal, HomeDialog, 알림, 공지의 실제 콘텐츠 패널만 매핑한다.
      // 힐링 모드는 백드롭 셸 없이 스테이지 자체가 전체 화면 콘텐츠인 명시적 예외다.
      const panel = root.matches('#my-terra-container:has([data-testid="home-healing-bar"])') ? root
        : root.querySelector(':scope > .sheet-panel, :scope > [data-testid="modal-card"], :scope > .relative > .rounded-3xl, :scope > [data-testid="notifications-panel"], :scope[aria-labelledby="notices-title"] > div, :scope[data-testid="onboarding-root"] > div')
      if (!panel) throw new Error(`콘텐츠 패널 매핑이 없는 다이얼로그: ${root.outerHTML.slice(0, 250)}`)
      return panel
    }).filter(visible)
    // app/components/common/Toast.vue의 실제 토스트 컨테이너만 선택한다. 빈 컨테이너와 백드롭·html::after는 제외한다.
    const toastRoots = all.filter(element => element.matches('[role=status][aria-live=polite][aria-atomic=true]')
      && element.querySelector('[data-toast-id]'))
    const root = document.scrollingElement!
    return {
      overflow: { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, violated: root.scrollWidth > root.clientWidth },
      wrap, dialogPanels: dialogs.map(describe), toastPanels: toastRoots.map(describe), small, clip,
      insets: ['--sat', '--sab', '--sal', '--sar'].map(key => getComputedStyle(document.documentElement).getPropertyValue(key)),
    }
  })
  const overlaps = []
  for (let i = 0; i < geometry.dialogPanels.length; i++) {
    const a = geometry.dialogPanels[i]!
    for (const b of [...geometry.dialogPanels.slice(i + 1), ...geometry.toastPanels]) {
      const overlap = intersection(a, b)
      if (overlap) overlaps.push({ a, b, intersection: overlap })
    }
  }
  return { ...geometry, overlaps }
}

const routes: Scenario[] = [
  { path: '/', name: 'home' }, { path: '/grow', name: 'grow' },
  { path: '/record', name: 'record' }, { path: '/calendar', name: 'calendar' },
  { path: '/shop', name: 'shop' }, { path: '/profile', name: 'profile' },
  { path: '/profile/settings', name: 'profile-settings' }, { path: '/friends', name: 'friends' },
  { path: '/share/TESTCODE1', name: 'share' }, { path: '/auth/login', name: 'login' },
  { path: '/auth/login', name: 'signup', action: async (page) => {
    await page.locator('button[type=button]').filter({ hasText: /계정이 없으신가요|가입하기/ }).first().click()
    await expect(page.getByRole('button', { name: '가입하기', exact: true })).toBeVisible()
  } },
  { path: '/legal/privacy', name: 'legal-privacy' }, { path: '/legal/terms', name: 'legal-terms' },
  { path: '/upgrade/free-placement', name: 'upgrade-free-placement' }, { path: missingPath, name: '404' },
]

const states: Scenario[] = [
  { path: '/', name: 'manage', action: async (page) => {
    await page.getByTestId('home-manage').click()
    await expect(page.locator('#home-manage-panel')).toBeVisible()
    await expect(page.locator(intro)).toBeHidden()
  } },
  { path: '/', name: 'healing', action: async (page) => {
    await page.getByTestId('home-healing').click()
    await expect(page.getByTestId('home-healing-bar')).toBeVisible()
    await expect(page.getByTestId('home-bgm-toggle')).toBeVisible()
    await expect(page.locator(intro)).toBeHidden()
  } },
  { path: '/', name: 'notifications', action: async (page) => {
    await page.getByTestId('home-notify').click()
    await expect(page.getByTestId('notifications-panel')).toBeVisible()
  } },
  ...[['share-modal', 'home-share', '공유하기'], ['ranking', 'home-ranking', '랭킹']].map(([name, id, title]) => ({
    path: '/', name: name!, action: async (page: Page) => {
      await page.getByTestId(id!).click()
      await homeDialogVisible(page, title!)
    },
  })),
  { path: '/', name: 'invite-modal', action: async (page) => {
    await page.getByTestId('home-share').click()
    await homeDialogVisible(page, '공유하기')
    await page.getByTestId('share-invite').click()
    await homeDialogVisible(page, '나의 초대코드')
    await expect(page.getByTestId('invite-code-display')).toHaveText('TERRA - TESTCODE1')
  } },
  { path: '/', name: 'unlock-insufficient', action: async (page) => {
    await mountOverlay(page, 'terrarium/TierUnlockModal', { open: true, target: {
      tier: 'LARGE_JAR', level: 2, descriptionKo: '더 넓고 아름다운 테라리움으로 여러분의 작은 세상을 꾸며 보세요.',
      slots: 20, rubyCost: 9999999, prevUnlocked: true,
    }, rubyBalance: 0, busy: false, success: null })
    await homeDialogVisible(page, '테라리움 해금하기')
    await expect(page.getByTestId('tier-unlock-cta')).toBeVisible()
  } },
  { path: '/', name: 'onboarding-1', onboarding: true, action: async (page) => {
    await expect(page.getByTestId('onboarding-root')).toBeVisible()
  } },
  ...[['todo', '투두리스트 기록'], ['diary', '일기 기록'], ['distance', '거리 기록']].map(([name, label]) => ({
    path: '/record', name: `${name}-sheet`, action: async (page: Page) => {
      await page.getByRole('button', { name: `${label} 기록하기`, exact: true }).click()
      await expect(page.getByRole('dialog', { name: label, exact: true }).locator('.sheet-panel')).toBeVisible()
      if (name === 'diary') {
        await page.locator('textarea').first().fill('길게 작성한 일기 내용 '.repeat(30))
        await page.locator('textarea').first().blur()
      }
      if (name === 'distance') {
        await page.context().grantPermissions(['geolocation'])
        await page.context().setGeolocation({ latitude: 37.5, longitude: 127.0, accuracy: 3 })
        await page.locator('#distance-name').fill('산책 측정')
        await page.getByRole('button', { name: '시작하기', exact: true }).click()
        await page.getByRole('button', { name: '거리 저장', exact: true }).click()
      }
      await expect(page.getByRole('dialog', { name: label, exact: true }).locator('.sheet-panel')).toBeVisible()
    },
  })),
  { path: '/record', name: 'habit-create-1', action: async (page) => {
    await mountOverlay(page, 'record/HabitCreateSheet', { open: true, friends, busy: false })
    await expect(page.getByRole('dialog', { name: '습관 기록 생성', exact: true }).locator('.sheet-panel')).toBeVisible()
  } },
  { path: '/calendar', name: 'calendar-date-sheet', action: async (page) => {
    await page.getByRole('button', { name: /^15일/ }).click()
    await expect(page.getByRole('dialog', { name: '날짜 기록', exact: true }).locator('.sheet-panel')).toBeVisible()
  } },
  { path: '/profile', name: 'notices', action: async (page) => {
    await mountOverlay(page, 'profile/NoticesDialog', { open: true })
    await expect(page.locator('[role="dialog"][aria-labelledby="notices-title"] > div')).toBeVisible()
    await expect(page.getByText('긴 공지 제목 '.repeat(10).trim()).first()).toBeVisible()
  } },
]

test('밀집 화면 매트릭스와 상태의 기하를 검사하고 후보를 첨부한다', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(1_200_000)
  mkdirSync(output, { recursive: true })
  const results: Array<{ name: string, path: string, width: number, scheme: string, file: string,
    geometry: Awaited<ReturnType<typeof measure>>, pageErrors: string[], consoleErrors: ConsoleError[], allowedErrors: ConsoleError[] }> = []
  const failures: Array<{ name: string, error: string }> = []
  const controls: Record<string, unknown> = {}
  const persist = () => writeFileSync(join(output, 'geometry.json'), JSON.stringify({ results, failures, controls }, null, 2))
  // 양성 대조군과 경계 접촉 음성 대조군으로 순수 함수가 실제 교차를 구분함을 검증한다.
  const syntheticOverlap = intersection({ x: 0, y: 0, width: 100, height: 100 }, { x: 50, y: 40, width: 100, height: 100 })
  expect(syntheticOverlap).toEqual({ width: 50, height: 60 })
  expect(intersection({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 })).toBeNull()
  controls.syntheticOverlap = syntheticOverlap
  // 허용목록이 캡처 경계와 메시지 순서를 넘어 독립 오류를 숨기지 않는지 확인한다.
  const hydration = { text: 'Hydration completed but contains mismatches.', url: '' }
  const slice = { text: "Cannot read properties of undefined (reading 'slice')", url: '' }
  expect(allowedConsoleError('/calendar', slice, [])).toBe(false)
  expect(allowedConsoleError('/calendar', slice, [hydration])).toBe(true)
  expect(allowedConsoleError('/', slice, [hydration])).toBe(false)
  expect(allowedConsoleError(missingPath, { text: `Framing 'https://unexpected.example' violates the following Content Security Policy directive: "frame-src 'self'". The request has been blocked.`, url: `http://localhost:3000${missingPath}` }, [])).toBe(false)
  expect(allowedConsoleError(missingPath, { text: 'localStorage: unrelated Access is denied', url: '' }, [])).toBe(false)
  persist()
  const matrix = [
    ...[320, 393, 430].flatMap(width => routes.map(scenario => ({ scenario, width, scheme: 'light' as const }))),
    ...routes.map(scenario => ({ scenario, width: 393, scheme: 'dark' as const })),
    ...states.map(scenario => ({ scenario, width: 393, scheme: 'light' as const })),
  ]
  for (const { scenario, width, scheme } of matrix) {
    const name = `${scenario.name}__${width}__${scheme}`
    await test.step(name, async () => {
      const context = await browser.newContext({
        ...devices['Pixel 5'], baseURL, viewport: { width, height: 852 }, colorScheme: scheme,
        locale: 'ko-KR', timezoneId: 'Asia/Seoul', serviceWorkers: 'block',
      })
      const pageErrors: string[] = []
      const consoleErrors: ConsoleError[] = []
      try {
        await installDenseData(context, { baseURL: baseURL!, scheme, signedOut: scenario.path === '/auth/login', onboarding: scenario.onboarding })
        const page = await context.newPage()
        page.setDefaultTimeout(10_000)
        page.setDefaultNavigationTimeout(30_000)
        page.on('pageerror', error => pageErrors.push(error.message))
        page.on('console', (message) => {
          if (message.type() === 'error') consoleErrors.push({ text: message.text(), url: message.location().url })
        })
        if (scenario.path === '/calendar') await page.clock.install({ time: new Date(calendarTime) })
        // 공유 페이지의 SSR이 실백엔드를 부르므로 로컬 안내 페이지에서 hydration 후 라우터로 이동한다.
        await page.goto(scenario.path.startsWith('/share/') ? '/legal/guide' : scenario.path, { waitUntil: 'domcontentloaded' })
        await expect.poll(() => page.evaluate(() => {
          const app = Reflect.get(document.getElementById('__nuxt') ?? {}, '__vue_app__')?.$nuxt
          return Boolean(app && !app.isHydrating)
        }), { timeout: 20_000 }).toBe(true)
        if (scenario.path.startsWith('/share/')) {
          await page.evaluate(path => Reflect.get(document.getElementById('__nuxt')!, '__vue_app__').$nuxt.$router.push(path), scenario.path)
        }
        await ready(page)
        if (scenario.path === '/calendar') await expect(page.getByTestId('calendar-days-grid')).toBeVisible()
        await scenario.action?.(page)
        await ready(page)
        const file = `${name}.png`
        await page.screenshot({ path: join(output, file), animations: 'disabled', fullPage: false })
        const geometry = await measure(page)
        const allowedErrors = consoleErrors.filter((error, index) => allowedConsoleError(scenario.path, error, consoleErrors.slice(0, index)))
        results.push({ name, path: scenario.path, width, scheme, file, geometry, pageErrors, consoleErrors, allowedErrors })
        persist()
        await testInfo.attach(`hit-area-candidates-${name}`, { body: JSON.stringify(geometry.small, null, 2), contentType: 'application/json' })
        await testInfo.attach(`clip-candidates-${name}`, { body: JSON.stringify(geometry.clip, null, 2), contentType: 'application/json' })
        expect.soft(geometry.overflow.violated, `${name}: 문서 가로 오버플로`).toBe(false)
        expect.soft(geometry.wrap, `${name}: 단일행 요소의 줄바꿈`).toEqual([])
        expect.soft(geometry.overlaps, `${name}: 다이얼로그·토스트 교차`).toEqual([])
        if (name === 'home__393__light') {
          const label = page.locator('nav a > span:last-child').filter({ hasText: '키우기' })
          await expect(label).toBeVisible()
          const original = await label.getAttribute('style')
          try {
            await label.evaluate((element) => {
              const style = (element as HTMLElement).style
              style.whiteSpace = 'normal'
              style.width = '1px'
            })
            const mutated = (await measure(page)).wrap.filter(entry => entry.text === '키우기')
            expect(mutated, '라벨 폭 1px 돌연변이에서 텍스트 줄바꿈을 검출한다').toHaveLength(1)
            expect(mutated[0]!.rows.length).toBeGreaterThan(1)
            controls.wrapMutation = mutated
          }
          finally {
            await label.evaluate((element, original) => {
              if (original === null) element.removeAttribute('style')
              else element.setAttribute('style', original)
            }, original)
          }
          expect((await measure(page)).wrap, '돌연변이 원복 뒤 줄바꿈 0').toEqual([])
          const visit = geometry.small.filter(entry => entry.selector.startsWith('[data-testid="home-visit-'))
          expect(visit.length, '놀러가기 버튼 대조군이 존재한다').toBeGreaterThan(0)
          expect(visit.every(entry => !entry.severe && entry.hitArea.width >= 44 && entry.hitArea.height >= 44)).toBe(true)
          controls.visitHitArea = visit
        }
        if (name === 'invite-modal__393__light') {
          await context.grantPermissions(['clipboard-read', 'clipboard-write'])
          await page.getByTestId('invite-copy').click()
          await expect(page.locator('[data-toast-id]').filter({ hasText: '초대코드를 복사했어요' })).toBeVisible()
          // 토스트 진입 모션을 끝낸 동일 측정에서 두 대상 존재와 비교차를 함께 확인한다.
          await ready(page)
          const separated = await measure(page)
          expect(separated.dialogPanels).toHaveLength(1)
          expect(separated.toastPanels).toHaveLength(1)
          expect(separated.overlaps).toEqual([])
          controls.separatedToast = { dialogs: separated.dialogPanels, toasts: separated.toastPanels, overlaps: separated.overlaps }
        }
      }
      catch (error) {
        // 캡처 실패도 기록하고 실패시킨다. 뒤의 화면을 계속 수집하되 SKIP으로 숨기지 않는다.
        failures.push({ name, error: String(error) })
        expect.soft(String(error), `${name}: 화면 준비 또는 캡처 실패`).toBe('')
      }
      finally {
        await context.close()
        expect.soft(pageErrors, `${name}: pageerror는 예외 없이 0건`).toEqual([])
        expect.soft(consoleErrors.filter((error, index) => !allowedConsoleError(scenario.path, error, consoleErrors.slice(0, index))), `${name}: 허용목록 밖 console.error`).toEqual([])
        persist()
      }
    })
  }
  const candidates = results.flatMap(result => result.geometry.small.map(candidate => ({ capture: result.name, ...candidate })))
  const clips = results.flatMap(result => result.geometry.clip.map(candidate => ({ capture: result.name, ...candidate })))
  writeFileSync(join(output, 'hit-area-candidates.json'), JSON.stringify(candidates, null, 2))
  writeFileSync(join(output, 'clip-candidates.json'), JSON.stringify(clips, null, 2))
  await testInfo.attach('hit-area-candidates', { body: JSON.stringify(candidates, null, 2), contentType: 'application/json' })
  await testInfo.attach('clip-candidates', { body: JSON.stringify(clips, null, 2), contentType: 'application/json' })
  expect.soft(results.length, '모든 기본 화면 60개와 상태 화면 14개를 캡처한다').toBe(74)
  // 후보 자체는 실패 조건이 아니다. 알려진 대조군 세 종류로 검출기의 회귀만 확인한다.
  expect.soft(candidates.some(candidate => candidate.selector.startsWith('button.aspect-square') && candidate.text.startsWith('1일')), '캘린더 날짜 대조군').toBe(true)
  expect.soft(candidates.some(candidate => candidate.selector === '[data-testid="grow-hero-sparkle-chip"]'), '키우기 칩 대조군').toBe(true)
  expect.soft(candidates.some(candidate => candidate.selector.includes('.w-6.h-11') && /슬라이드/.test(candidate.text)), '캐러셀 도트 대조군').toBe(true)
  const calendar = candidates.filter(candidate => candidate.capture === 'calendar__393__light'
    && candidate.selector.startsWith('button.aspect-square') && candidate.hitArea.height >= 27 && candidate.hitArea.height < 44)
  expect.soft(calendar.length, '27~43px 캘린더 날짜는 후보로 남는다').toBeGreaterThan(0)
  controls.calendarHitArea = calendar
  expect.soft(Object.keys(controls).sort(), '대조군 4종과 캘린더 회귀 증거를 모두 남긴다')
    .toEqual(['calendarHitArea', 'separatedToast', 'syntheticOverlap', 'visitHitArea', 'wrapMutation'])
  persist()
  await testInfo.attach('geometry', { path: join(output, 'geometry.json'), contentType: 'application/json' })
})
