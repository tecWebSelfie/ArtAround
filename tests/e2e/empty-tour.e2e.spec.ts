import { expect, test, type Page } from '@playwright/test'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'

/**
 * A tour with no visitable stop is never offered (product rule): no start, no
 * group, no quiz, no navigation, whoever asks; only its author can still open
 * the editor to fix it. Two shapes are covered: `contents: []` (what deleting
 * the last content leaves, stored behind the validation) and stops that are
 * all unavailable (their stored visitable list is empty: this fixture's
 * museum has no map to place a work on, so only the stored count says it).
 * Navigation and the quiz judge the live list, so they are asserted on the
 * first shape only.
 * Data goes in through the Local API; the author logs in through the real endpoint.
 */
const origin = process.env.E2E_ORIGIN ?? 'http://localhost:3000'
const suffix = Math.random().toString(36).slice(2, 8)
const password = 'test-password'
let payload: Payload
let museumId: string
let tourNoStops: string
let tourNoneVisitable: string
const created: {
  collection: 'users' | 'tours' | 'museums' | 'contents' | 'quizQuestions'
  id: string
}[] = []

test.beforeAll(async () => {
  payload = await getPayload({ config: await config })
  const author = await payload.create({
    collection: 'users',
    data: {
      email: `et-${suffix}@example.com`,
      password,
      username: `et${suffix}`,
      name: { firstName: 'Empty', lastName: 'Tour', fullName: 'Empty Tour' },
    } as never,
    overrideAccess: true,
  })
  created.push({ collection: 'users', id: String(author.id) })
  const museum = await payload.create({
    collection: 'museums',
    data: {
      name: `ET ${suffix}`,
      accessibility: { isAccessible: false },
      shortDescription: 'Empty tour spec',
      ticketInfo: { label: 'free' },
      location: { address: 'x', city: 'Test', latlng: [9.19, 45.46] },
    } as never,
    overrideAccess: true,
  })
  museumId = String(museum.id)
  created.push({ collection: 'museums', id: museumId })
  const content = await payload.create({
    collection: 'contents',
    data: {
      title: `ET content ${suffix}`,
      difficulty: 'easy',
      author: author.id,
      body: {
        root: {
          type: 'root',
          version: 1,
          direction: 'ltr',
          format: '',
          indent: 0,
          children: [
            { type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'x' }] },
          ],
        },
      },
    } as never,
    overrideAccess: true,
  })
  created.push({ collection: 'contents', id: String(content.id) })
  const question = await payload.create({
    collection: 'quizQuestions',
    data: {
      prompt: 'Which one?',
      correctAnswer: 'a',
      wrongAnswers: [{ text: 'b' }, { text: 'c' }, { text: 'd' }],
    } as never,
    overrideAccess: true,
  })
  created.push({ collection: 'quizQuestions', id: String(question.id) })
  const makeTour = async (title: string) => {
    const tour = await payload.create({
      collection: 'tours',
      data: {
        title: `${title} ${suffix}`,
        contents: [content.id, content.id],
        museum: museum.id,
        author: author.id,
      } as never,
      overrideAccess: true,
    })
    created.push({ collection: 'tours', id: String(tour.id) })
    return String(tour.id)
  }
  tourNoneVisitable = await makeTour('ET unavailable stops')
  tourNoStops = await makeTour('ET no stops')
  // `contents: []` is what deleting the last content leaves; the quiz stays
  // stored on both, so only the missing stops keep it away from visitors.
  await payload.db.updateOne({
    collection: 'tours',
    id: tourNoStops,
    data: { contents: [], visitableStops: 0, visitableContents: [] },
    returning: false,
  })
  await payload.db.updateOne({
    collection: 'tours',
    id: tourNoneVisitable,
    data: { visitableStops: 0, visitableContents: [] },
    returning: false,
  })
  for (const id of [tourNoStops, tourNoneVisitable]) {
    await payload.db.updateOne({
      collection: 'tours',
      id,
      data: { quiz: { questions: [question.id] } },
      returning: false,
    })
  }
})

test.afterAll(async () => {
  for (const { collection, id } of [...created].reverse()) {
    await payload.delete({ collection, id, overrideAccess: true }).catch(() => undefined)
  }
})

for (const [name, tour, live] of [
  ['no stops', () => tourNoStops, true],
  ['no visitable stops', () => tourNoneVisitable, false],
] as const) {
  test.describe(`tour with ${name}`, () => {
    test('the tour page offers no start', async ({ page }) => {
      await page.goto(`${origin}/en/tour/${tour()}`)
      await expect(page.getByText('This tour has no stops to visit right now.')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Start tour' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Start tour' }).first()).toBeDisabled()
    })

    test('every navigation page of the tour lands on the tour page', async ({ page }) => {
      test.skip(!live, 'navigation judges the live stops')
      for (const path of ['', '/0', '/1', '/0/open']) {
        await page.goto(`${origin}/en/museum/${museumId}/navigation/tour/${tour()}${path}`)
        await expect(page).toHaveURL(new RegExp(`/en/tour/${tour()}$`))
      }
    })

    test('the quiz and the legacy navigation link are a 404 / redirect, not an error', async ({
      page,
    }) => {
      test.skip(!live, 'the quiz judges the live stops')
      const quiz = await page.goto(`${origin}/en/tour/${tour()}/quiz?from=0`)
      expect(quiz?.status()).toBe(404)
      await page.goto(`${origin}/en/tour/${tour()}/navigation`)
      await expect(page).toHaveURL(new RegExp(`/en/tour/${tour()}$`))
    })

    test('no group room can be opened for it', async ({ request }) => {
      const response = await request.post(`${origin}/api/rooms`, {
        data: { tourId: tour(), name: 'Host', groupName: '' },
      })
      expect(response.status()).toBe(422)
      expect(await response.json()).toEqual({ error: 'empty' })
    })

    test('there is nothing to check out', async ({ page }) => {
      // Signed in (the sign-in gate comes first): no stop to unlock, nothing to buy.
      await loginAs(page)
      const response = await page.request.post(`${origin}/api/checkout`, {
        data: { collection: 'tours', id: tour() },
      })
      expect(response.status()).toBe(409)
    })
  })
}

test('a group room whose tour became empty shows as ended, not as an error', async ({ page }) => {
  // A room opened while the tour was fine: LiveKit keeps the metadata.
  // Opened straight on LiveKit's API with the same metadata `createGroupRoom`
  // writes (that module is server-only, so a spec cannot import it).
  const { RoomServiceClient } = await import('livekit-server-sdk')
  // A valid room code: letters and digits without the look-alikes (`ROOM_CODE_ALPHABET`).
  const code = `ET${suffix
    .slice(0, 4)
    .split('')
    .map((c) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[c.charCodeAt(0) % 32])
    .join('')}`
  const livekit = new RoomServiceClient(
    process.env.LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
  )
  await livekit.createRoom({
    name: code,
    metadata: JSON.stringify({
      tourId: tourNoStops,
      hostKeyHash: 'x'.repeat(64),
      hostName: 'Hostess',
      groupName: '',
      showResults: false,
    }),
  })
  const response = await page.goto(`${origin}/en/room/${code}`)
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'This group has ended' })).toBeVisible()
  await expect(page.getByText('Hostess')).toHaveCount(0)
  await livekit.deleteRoom(code)
})

async function loginAs(page: Page) {
  const login = await page.request.post(`${origin}/api/users/login`, {
    data: { username: `et${suffix}`, password },
  })
  expect(login.status()).toBe(200)
}

test('the author opens the editor of a tour with no stops', async ({ page }) => {
  await loginAs(page)
  const response = await page.goto(`${origin}/en/tour/${tourNoStops}/edit`)
  expect(response?.status()).toBe(200)
  await expect(page.getByLabel(/^Title/)).toHaveValue(`ET no stops ${suffix}`)
  // Saving asks for stops instead of storing the tour as it is.
  await page.getByRole('button', { name: /save/i }).first().click()
  await expect(page.getByText(/needs at least 2 stops/i)).toBeVisible()
})
