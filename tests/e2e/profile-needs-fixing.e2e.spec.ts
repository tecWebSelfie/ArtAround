import { expect, test } from '@playwright/test'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'

/**
 * A tour with no visitable stop is unlisted for everyone, but its author still
 * sees it on their own profile, flagged "Needs fixing" and linked to the
 * editor; nobody else (a signed-in visitor, an anonymous one) does.
 * Data goes in through the Local API (an empty tour is a state the REST
 * editor refuses to save); the viewer logs in through the real endpoint.
 */
const origin = process.env.E2E_ORIGIN ?? 'http://localhost:3000'
const suffix = Math.random().toString(36).slice(2, 8)
const password = 'test-password'
let payload: Payload
let authorId: string
let otherId: string
let tourId: string
const created: { collection: 'users' | 'tours' | 'museums'; id: string }[] = []

const user = async (name: string) => {
  const doc = await payload.create({
    collection: 'users',
    data: {
      email: `nf-${name}-${suffix}@example.com`,
      password,
      username: `nf${name}${suffix}`,
      name: { firstName: name, lastName: 'Fix', fullName: `${name} Fix` },
    } as never,
    overrideAccess: true,
  })
  created.push({ collection: 'users', id: String(doc.id) })
  return doc
}

test.beforeAll(async () => {
  payload = await getPayload({ config: await config })
  const author = await user('author')
  const other = await user('other')
  authorId = String(author.id)
  otherId = String(other.id)
  const museum = await payload.create({
    collection: 'museums',
    data: {
      name: `NF ${suffix}`,
      accessibility: { isAccessible: false },
      shortDescription: 'Needs fixing spec',
      ticketInfo: { label: 'free' },
      location: { address: 'x', city: 'Test', latlng: [9.19, 45.46] },
    } as never,
    overrideAccess: true,
  })
  created.push({ collection: 'museums', id: String(museum.id) })
  const content = await payload.create({
    collection: 'contents',
    data: {
      title: `NF content ${suffix}`,
      difficulty: 'easy',
      author: authorId,
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
  const tour = await payload.create({
    collection: 'tours',
    data: {
      title: `NF empty tour ${suffix}`,
      contents: [content.id, content.id],
      museum: museum.id,
      author: authorId,
    } as never,
    overrideAccess: true,
  })
  tourId = String(tour.id)
  created.push({ collection: 'tours', id: tourId })
  // The state a deleted content leaves behind: no stop, hence none visitable.
  await payload.db.updateOne({
    collection: 'tours',
    id: tourId,
    data: { contents: [], visitableStops: 0, visitableContents: [] },
    returning: false,
  })
  await payload.delete({ collection: 'contents', id: content.id, overrideAccess: true })
})

test.afterAll(async () => {
  for (const { collection, id } of [...created].reverse()) {
    await payload.delete({ collection, id, overrideAccess: true }).catch(() => undefined)
  }
})

async function profileAs(page: import('@playwright/test').Page, name: string | null) {
  if (name) {
    const login = await page.request.post(`${origin}/api/users/login`, {
      data: { username: `nf${name}${suffix}`, password },
    })
    expect(login.status()).toBe(200)
  }
  await page.goto(`${origin}/en/user/${authorId}`)
  await expect(page.locator('h1').first()).toContainText('author Fix')
}

test('the author sees their empty tour flagged and linked to the editor', async ({ page }) => {
  await profileAs(page, 'author')
  const card = page.getByRole('link', { name: new RegExp(`NF empty tour ${suffix}`) })
  await expect(card).toBeVisible()
  await expect(card).toContainText('Needs fixing')
  await expect(card).toHaveAttribute('href', new RegExp(`/tour/${tourId}/edit$`))
})

test('another user and an anonymous visitor do not see it', async ({ page, browser }) => {
  await profileAs(page, 'other')
  await expect(page.getByText(`NF empty tour ${suffix}`)).toHaveCount(0)
  const anonymous = await browser.newPage()
  await profileAs(anonymous, null)
  await expect(anonymous.getByText(`NF empty tour ${suffix}`)).toHaveCount(0)
  await anonymous.close()
  expect(otherId).not.toBe(authorId)
})
