import { expect as baseExpect, test } from '@playwright/test'
import { requireLiveKit } from '../helpers/livekit'
import { requireTourFixture } from '../helpers/tour-fixture'
import { MUSEUM_MODE_COOKIE } from '@/lib/museum-cookie'

/** Real public planner + Payload + LiveKit; only the model is the AI SDK mock. */
const expect = baseExpect.configure({ timeout: 60_000 })
test('a planned family follows the same works with adult, five-year-old and eight-year-old reading', async ({
  browser,
}) => {
  test.setTimeout(480_000)
  const fixture = requireTourFixture()
  await requireLiveKit()
  const origin = new URL(fixture.url).origin
  const contexts = await Promise.all(
    [0, 1, 2].map(() => browser.newContext({ viewport: { width: 390, height: 844 } })),
  )
  try {
    // Software WebGL in the cloud is not a production frame-rate benchmark.
    // Throttle only test-browser animation scheduling; touch/layout stay real.
    for (const context of contexts)
      await context.addInitScript(() => {
        const raf = requestAnimationFrame.bind(window)
        window.requestAnimationFrame = (callback) => window.setTimeout(() => raf(callback), 200)
      })
    const [host, five, eight] = await Promise.all(contexts.map((context) => context.newPage()))
    await host.goto(`${origin}/en/tour/plan`, { waitUntil: 'domcontentloaded' })
    const museum = host.getByRole('combobox', { name: 'Museum', exact: true })
    await expect(async () => {
      await museum.fill('[DEV] Tour navigation')
      await expect(host.getByRole('option').first()).toBeVisible({ timeout: 1500 })
    }).toPass({ timeout: 90_000 })
    await host.getByRole('option').first().click()
    await host.getByText('30 min', { exact: true }).click()
    await host
      .getByRole('textbox', { name: 'Interests', exact: true })
      .fill('Curiosities about Parmigianino and Bedoli')
    await host.getByRole('checkbox', { name: 'Wheelchair-accessible route' }).check()
    await host.getByRole('button', { name: /More about your visit/ }).click()
    await host.getByText('Been before', { exact: true }).click()
    await host.getByRole('textbox', { name: 'Adults', exact: true }).fill('2')
    await host.getByRole('textbox', { name: 'Children', exact: true }).fill('2')
    await host.getByRole('textbox', { name: 'Age of child 1', exact: true }).fill('5')
    await host.getByRole('textbox', { name: 'Age of child 2', exact: true }).fill('8')
    const planned = host.waitForResponse(
      (response) =>
        response.url().endsWith('/api/plan-tour') && response.request().method() === 'POST',
    )
    await host.getByRole('button', { name: 'Plan my visit', exact: true }).click()
    const response = await planned
    expect(response.ok()).toBe(true)
    expect(response.request().postDataJSON()).toMatchObject({
      minutes: 30,
      returning: true,
      adults: 2,
      childrenAges: [5, 8],
      interests: 'Curiosities about Parmigianino and Bedoli',
    })
    const plan = await response.json()
    expect(plan.totalMinutes).toBeLessThanOrEqual(30)
    expect(plan.stops.length).toBeGreaterThan(0)
    await expect(host.getByRole('button', { name: 'Start the visit' })).toBeVisible()
    // Reload restores the preview and answers without another model call.
    await host.reload({ waitUntil: 'domcontentloaded' })
    await expect(host.getByRole('combobox', { name: 'Reading for' })).toHaveValue('Adult')
    // SSR fields are visible before hydration in a dev build: await the live modal.
    await expect(async () => {
      await host.getByRole('button', { name: 'Start with a group' }).click()
      await expect(host.getByRole('textbox', { name: 'Your name' })).toBeVisible({ timeout: 1500 })
    }).toPass({ timeout: 90_000 })
    await host.getByRole('textbox', { name: 'Your name' }).fill('Parent')
    await host.getByRole('button', { name: 'Open the group' }).click()
    await expect(host).toHaveURL(/\/room\/[A-Z2-9]{6}\?mobility=wheelchair/)
    const code = new URL(host.url()).pathname.split('/').pop()!
    for (const [page, age] of [
      [five, 5],
      [eight, 8],
    ] as const) {
      await page.goto(`${origin}/en/room/${code}`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('combobox', { name: 'Reading for' }).click()
      await page.getByRole('option', { name: `Child aged ${age}` }).click()
      await expect(page).toHaveURL(new RegExp(`age=${age}`))
      await page.getByRole('textbox', { name: 'Your name' }).fill(`Reader ${age}`)
      await page.getByRole('button', { name: 'Join the group' }).click()
      await expect(page.getByText('Waiting for Parent to start the tour')).toBeVisible()
    }
    await expect(host.getByText('3 in the group')).toBeVisible()
    await host.getByRole('button', { name: 'Start the tour', exact: true }).click()
    await expect(host).toHaveURL(/\/navigation\/tour\/[^/]+\/0\?mobility=wheelchair/)
    await expect(five).toHaveURL(/\/navigation\/tour\/[^/]+\/0\?.*age=5/)
    await expect(eight).toHaveURL(/\/navigation\/tour\/[^/]+\/0\?.*age=8/)
    const requests = [five, eight].map((page) =>
      page.waitForRequest(
        (request) =>
          request.url().endsWith('/api/expand') &&
          request.method() === 'POST' &&
          request.postDataJSON()?.request?.kind === 'version',
        { timeout: 120_000 },
      ),
    )
    await host.getByRole('button', { name: 'Open next stop' }).click()
    const versions = await Promise.all(requests)
    expect(versions.map((request) => request.postDataJSON().request.age)).toEqual([5, 8])
    expect(versions[0].postDataJSON().id).toBe(versions[1].postDataJSON().id)
    for (const page of [host, five, eight]) await expect(page.getByRole('dialog')).toBeVisible()
    // A request alone is insufficient: the child must receive readable text.
    for (const page of [five, eight])
      await expect(page.getByRole('dialog').locator('[aria-busy="false"] p').first()).toBeVisible({
        timeout: 120_000,
      })
    expect(new URL(host.url()).searchParams.has('audience')).toBe(false)
    for (const page of [five, eight])
      await expect(
        page.getByRole('dialog').getByRole('button', { name: 'Go to next step' }),
      ).toHaveCount(0)
    // The host advances; each child keeps its own age on the next shared work.
    await host.getByRole('dialog').getByRole('button', { name: 'Go to next step' }).click()
    for (const [page, age] of [
      [five, 5],
      [eight, 8],
    ] as const) {
      await expect(page).toHaveURL(new RegExp(`/1\\?.*age=${age}`))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(new RegExp(`age=${age}`))
    }
  } finally {
    await Promise.all(contexts.map((context) => context.close()))
  }
})

test('the public planner validates constraints, reuses answers and honors museum mode', async ({
  request,
}) => {
  test.setTimeout(120_000)
  const fixture = requireTourFixture()
  const endpoint = `${new URL(fixture.url).origin}/api/plan-tour`
  const body = {
    museumId: fixture.museumId,
    minutes: 30,
    returning: true,
    adults: 2,
    childrenAges: [5, 8],
    interests: 'Parmigianino and Bedoli',
    lng: 'en',
  }
  const first = await request.post(endpoint, { data: body })
  expect(first.ok()).toBe(true)
  const plan = await first.json()
  const reused = await request.post(endpoint, {
    data: { ...body, childrenAges: [8, 5], interests: '  PARMIGIANINO and   Bedoli  ' },
  })
  expect(reused.ok()).toBe(true)
  expect((await reused.json()).id).toBe(plan.id)
  expect(plan.totalMinutes).toBeLessThanOrEqual(30)
  expect(new Set(plan.stops.map((stop: { objectName: string }) => stop.objectName)).size).toBe(
    plan.stops.length,
  )
  const invalid = await request.post(endpoint, { data: { ...body, adults: 0, childrenAges: [] } })
  expect(invalid.status()).toBe(400)
  const locked = await request.post(endpoint, {
    headers: { Cookie: `${MUSEUM_MODE_COOKIE}=${fixture.museumId}` },
    data: { ...body, museumId: '000000000000000000000000' },
  })
  expect(locked.ok()).toBe(true)
  expect((await locked.json()).museumId).toBe(fixture.museumId)
})
