import { expect, test, type Browser, type Page, type ViewportSize } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const currency = {
  balances: ['COIN', 'RUBY', 'SPARKLE', 'DEW', 'SUN', 'BOLT', 'WIND']
    .map((code, index) => ({ code, amount: 1000 - index * 100 })),
}

const user = {
  userId: 'layout-user',
  email: 'layout@example.com',
  nickname: '레이아웃 유저',
  role: 'USER',
  currency,
  ownedItems: [],
  placedItems: [],
  entitlements: { freePlacement: false, premiumThemes: false },
}

const itemSlugs = ['dischidia', 'humata-fern', 'nandina', 'pilea-peperomioides', 'pteris', 'scindapsus']
const items = Array.from({ length: 60 }, (_, index) => ({
  id: index + 1,
  slug: itemSlugs[index % itemSlugs.length],
  name: `테스트 식물 ${index + 1}`,
  description: '레이아웃 픽스처',
  categoryId: 1,
  categoryName: '식물',
  priceType: 'BASIC',
  priceAmount: 100 + index * 10,
  tokenPrice: null,
  rarity: 'COMMON',
  assetUrl: `/items/${itemSlugs[index % itemSlugs.length]}.png`,
  layout: 'FOREGROUND',
  isAnimated: false,
  isActive: true,
  purchasable: true,
}))

const friends = [1, 2, 3].map(index => ({
  userId: `friend-${index}`,
  nickname: `친구 ${index}`,
  likeCount: index,
  liked: false,
}))

const activeGrowth = {
  speciesCode: 'cat',
  kind: 'SPIRIT',
  nameKo: '고양이 정령',
  currentStage: 3,
  stageLabel: '고양이 정령 2단계',
  effectiveProgress: 20,
  stampCount: 20,
  goal: 30,
  dormant: false,
  cycleId: 'cat:layout',
  cycleState: 'ACTIVE',
  stages: [
    { stage: 1, threshold: 1, label: '수수께끼 정령' },
    { stage: 2, threshold: 10, label: '고양이 정령 1단계' },
    { stage: 3, threshold: 20, label: '고양이 정령 2단계' },
  ],
  lostAt: null,
  completedAt: null,
  reviveRubyCost: 10,
  reviveSnoozedUntil: null,
  completedToday: false,
  notifyNext: false,
}

const terrarium = {
  terrariumId: 1,
  background: { id: 1, name: '기본 배경', assetUrl: '' },
  placedItems: [],
  maxSlots: 10,
  tier: 'GLASS_JAR',
  activeTier: 'GLASS_JAR',
  highestUnlockedTier: 'GLASS_JAR',
  wilting: { stage: 0, daysSinceRecord: 0 },
  freePlacements: [],
}

const tiers = ['GLASS_JAR', 'LARGE_JAR', 'GRAND_TANK'].map((tier, index) => ({
  tier,
  tierOrder: index + 1,
  level: index + 1,
  nameKo: `Lv.${index + 1}`,
  descriptionKo: '레이아웃 픽스처',
  sparkleCost: 0,
  rubyCost: index * 30,
  slots: (index + 1) * 10,
  spiritCode: null,
  unlocked: index === 0,
  active: index === 0,
  previewAssetUrl: null,
}))

const attendance = {
  today: false,
  streak: 0,
  longestStreak: 0,
  rewardBasicCoins: 10,
  bonusEligible: false,
  serverDateKst: '2026-09-02',
  cycleStartDateKst: null,
  cycleDay: 1,
  board: [1, 2, 3, 4, 5, 6, 7].map(day => ({ day, rewardBasicCoins: day * 10, claimed: false, claimedAt: null })),
  cycleBonusRuby: 5,
  cycleBonusClaimed: false,
}

const categories = ['산책', '독서', '러닝', '낙서'].map((name, index) => ({
  id: index + 1,
  name,
  iconUrl: null,
  color: '#A1CCDB',
  tokenName: ['이슬', '햇살', '번개', '바람'][index],
  emoji: ['🚶', '📚', '🏃', '✏️'][index],
  baseCoinReward: 10,
  baseTokenReward: 1,
  dailyLimit: 10,
  isCustom: false,
  ownerUserId: null,
}))

async function openFixturePage(
  browser: Browser,
  path: string,
  viewport: ViewportSize = { width: 430, height: 900 },
  options: { growthItems?: Array<Record<string, unknown>>, delayMs?: number, clockTime?: string } = {},
) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Seoul',
  })
  await context.addCookies([{
    name: 'tw.session_token',
    value: 'layout-fixture-session',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  }])
  await context.addInitScript(() => {
    localStorage.setItem('tw-onboarding-done', 'true')
    localStorage.setItem('tw-home-friends-open', '1')
    localStorage.setItem('tw-home-wallet-open', '1')
  })

  const seenPaths = new Set<string>()
  let releaseGate!: () => void
  const responseGate = new Promise<void>((resolve) => { releaseGate = resolve })
  let responsesReleased = false
  const releaseResponses = () => {
    if (responsesReleased) return
    responsesReleased = true
    releaseGate()
  }
  await context.route('**/api/auth/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (path === '/auth/login') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
      return
    }
    if (pathname.endsWith('/token')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'layout-fixture-jwt' }) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session: { id: 'layout-session', userId: user.userId, expiresAt: '2099-01-01T00:00:00.000Z' },
        user: { id: user.userId, email: user.email, name: user.nickname },
      }),
    })
  })
  await context.route('**/notices.json', async (route) => {
    await Promise.all([
      new Promise(resolve => setTimeout(resolve, options.delayMs ?? 0)),
      responseGate,
    ])
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, title: '정령이 추가 되었어요', body: '도마뱀정령이 추가 되었어요', date: '2026-08-10' }]),
    })
  })
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname.replace(/^\/api\/v1/, '')
    const corsHeaders = {
      'access-control-allow-origin': 'http://localhost:3000',
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type,x-tw-retried',
    }
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
      return
    }

    seenPaths.add(pathname)
    await Promise.all([
      new Promise(resolve => setTimeout(resolve, options.delayMs ?? 0)),
      responseGate,
    ])

    let body: unknown = {}
    if (pathname === '/users/me') body = user
    else if (pathname === '/items') body = { items }
    else if (pathname === '/terrarium/free-placement') body = { items: [] }
    else if (pathname === '/terrarium/tiers') {
      body = { currentTier: 'GLASS_JAR', activeTier: 'GLASS_JAR', highestUnlockedTier: 'GLASS_JAR', tiers }
    }
    else if (pathname === '/terrarium') body = terrarium
    else if (pathname === '/social/friends') body = friends
    else if (pathname === '/growth') body = { items: options.growthItems ?? [activeGrowth] }
    else if (pathname === '/records/statistics') {
      body = { todayRecords: 1, thisWeekRecords: 4, totalRecords: 12, byCategory: [] }
    }
    else if (pathname === '/records') body = { content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 }
    else if (pathname === '/categories') body = { categories }
    else if (pathname === '/habits') {
      body = {
        trackers: [{
          id: 1,
          title: '매일 물 마시기',
          currentStreakDays: 2,
          cycleLengthDays: 7,
          completedCycles: 0,
          status: 'ACTIVE',
          lastCheckedDate: '2026-09-01',
          friendLinked: false,
          friendUserId: null,
          friendNickname: null,
          partnerActive: null,
          partnerStatus: 'NONE',
          partnerCheckedToday: false,
          checkedDays: [1, 2],
        }],
      }
    }
    else if (pathname === '/rewards/attendance') body = attendance
    else if (pathname === '/notifications/unread-count') body = { count: 0 }
    else if (pathname === '/notifications') body = { content: Array.from({ length: new URL(request.url()).searchParams.get('page') === '1' ? 1 : 20 }, (_, i) => ({ id: Number(new URL(request.url()).searchParams.get('page') ?? 0) * 20 + i, title: `알림 ${i}`, body: '알림 본문', createdAt: '2026-09-08T00:00:00Z' })) }
    else if (pathname === '/exchange/rates') body = { rates: [] }

    await route.fulfill({
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  })

  releaseResponses()
  const page = await context.newPage()
  if (options.clockTime) await page.clock.install({ time: new Date(options.clockTime) })
  const requestedUrls: string[] = []
  const pageErrors: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') requestedUrls.push(request.url())
  })
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text())
  })
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect.poll(() => page.evaluate(() => {
    const app = Reflect.get(document.getElementById('__nuxt') ?? {}, '__vue_app__')?.$nuxt
    return Boolean(app && !app.isHydrating)
  }), { timeout: 15000 }).toBe(true)

  return { context, page, seenPaths, requestedUrls, pageErrors, releaseResponses }
}

async function box(page: Page, selector: string) {
  const value = await page.locator(selector).first().boundingBox()
  expect(value, `${selector} bounding box`).not.toBeNull()
  return value!
}


const captures = process.env.SAFE_AREA_CAPTURES
const insets = [[0, 0, 0, 0], [47, 34, 0, 0], [47, 0, 0, 0], [0, 34, 0, 0], [0, 0, 47, 0], [0, 0, 0, 47]]

async function inject(page: Page, values: number[]) {
  await page.evaluate((values) => {
    for (const [i, key] of ['--sat', '--sab', '--sal', '--sar'].entries()) document.documentElement.style.setProperty(key, `${values[i]}px`)
  }, values)
  await page.addStyleTag({ content: 'nuxt-error-overlay, nuxt-devtools-frame, nuxt-devtools-anchor, #nuxt-devtools-container { display: none !important; }' })
}

async function scroll(page: Page, fraction: number) {
  return page.evaluate((f) => {
    const elements = [document.scrollingElement, ...document.querySelectorAll('main, .apjek-page-scroll')].filter(Boolean) as HTMLElement[]
    for (const el of elements) el.scrollTo({ top: (el.scrollHeight - el.clientHeight) * f, behavior: 'instant' })
    return elements.map(el => ({ tag: el.tagName, top: el.scrollTop, max: el.scrollHeight - el.clientHeight }))
  }, fraction)
}

// PNG 표본과 계산색은 반올림 오차가 있으므로 채널당 ±2 까지 같은 색으로 본다
// (토큰 간 차이는 이보다 훨씬 크다 — 예: riso-cream #FFF8EB vs surface #ffffff 는 B 채널 20).
function near(actual: number[], expected: number[], label: string) {
  for (const [i, channel] of expected.entries()) {
    expect(Math.abs((actual[i] ?? -999) - channel), `${label} ch${i}: ${actual.slice(0, 3)} vs ${expected}`).toBeLessThanOrEqual(2)
  }
}

// 스크림 검증 2축.
// (1) 칠해졌는가 — html 배경 위에 --apjek-scrim / --apjek-scrim-bottom 을 합성한 기대색과 비교.
// (2) compareBelow: 스크림 바로 아래 픽셀과 같은 색인가 — 검사 대상 밖(페이지 배경) 기준이라
//     "스크림 색을 스크림 색과 비교"하던 자기충족이 사라진다. 노치 색 띠가 바로 이 불일치다.
//     표본 x=4 는 페이지 좌우 패딩 안쪽이라 콘텐츠가 아니라 배경이 잡힌다.
//     스크롤 상단에서만 성립한다 — 스크롤하면 콘텐츠가 스크림 아래로 지나가는 것이 정상 동작이다.
async function scrim(page: Page, values: number[], compareBelow: Array<'top' | 'bottom'> = []) {
  expect(await page.evaluate(() => [getComputedStyle(document.documentElement, '::before').height, getComputedStyle(document.documentElement, '::after').height])).toEqual([`${values[0]}px`, `${values[1]}px`])
  const png = await page.screenshot({ animations: 'disabled' })
  const samples = await page.evaluate(async ({ data, top, bottom }) => {
    const img = new Image()
    img.src = `data:image/png;base64,${data}`
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.width; canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const at = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data]
    const output: { edge: 'top' | 'bottom', scrim: number[], below: number[] }[] = []
    if (top) output.push({ edge: 'top', scrim: at(4, 2), below: at(4, top + 2) })
    if (bottom) output.push({ edge: 'bottom', scrim: at(4, img.height - 3), below: at(4, img.height - bottom - 3) })
    return output
  }, { data: png.toString('base64'), top: values[0], bottom: values[1] })
  const expected = await page.evaluate(() => {
    const parse = (value: string) => value.match(/[\d.]+/g)!.map(Number)
    const probe = document.createElement('span')
    document.body.append(probe)
    const read = (value: string) => {
      probe.style.color = value
      return parse(getComputedStyle(probe).color)
    }
    const scrimTop = read('var(--apjek-scrim)')
    const scrimBottom = read('var(--apjek-scrim-bottom)')
    probe.remove()
    // 반투명 토큰(다크 blue-soft 등)은 문서 배경 위에 합성된 결과가 화면에 찍힌다.
    const base = parse(getComputedStyle(document.documentElement).backgroundColor)
    const over = (color: number[]) => {
      const alpha = color[3] ?? 1
      return [0, 1, 2].map(i => Math.round(color[i]! * alpha + base[i]! * (1 - alpha)))
    }
    return { top: over(scrimTop), bottom: over(scrimBottom) }
  })
  for (const sample of samples) {
    near(sample.scrim, expected[sample.edge], `scrim ${sample.edge} painted`)
    if (compareBelow.includes(sample.edge)) near(sample.scrim, sample.below.slice(0, 3), `scrim ${sample.edge} vs page below`)
  }
  return png
}

for (const viewport of [{ width: 393, height: 851 }, { width: 320, height: 640 }, { width: 851, height: 393 }, { width: 1280, height: 900 }]) {
  test(`P-SAFE shop ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    test.setTimeout(120_000)
    const { page, context } = await openFixturePage(browser, '/shop', viewport)
    try {
      await expect(page.locator('[data-testid="shop-page"]')).toBeVisible()
      await expect(page.getByText('테스트 식물 60', { exact: true })).toBeVisible()
      for (const values of insets) {
        await inject(page, values)
        for (const fraction of [0, 0.5, 1, 0.25]) {
          await scroll(page, fraction)
          await page.waitForTimeout(30)
          const tab = await box(page, '.sticky')
          expect(tab.y).toBeGreaterThanOrEqual(values[0]! - 1)
          const nav = await box(page, 'nav')
          expect(nav.y + nav.height).toBeCloseTo(viewport.height, 0)
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
          for (const link of await page.locator('nav a').all()) {
            const rect = (await link.boundingBox())!
            expect(rect.x).toBeGreaterThanOrEqual(values[2]! - 1)
            expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width - values[3]! + 1)
          }
          await scrim(page, values)
        }
      }
      await page.locator('nav a[href="/shop"]').click()
      expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0)
    }
    finally { await context.close() }
  })
}

test('AC7 real dev routes Pixel 5 inset 47/34 captures', async ({ browser }) => {
  test.setTimeout(180_000)
  const rows: unknown[] = []
  if (captures) await mkdir(captures, { recursive: true })
  for (const path of ['/shop', '/', '/record', '/grow', '/profile', '/calendar', '/auth/login', '/legal/guide', '/legal/terms', '/legal/privacy', '/share/safe-area-fixture', '/safe-area-forced-error']) {
    const { page, context } = await openFixturePage(browser, path, { width: 393, height: 851 })
    try {
      expect(new URL(page.url()).pathname).toBe(path)
      const skeletons: Record<string, string> = { '/': 'home-layout-skeleton', '/grow': 'grow-content-skeleton', '/calendar': 'calendar-layout-skeleton', '/profile': 'profile-layout-skeleton', '/shop': 'shop-layout-skeleton', '/record': 'record-habit-skeleton' }
      if (skeletons[path]) await expect(page.getByTestId(skeletons[path]!)).toBeHidden({ timeout: 10000 })
      if (path === '/shop') await expect(page.getByText('테스트 식물 60', { exact: true })).toBeVisible()
      if (path === '/grow') await expect(page.getByTestId('grow-stage-label')).toBeVisible()
      if (path === '/') await expect(page.locator('[data-testid^="home-visit-"]')).toHaveCount(3)
      if (path === '/profile') await expect(page.getByTestId('profile-friend-row')).toHaveCount(3)
      await inject(page, [47, 34, 0, 0])
      for (const [name, fraction] of path === '/shop' ? [['top', 0], ['middle', 0.5], ['bottom', 1]] as const : [['top', 0], ['bottom', 1]] as const) {
        const scrollers = await scroll(page, fraction)
        await page.waitForTimeout(60)
        // 라우트 순회에서는 "스크림 색 == 바로 아래 페이지 배경" 까지 본다(F3 자기충족 제거).
        // 스크롤 상단에서만 비교한다(스크롤 뒤에는 콘텐츠가 스크림 아래를 지나가는 것이 정상).
        // 제외 2건 — /auth/login 하단: 배경이 135° 대각 그라디언트라 단색 스크림과 정합 불가.
        //            /grow 상단: 세이프에어리어 바로 아래가 히어로 비트맵 첫 행이라 단색과 비교 불가
        //            (스크림 자리에 깔리는 색은 그 div 의 바탕색 #f5f9fc 이며 그것과는 일치한다).
        const png = await scrim(page, [47, 34, 0, 0], name !== 'top'
          ? []
          : path === '/auth/login' ? ['top'] : path === '/grow' ? ['bottom'] : ['top', 'bottom'])
        if (path === '/shop') expect((await box(page, '.sticky')).y).toBeGreaterThanOrEqual(47)
        const file = `${path === '/' ? 'home' : path.slice(1).replaceAll('/', '-')}-${name}.png`
        if (captures) await writeFile(join(captures, file), png)
        rows.push({ path, state: name, file, scrollers, scrim: 'PASS', actualPath: new URL(page.url()).pathname,
          fixed: await page.locator('nav, .sticky').evaluateAll(els => els.map(el => ({ tag: el.tagName, top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom }))) })
      }
    }
    finally { await context.close() }
  }
  if (captures) await writeFile(join(captures, 'ac7-results.json'), JSON.stringify(rows, null, 2))
})

// dev 서버가 변환한 실제 SFC를 동일 Nuxt 앱 context로 마운트한다. 제품용 harness/라우트는 추가하지 않는다.
async function mountOverlay(page: Page, name: string, props: Record<string, unknown>, long = false) {
  await page.evaluate(async ({ name, props, long }) => {
    const resources = performance.getEntriesByType('resource').map(r => r.name)
    const vue = await import(resources.find(url => url.includes('/vue/dist/vue.runtime'))!)
    const app = Reflect.get(document.getElementById('__nuxt')!, '__vue_app__').$nuxt
    const component = await import(`/_nuxt/components/${name}.vue`)
    const host = document.createElement('div')
    document.body.append(host)
    const vnode = vue.h(component.default, props, long ? { default: () => [
      ...Array.from({ length: 30 }, (_, i) => vue.h('p', { style: 'padding: 12px' }, `긴 콘텐츠 ${i}`)),
      vue.h('button', { style: 'height:44px', 'data-testid': 'safe-last-cta' }, '마지막 조작'),
    ] } : undefined)
    vnode.appContext = app.vueApp._context
    app.runWithContext(() => vue.render(vnode, host))
    await vue.nextTick()
    if (name === 'common/AppUpdateGate') vnode.component.devtoolsRawSetupState.updateRequired.value = true
    ;(window as unknown as { safeAreaUnmount: () => void }).safeAreaUnmount = () => { vue.render(null, host); host.remove() }
  }, { name, props, long })
  await page.waitForTimeout(320)
}

const overlayCases = [
  { name: 'terrarium/HomeDialog', props: { open: true, title: '안전영역 다이얼로그' }, long: true, panel: '[role="dialog"] .relative' },
  { name: 'common/BottomSheet', props: { open: true, ariaLabel: '안전영역 시트' }, long: true, panel: '.sheet-panel' },
  { name: 'common/Modal', props: { modelValue: true, title: '안전영역 모달' }, long: true, panel: '[data-testid="modal-card"]' },
  { name: 'common/Onboarding', props: { show: true }, panel: '[data-testid="onboarding-root"] > div' },
  { name: 'common/AppUpdateGate', props: {}, panel: '[role="alertdialog"]' },
  { name: 'notifications/Center', props: { open: true }, panel: '[data-testid="notifications-panel"]' },
  { name: 'profile/NoticesDialog', props: { open: true }, panel: '[aria-labelledby="notices-title"] > div' },
  { name: 'shop/ExchangeDialog', props: { modelValue: true, balances: currency.balances }, panel: '[aria-label="재화 환전"] > div' },
  { name: 'record/ConfirmDialog', props: { open: true, title: '확인', message: '작업을 취소할까요?', confirmText: '확인' }, panel: '[aria-label="확인"]' },
  { name: 'grow/GrowLostModal', props: { open: true, ruby: 100, rubyCost: 10 }, panel: '[aria-labelledby="grow-lost-title"] > div' },
]

for (const viewport of [{ width: 393, height: 851 }, { width: 320, height: 640 }, { width: 851, height: 393 }, { width: 1280, height: 900 }]) {
  test(`P-SAFE overlays ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    test.setTimeout(180_000)
    const { page, context } = await openFixturePage(browser, '/legal/guide', viewport)
    await page.waitForTimeout(1500)
    try {
      for (const values of insets) {
        await inject(page, values)
        for (const scenario of overlayCases) {
          await mountOverlay(page, scenario.name, scenario.props, scenario.long)
          const panel = page.locator(scenario.panel).last()
          await expect(panel).toBeVisible()
          const fullSurface = ['common/AppUpdateGate', 'notifications/Center'].includes(scenario.name)
          const rect = (await panel.boundingBox())!
          if (!fullSurface) expect(rect.y, scenario.name).toBeGreaterThanOrEqual(values[0]! - 1)
          const cta = scenario.long ? page.getByTestId('safe-last-cta') : panel.locator('button').last()
          if (await cta.count()) {
            await cta.scrollIntoViewIfNeeded()
            const target = (await cta.boundingBox())!
            expect(target.y, scenario.name).toBeGreaterThanOrEqual(values[0]! - 1)
            expect(target.y + target.height, scenario.name).toBeLessThanOrEqual(viewport.height - values[1]! + 1)
            expect(target.x, scenario.name).toBeGreaterThanOrEqual(values[2]! - 1)
            expect(target.x + target.width, scenario.name).toBeLessThanOrEqual(viewport.width - values[3]! + 1)
          }
          await scrim(page, values)
          await page.evaluate(() => (window as unknown as { safeAreaUnmount: () => void }).safeAreaUnmount())
        }
      }
    }
    finally { await context.close() }
  })
}

test('P-FLOW notification pagination, ranking keyboard and concurrent alert slots', async ({ browser }) => {
  test.setTimeout(90_000)
  const { page, context } = await openFixturePage(browser, '/legal/guide', { width: 393, height: 851 })
  await page.waitForTimeout(1500)
  try {
    await inject(page, [47, 34, 0, 0])
    await mountOverlay(page, 'notifications/Center', { open: true })
    await expect(page.locator('[data-testid^="notification-row-"]')).toHaveCount(20)
    await page.getByRole('button', { name: '더 보기', exact: true }).click()
    await expect(page.locator('[data-testid^="notification-row-"]')).toHaveCount(21)
    await expect(page.getByText('모든 알림을 확인했어요')).toBeVisible()
    await page.evaluate(() => (window as unknown as { safeAreaUnmount: () => void }).safeAreaUnmount())
    await mountOverlay(page, 'terrarium/RankingModal', { open: true, nickname: '테스트' })
    await page.getByRole('tab', { name: '전체 랭킹' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: '친구 랭킹' })).toHaveAttribute('tabindex', '0')
    await expect(page.getByRole('tab', { name: '친구 랭킹' })).toBeFocused()
    await page.keyboard.press('Home')
    await expect(page.getByRole('tab', { name: '전체 랭킹' })).toBeFocused()
    await page.evaluate(() => (window as unknown as { safeAreaUnmount: () => void }).safeAreaUnmount())
    await mountOverlay(page, 'record/RecordCompleteToast', { open: true, kind: 'dew', count: 1 })
    await page.evaluate(async () => {
      window.dispatchEvent(new Event('offline'))
      const { useToast } = await import('/_nuxt/composables/useToast.ts')
      Reflect.get(document.getElementById('__nuxt')!, '__vue_app__').$nuxt.runWithContext(() => {
        const toast = useToast()
        for (let i = 0; i < 6; i++) toast.show({ title: `알림 ${i}`, description: '긴 토스트 안내', actionLabel: '보기', duration: 30000 })
      })
    })
    await expect(page.locator('[data-toast-id]')).toHaveCount(1)
    const toast = await box(page, '[role="status"]:has(> [data-toast-id])')
    const record = await box(page, '[aria-live="polite"].max-w-sm')
    const offline = await box(page, '[aria-live="polite"].bg-apjek-cta')
    expect(record.y).toBeGreaterThanOrEqual(offline.y + offline.height)
    expect(toast.y).toBeGreaterThanOrEqual(record.y + record.height)
    expect(toast.y + toast.height).toBeLessThanOrEqual(851 - 34)
    await scrim(page, [47, 34, 0, 0])
  }
  finally { await context.close() }
})

// 오버레이가 열린 동안 layout:false 페이지의 자체 스크롤러(.apjek-page-scroll)도 잠기는지 —
// 소스 문자열 검사가 아니라 실제 휠 입력으로 확인한다.
test('P-FLOW overlay locks apjek-page-scroll on login', async ({ browser }) => {
  const { page, context } = await openFixturePage(browser, '/auth/login', { width: 320, height: 480 })
  try {
    await inject(page, [47, 34, 0, 0])
    const scroller = page.locator('.apjek-page-scroll').first()
    // 대조군 — 잠금 전에는 실제로 스크롤된다(잠금 검증이 공허하지 않음을 보인다).
    await scroller.evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'instant' }))
    expect(await scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
    await scroller.evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }))

    await mountOverlay(page, 'common/AppUpdateGate', {})
    await expect(page.locator('[role="alertdialog"]')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.classList.contains('scroll-locked'))).toBe(true)
    await page.mouse.move(160, 240)
    await page.mouse.wheel(0, 800)
    await page.waitForTimeout(120)
    expect(await scroller.evaluate(el => el.scrollTop)).toBe(0)
    await page.evaluate(() => (window as unknown as { safeAreaUnmount: () => void }).safeAreaUnmount())
  }
  finally { await context.close() }
})

test('P-FLOW notices retry and light/dark surface metadata', async ({ browser }) => {
  const { page, context } = await openFixturePage(browser, '/legal/guide', { width: 393, height: 851 })
  await page.waitForTimeout(1500)
  try {
    let fail = true
    await page.route('**/notices.json', route => route.fulfill({ status: fail ? 503 : 200, contentType: 'application/json', body: fail ? '{}' : JSON.stringify([{ id: 1, title: '복구 공지', body: '내용', date: '2026-09-08' }]) }))
    await mountOverlay(page, 'profile/NoticesDialog', { open: true })
    await expect(page.getByText('공지사항을 불러오지 못했어요')).toBeVisible()
    fail = false
    await page.getByRole('button', { name: '다시 시도' }).click()
    await expect(page.getByText('복구 공지')).toBeVisible()
    await page.evaluate(() => (window as unknown as { safeAreaUnmount: () => void }).safeAreaUnmount())
    for (const mode of ['dark', 'light']) {
      await page.evaluate(async (mode) => {
        Reflect.get(document.getElementById('__nuxt')!, '__vue_app__').$nuxt.$colorMode.preference = mode
      }, mode)
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(mode)
      await expect.poll(() => page.evaluate(() => document.querySelector('meta[name="theme-color"]')?.getAttribute('content'))).toBe(mode === 'dark' ? '#262019' : '#ffffff')
      await inject(page, [47, 34, 0, 0])
      await scrim(page, [47, 34, 0, 0])
      expect(await page.locator('.nuxt-loading-indicator').evaluate(el => el.getBoundingClientRect().top)).toBe(47)
    }
  }
  finally { await context.close() }
})


test('P-SAFE remaining panels, large text and transparent hit targets', async ({ browser }) => {
  test.setTimeout(90_000)
  const { page, context } = await openFixturePage(browser, '/legal/guide', { width: 851, height: 393 })
  try {
    await inject(page, [47, 34, 47, 0])
    const guide = page.getByRole('button', { name: '닫기', exact: true })
    await guide.scrollIntoViewIfNeeded()
    expect(await guide.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2 - 21))
    })).toBe(true)
    await mountOverlay(page, 'terrarium/ManagePanel', { open: true, tab: 'items', tiles: [], busy: false, saving: false, placedCount: 0, maxSlots: 10, emptyCtaLabel: '상점으로' })
    const manage = page.getByTestId('manage-panel')
    expect((await manage.boundingBox())!.y).toBeGreaterThanOrEqual(47)
    const empty = page.getByRole('button', { name: '상점으로' })
    expect(await empty.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2 - 21))
    })).toBe(true)
    await page.evaluate(() => (window as unknown as { safeAreaUnmount: () => void }).safeAreaUnmount())
    await mountOverlay(page, 'friends/VisitModal', { open: true, friend: { nickname: '친구', userId: 'f', likeCount: 1 }, terrarium, liking: false })
    const visit = page.locator('[aria-labelledby="friend-visit-title"] > .relative')
    expect((await visit.boundingBox())!.y).toBeGreaterThanOrEqual(47)
    await visit.getByRole('button', { name: '닫기', exact: true }).last().scrollIntoViewIfNeeded()
    expect((await visit.boundingBox())!.y + (await visit.boundingBox())!.height).toBeLessThanOrEqual(359)
    await page.evaluate(() => (window as unknown as { safeAreaUnmount: () => void }).safeAreaUnmount())
    await mountOverlay(page, 'terrarium/ModeIntro', { open: true, title: '힐링 모드', description: '나의 테라리움을 감상해요', icon: '🌱', durationMs: 60000, level: 1 })
    expect((await box(page, '.mode-intro-jar')).y).toBeGreaterThanOrEqual(47)
    expect((await box(page, '.mode-intro-jar')).y + (await box(page, '.mode-intro-jar')).height).toBeLessThanOrEqual(359)
    await page.evaluate(() => (window as unknown as { safeAreaUnmount: () => void }).safeAreaUnmount())
    for (const name of ['common/Modal', 'common/Onboarding', 'common/AppUpdateGate']) {
      await mountOverlay(page, name, name === 'common/Modal' ? { modelValue: true, title: '확인' } : { show: true })
      await page.locator('[role="dialog"], [role="alertdialog"]').last().evaluate((root) => {
        const sizes = [...root.querySelectorAll<HTMLElement>('*')].map(el => [el, Number.parseFloat(getComputedStyle(el).fontSize)] as const)
        sizes.forEach(([el, size]) => { el.style.fontSize = `${size * 2}px` })
      })
      const last = page.locator('[role="dialog"] button, [role="alertdialog"] button').last()
      await last.scrollIntoViewIfNeeded()
      const rect = (await last.boundingBox())!
      expect(rect.y).toBeGreaterThanOrEqual(47)
      expect(rect.y + rect.height, name).toBeLessThanOrEqual(359)
      await page.evaluate(() => (window as unknown as { safeAreaUnmount: () => void }).safeAreaUnmount())
    }
    await page.goto('/safe-area-forced-error')
    await expect(page.locator('[data-error-kind]')).toBeVisible()
    await expect.poll(() => page.evaluate(() => Boolean(Reflect.get(document.getElementById('__nuxt') ?? {}, '__vue_app__')?.$nuxt))).toBe(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.locator('[data-error-kind] .apjek-cta')).toBeDisabled()
  }
  finally { await context.close() }
})
