import { expect, test, type Page, type BrowserContext } from '@playwright/test'

declare global {
  interface Window {
    gestureCaptures: number[]
    gestureReleases: number[]
    gestureEvents: Array<{ type: string; id: number; stage: boolean }>
  }
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const currency = { balances: ['COIN', 'RUBY', 'SPARKLE', 'DEW', 'SUN', 'BOLT', 'WIND'].map(code => ({ code, amount: 1000 })) }
const user = {
  userId: 'gesture-user', email: 'gesture@example.test', nickname: '터치 검증', role: 'USER', currency,
  ownedItems: [], placedItems: [], entitlements: { freePlacement: false, premiumThemes: false },
}
const tiers = ['GLASS_JAR', 'LARGE_JAR', 'GRAND_TANK'].map((tier, index) => ({
  tier, tierOrder: index + 1, level: index + 1, nameKo: `Lv.${index + 1}`, descriptionKo: '터치 검증',
  sparkleCost: 0, rubyCost: index * 30, slots: (index + 1) * 10, spiritCode: null,
  unlocked: index === 0, active: index === 0, previewAssetUrl: null,
}))
const responses: Record<string, unknown> = {
  '/users/me': user,
  '/items': { items: [] },
  '/terrarium/free-placement': { items: [] },
  '/terrarium/tiers': { currentTier: 'GLASS_JAR', activeTier: 'GLASS_JAR', highestUnlockedTier: 'GLASS_JAR', tiers },
  '/terrarium': {
    terrariumId: 1, background: { id: 1, name: '기본 배경', assetUrl: '' }, placedItems: [], maxSlots: 10,
    tier: 'GLASS_JAR', activeTier: 'GLASS_JAR', highestUnlockedTier: 'GLASS_JAR',
    wilting: { stage: 0, daysSinceRecord: 0 }, freePlacements: [],
  },
  '/social/friends': [1, 2, 3].map(index => ({ userId: `friend-${index}`, nickname: `친구 ${index}`, likeCount: 0, liked: false })),
  '/growth': { items: [] },
  '/rewards/attendance': {
    today: false, streak: 0, longestStreak: 0, rewardBasicCoins: 10, bonusEligible: false,
    serverDateKst: '2026-09-09', cycleStartDateKst: null, cycleDay: 1,
    board: [1, 2, 3, 4, 5, 6, 7].map(day => ({ day, rewardBasicCoins: 10, claimed: false, claimedAt: null })),
    cycleBonusRuby: 5, cycleBonusClaimed: false,
  },
  '/notifications/unread-count': { count: 0 },
}

async function openHome(context: BrowserContext, page: Page) {
  await context.addCookies([{ name: 'tw.session_token', value: 'gesture-fixture', domain: new URL(baseURL).hostname, path: '/', httpOnly: true, sameSite: 'Lax' }])
  await context.addInitScript(() => {
    localStorage.setItem('tw-onboarding-done', 'true')
    localStorage.setItem('tw-home-friends-open', '1')
    localStorage.setItem('tw-home-wallet-open', '1')
  })
  await context.route('**/api/auth/**', async (route) => {
    const body = new URL(route.request().url()).pathname.endsWith('/token')
      ? { token: 'gesture-fixture-jwt' }
      : { session: { id: 'gesture-session', userId: user.userId, expiresAt: '2099-01-01T00:00:00.000Z' }, user: { id: user.userId, email: user.email, name: user.nickname } }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  await context.route('**/notices.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname.replace(/^\/api\/v1/, '')
    await route.fulfill({
      status: request.method() === 'OPTIONS' ? 204 : 200,
      headers: {
        'access-control-allow-origin': baseURL, 'access-control-allow-credentials': 'true',
        'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization,content-type,x-tw-retried',
        'content-type': 'application/json',
      },
      body: request.method() === 'OPTIONS' ? '' : JSON.stringify(responses[pathname] ?? {}),
    })
  })
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  process.stdout.write('navigation start\n')
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  process.stdout.write('navigation done: ' + page.url() + '\n')
  return { context, page, pageErrors }
}

// 실제 페이지와 네이티브 터치 입력을 사용하고 API 응답만 로컬 픽스처로 대체한다.
test.use({ viewport: { width: 430, height: 780 } })

test('일반 모드에 하트가 없고 스크롤과 스와이프는 유지되며 휠과 핀치는 줌하지 않는다', async ({ context, page, browser }) => {
  test.setTimeout(90_000)
  const { pageErrors } = await openHome(context, page)
  const stage = page.locator('#my-terra-container')
  await stage.waitFor({ state: 'visible', timeout: 60000 }).catch(async (error) => {
    process.stdout.write(JSON.stringify({ url: page.url(), pageErrors, body: (await page.locator('body').innerText()).slice(0, 1200) }) + '\n')
    throw error
  })
  await page.waitForTimeout(1000)
  await page.evaluate(() => {
    const original = Element.prototype.setPointerCapture
    const captures: number[] = []
    Object.assign(window, { gestureCaptures: captures })
    Element.prototype.setPointerCapture = function (pointerId: number) {
      if (this.id === 'my-terra-container') captures.push(pointerId)
      return original.call(this, pointerId)
    }
  })
  const action = await stage.evaluate(el => getComputedStyle(el).touchAction)
  expect(action).toBe('pan-x pan-y')
  process.stdout.write('stage ready\n')
  await expect(page.getByTestId('home-heart')).toHaveCount(0)
  const canvas = stage.locator(':scope > div').first()
  const transformBeforeWheel = await canvas.evaluate(el => getComputedStyle(el).transform)
  await stage.hover()
  await page.mouse.wheel(0, -100)
  await page.waitForTimeout(300)
  expect(await canvas.evaluate(el => getComputedStyle(el).transform)).toBe(transformBeforeWheel)
  const cdp = await context.newCDPSession(page)
  async function swipe(x: number, y: number, dx: number, dy: number) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 12, y: y + dy * i / 12, id: 1 }] })
      await page.waitForTimeout(20)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(700)
  }
  const bounds = (await stage.boundingBox())!
  const beforeY = await page.evaluate(() => window.scrollY)
  await swipe(bounds.x + bounds.width / 2, Math.min(bounds.y + bounds.height * 0.7, 640), 0, -180)
  const afterY = await page.evaluate(() => window.scrollY)
  process.stdout.write(JSON.stringify({ beforeY, afterY }) + '\n')
  expect(afterY, `vertical scroll ${beforeY} -> ${afterY}`).toBeGreaterThan(beforeY + 20)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  const track = page.getByTestId('jar-carousel')
  const beforeX = await track.evaluate(el => el.scrollLeft)
  const swipeBounds = (await stage.boundingBox())!
  await swipe(swipeBounds.x + swipeBounds.width * 0.75, swipeBounds.y + 100, -270, 0)
  const afterX = await track.evaluate(el => el.scrollLeft)
  process.stdout.write(JSON.stringify({ beforeX, afterX }) + '\n')
  expect(afterX, `horizontal swipe ${beforeX} -> ${afterX}`).toBeGreaterThan(beforeX + 100)
  const capturesAfterSwipes = await page.evaluate(() => window.gestureCaptures.length)
  expect(capturesAfterSwipes).toBe(0)
  await page.getByRole('button', { name: 'Lv.1 슬라이드', exact: true }).tap()
  await page.waitForTimeout(700)
  const pinchBounds = (await stage.boundingBox())!
  const y = pinchBounds.y + 100
  const scaleBefore = await stage.locator(':scope > div').first().evaluate(el => (el as HTMLElement).style.transform)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 140, y, id: 10 }] })
  const firstCaptureCount = await page.evaluate(() => window.gestureCaptures.length)
  expect(firstCaptureCount).toBe(0)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 140, y, id: 10 }, { x: 240, y, id: 11 }] })
  const twoCaptureCount = await page.evaluate(() => window.gestureCaptures.length)
  expect(twoCaptureCount).toBe(0)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 130, y, id: 10 }, { x: 250, y, id: 11 }] })
  await page.waitForTimeout(300)
  const scaleAfter = await stage.locator(':scope > div').first().evaluate(el => (el as HTMLElement).style.transform)
  process.stdout.write(JSON.stringify({ scaleBefore, scaleAfter }) + '\n')
  expect(scaleAfter).toBe(scaleBefore)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  process.stdout.write(JSON.stringify({ browser: browser.version(), viewport: '430x780', touchAction: action, heartAbsent: true, transformBeforeWheel, beforeY, afterY, beforeX, afterX, capturesAfterSwipes, firstCaptureCount, twoCaptureCount, scaleBefore, scaleAfter, pageErrors }, null, 2) + '\n')
  expect(pageErrors).toEqual([])
})


// 첫 터치를 자식에서 먼저 이동시켜 암묵 캡처가 확정된 실제 브라우저 순서를 검증한다.
test('힐링 모드에서 자식 캡처 이전 후 focal 핀치 줌과 캡처 해제 및 휠 줌', async ({ context, page }) => {
  test.setTimeout(90_000)
  const { pageErrors } = await openHome(context, page)
  const stage = page.locator('#my-terra-container')
  await expect(stage).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(1000)
  await page.getByTestId('home-healing').tap()
  await expect(page.getByRole('dialog', { name: '힐링 모드', exact: true })).toBeVisible()
  await expect(page.getByTestId('home-healing-close')).toBeVisible()
  await page.waitForTimeout(400)
  expect(await stage.evaluate(el => getComputedStyle(el).touchAction)).toBe('none')
  await stage.evaluate((el) => {
    window.gestureCaptures = []
    window.gestureReleases = []
    window.gestureEvents = []
    const capture = Element.prototype.setPointerCapture
    const release = Element.prototype.releasePointerCapture
    Element.prototype.setPointerCapture = function (id: number) {
      if (this === el) window.gestureCaptures.push(id)
      return capture.call(this, id)
    }
    Element.prototype.releasePointerCapture = function (id: number) {
      if (this === el) window.gestureReleases.push(id)
      return release.call(this, id)
    }
    for (const type of ['gotpointercapture', 'lostpointercapture', 'pointerup', 'pointercancel']) {
      el.addEventListener(type, (event) => {
        window.gestureEvents.push({ type, id: (event as PointerEvent).pointerId, stage: event.target === el })
      })
    }
  })
  const child = stage.locator(':scope > div').first()
  const bounds = (await child.boundingBox())!
  const x = bounds.x + bounds.width / 2 - 40
  const y = bounds.y + 70
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id !== 'my-terra-container', { x, y })).toBe(true)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 1, y, id: 1 }] })
  expect(await page.evaluate(() => window.gestureCaptures)).toEqual([])
  const implicit = await page.evaluate(() => window.gestureEvents.filter(event => event.type === 'gotpointercapture' && !event.stage))
  expect(implicit).toHaveLength(1)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x + 1, y, id: 1 }, { x: x + 81, y, id: 2 }] })
  const captureIds = await page.evaluate(() => window.gestureCaptures)
  expect(captureIds).toHaveLength(2)
  expect(captureIds[0]).toBe(implicit[0]!.id)
  const scaleBefore = await child.evaluate(el => (el as HTMLElement).style.transform)
  const beforePinch = (await child.boundingBox())!
  const focal = { x: x + 41, y }
  const localFocal = { x: (focal.x - beforePinch.x) / beforePinch.width, y: (focal.y - beforePinch.y) / beforePinch.height }
  // 두 번째 포인터는 고정하고 캡처가 이전된 첫 번째 포인터만 움직인다.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 9, y, id: 1 }, { x: x + 81, y, id: 2 }] })
  const scaleAfter = await child.evaluate(el => (el as HTMLElement).style.transform)
  expect(scaleAfter).not.toBe(scaleBefore)
  await page.waitForTimeout(300)
  const afterPinch = (await child.boundingBox())!
  expect(afterPinch.width / beforePinch.width).toBeCloseTo(90 / 80, 2)
  // 같은 병 위 지점이 이동한 두 손가락 중점을 따라야 한다. Vue 인스턴스 대신 화면 좌표로 검증한다.
  expect(Math.abs(afterPinch.x + localFocal.x * afterPinch.width - (focal.x - 5))).toBeLessThan(1)
  expect(Math.abs(afterPinch.y + localFocal.y * afterPinch.height - focal.y)).toBeLessThan(1)
  const transferEvents = await page.evaluate(() => window.gestureEvents)
  expect(transferEvents).toContainEqual({ type: 'lostpointercapture', id: captureIds[0], stage: false })
  expect(transferEvents).toContainEqual({ type: 'gotpointercapture', id: captureIds[0], stage: true })
  // 부분 touchEnd에는 종료할 두 번째 터치를 명시한다.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: x + 81, y, id: 2 }] })
  expect(await page.evaluate(() => window.gestureEvents.filter(event => event.type === 'pointerup').map(event => event.id))).toEqual([captureIds[1]])
  expect(await page.evaluate(() => window.gestureReleases)).toEqual([captureIds[0]])
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  expect(await page.evaluate(() => window.gestureReleases)).toEqual([captureIds[0]])
  await page.mouse.move(x, y)
  await page.mouse.wheel(0, -100)
  await page.waitForTimeout(300)
  expect((await child.boundingBox())!.width).toBeGreaterThan(afterPinch.width)
  await page.getByTestId('home-healing-close').tap()
  await expect(stage).not.toHaveAttribute('role', 'dialog')
  expect(pageErrors).toEqual([])
  console.log(JSON.stringify({ captureIds, scaleBefore, scaleAfter, beforePinch, afterPinch, focal, transferEvents, releases: await page.evaluate(() => window.gestureReleases), pageErrors }))
})
