import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import config from '@/payload.config'
import { removeContentsFromTours } from '@/lib/tour-stop-cleanup'
import { LISTED_TOURS } from '@/lib/visibility'
import { requireMongoDB } from '../helpers/mongodb'

/**
 * A deleted content leaves every tour that lists it (src/lib/tour-stop-cleanup.ts):
 * stops, directions, quiz questions, derived visitable stops and counts, in the
 * delete's transaction. Real MongoDB through the Local API.
 */
let payload: Payload
const suffix = Math.random().toString(36).slice(2, 8)
const created: { collection: string; id: string }[] = []

const body = {
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
} as never

async function make(collection: string, data: Record<string, unknown>) {
  const doc = await payload.create({
    collection: collection as 'tours',
    data: data as never,
    locale: 'en',
    context: { skipMintModelGeneration: true },
    overrideAccess: true,
  })
  created.push({ collection, id: String(doc.id) })
  return doc as unknown as { id: string }
}

const raw = (id: string) =>
  payload.findByID({ collection: 'tours', id, depth: 0, locale: 'en', overrideAccess: true })
const ids = (refs: unknown) =>
  ((refs ?? []) as (string | { id: string })[]).map((r) => (typeof r === 'string' ? r : r.id))

const question = (prompt: string, relatedTo: string[]) =>
  make('quizQuestions', {
    prompt,
    correctAnswer: 'a',
    wrongAnswers: [{ text: 'b' }, { text: 'c' }, { text: 'd' }],
    relatedTo,
  })

let author: { id: string }
let museum: { id: string }
let [c1, c2, c3]: { id: string }[] = []

beforeAll(async () => {
  await requireMongoDB()
  payload = await getPayload({ config: await config })
  author = await make('users', {
    email: `tsc-${suffix}@example.com`,
    password: 'test-password',
    username: `tsc${suffix}`,
    name: { firstName: 'T', lastName: 'Spec', fullName: 'T Spec' },
  })
  museum = await make('museums', {
    name: `TSC ${suffix}`,
    accessibility: { isAccessible: false },
    shortDescription: 'Tour stop cleanup spec',
    ticketInfo: { label: 'free' },
    location: { address: 'x', city: 'Test', latlng: [9.19, 45.46] },
  })
  const content = (title: string) =>
    make('contents', { title: `${title} ${suffix}`, difficulty: 'easy', body, author: author.id })
  ;[c1, c2, c3] = [await content('C1'), await content('C2'), await content('C3')]
}, 60_000)

afterAll(async () => {
  for (const { collection, id } of [...created].reverse()) {
    await payload
      .delete({ collection: collection as 'tours', id, overrideAccess: true })
      .catch(() => undefined)
  }
})

describe('deleting a content', () => {
  it('removes it from its tours: stops, directions, quiz, counts; others untouched', async () => {
    const onlyC1 = await question('Only C1', [c1.id])
    const both = await question('C1 and C2', [c1.id, c2.id])
    const aboutC3 = await question('C3', [c3.id])
    const owned = await question('Tour owned', [])
    const tour = await make('tours', {
      title: `TSC main ${suffix}`,
      contents: [c1.id, c2.id],
      directions: [
        { content: c1.id, text: 'Go left' },
        { content: c2.id, text: 'Go right' },
      ],
      quiz: { questions: [onlyC1.id, both.id, owned.id] },
      museum: museum.id,
      author: author.id,
    })
    const untouched = await make('tours', {
      title: `TSC other ${suffix}`,
      contents: [c2.id, c3.id],
      quiz: { questions: [aboutC3.id] },
      museum: museum.id,
      author: author.id,
    })
    const untouchedBefore = await raw(untouched.id)

    await payload.delete({ collection: 'contents', id: c1.id, overrideAccess: true })

    const after = await raw(tour.id)
    expect(ids(after.contents)).toEqual([c2.id])
    expect(after.directions?.map((d) => ids([d.content])[0])).toEqual([c2.id])
    // The question about C1 only is gone; the shared one still concerns C2.
    expect(ids(after.quiz?.questions)).toEqual([both.id, owned.id])
    expect(
      await payload.count({ collection: 'quizQuestions', where: { id: { equals: onlyC1.id } } }),
    ).toMatchObject({ totalDocs: 0 })
    const rest = await payload.findByID({ collection: 'quizQuestions', id: both.id, depth: 0 })
    expect(ids(rest.relatedTo)).toEqual([c2.id])
    // Derived stops follow the remaining contents (the same rule as a fresh save).
    expect(after.visitableStops).toBe(ids(after.visitableContents).length)

    const otherAfter = await raw(untouched.id)
    expect(ids(otherAfter.contents)).toEqual(ids(untouchedBefore.contents))
    expect(ids(otherAfter.quiz?.questions)).toEqual([aboutC3.id])
  })

  it('drops a question that no longer concerns any content of the tour', async () => {
    const mixed = await question('C2 and C3', [c2.id, c3.id])
    const tour = await make('tours', {
      title: `TSC quiz ${suffix}`,
      contents: [c2.id, c3.id],
      quiz: { questions: [mixed.id] },
      museum: museum.id,
      author: author.id,
    })
    // Only C2 leaves the content list: simulate with the helper, content stays alive.
    await removeContentsFromTours({ payload, contentIds: [c2.id] })
    expect(ids((await raw(tour.id)).contents)).toEqual([c3.id])
    expect(ids((await raw(tour.id)).quiz?.questions)).toEqual([mixed.id])
    await removeContentsFromTours({ payload, contentIds: [c3.id] })
    const emptied = await raw(tour.id)
    expect(ids(emptied.contents)).toEqual([])
    expect(ids(emptied.quiz?.questions)).toEqual([])
    // The question itself survives: it still concerns existing contents.
    expect(
      (await payload.count({ collection: 'quizQuestions', where: { id: { equals: mixed.id } } }))
        .totalDocs,
    ).toBe(1)
  })

  it('keeps a tour whose single stop is deleted, with no stops and out of the lists', async () => {
    const only = await make('contents', {
      title: `Only ${suffix}`,
      difficulty: 'easy',
      body,
      author: author.id,
    })
    // Created with the minimum two stops, then reduced to one as a legacy tour.
    const tour = await make('tours', {
      title: `TSC single ${suffix}`,
      contents: [only.id, c3.id],
      museum: museum.id,
      author: author.id,
    })
    await payload.db.updateOne({
      collection: 'tours',
      id: tour.id,
      data: { contents: [only.id] },
      returning: false,
    })
    await payload.delete({ collection: 'contents', id: only.id, overrideAccess: true })
    const after = await raw(tour.id)
    expect(ids(after.contents)).toEqual([])
    expect(after.visitableStops).toBe(0)
    expect(
      (
        await payload.count({
          collection: 'tours',
          where: { and: [{ id: { equals: tour.id } }, LISTED_TOURS] },
          overrideAccess: true,
        })
      ).totalDocs,
    ).toBe(0)
    // The author's own tour is still readable: the editor can open it.
    expect(after.id).toBe(tour.id)
  })

  it('the backfill helper drops ids of contents deleted before the cleanup existed', async () => {
    const tour = await make('tours', {
      title: `TSC legacy ${suffix}`,
      contents: [c3.id, c2.id],
      museum: museum.id,
      author: author.id,
    })
    // A dangling id, as left by the former behaviour.
    const ghost = '64b64b64b64b64b64b64b64b'
    await payload.db.updateOne({
      collection: 'tours',
      id: tour.id,
      data: { contents: [c3.id, ghost, c2.id] },
      returning: false,
    })
    await removeContentsFromTours({ payload, contentIds: [ghost] })
    expect(ids((await raw(tour.id)).contents)).toEqual([c3.id, c2.id])
  })
})
