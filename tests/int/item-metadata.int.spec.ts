import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { User } from '@/payload-types'
import { requireMongoDB } from '../helpers/mongodb'

/**
 * The item's metadata (course brief, ArtAround: Architecture): "every item is
 * characterized precisely at least by length (e.g. 3 s, 15 s, 1 min, 4 min),
 * language (children's, elementary, medium, specialist), author and licence".
 * In ArtAround an item is a `contents` document; the language is its
 * `difficulty` (easy, medium, hard) plus its `audience` (children).
 *
 * The seam is the Local API create an author's form goes through
 * (`overrideAccess: false` with the author as user): whatever the client
 * sends, the saved item carries all four categories, and one without a
 * language level is refused. Runs on the development MongoDB
 * (`pnpm services:start`); the spec removes what it creates.
 */
let payload: Payload
let author: User
const created: string[] = []
const suffix = crypto.randomUUID().slice(0, 8)

const richText = (text: string) => ({
  root: {
    type: 'root',
    version: 1,
    direction: null,
    format: '' as const,
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '' as const,
        indent: 0,
        children: [
          { type: 'text', version: 1, text, detail: 0, format: 0, mode: 'normal', style: '' },
        ],
      },
    ],
  },
})

/** 75 words: 30 seconds read aloud at 150 words a minute. */
const THIRTY_SECONDS = Array.from({ length: 75 }, (_, i) => `parola${i}`).join(' ')

describe('item metadata', () => {
  beforeAll(async () => {
    await requireMongoDB()
    payload = await getPayload({ config: await config })
    author = await payload.create({
      collection: 'users',
      data: {
        username: `spec-author-${suffix}`,
        email: `spec-author-${suffix}@artaround.example`,
        password: '12345678',
        name: { firstName: 'Spec', lastName: 'Author', fullName: 'Spec Author' },
      },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    for (const id of created) {
      await payload.delete({ collection: 'contents', id, overrideAccess: true })
    }
    if (author) await payload.delete({ collection: 'users', id: author.id, overrideAccess: true })
  })

  it('saves length, language level, author and licence for every new item', async () => {
    const content = await payload.create({
      collection: 'contents',
      data: {
        title: `Metadata spec ${suffix}`,
        difficulty: 'easy',
        audience: 'children',
        body: richText(THIRTY_SECONDS),
        rightsDeclaredAt: new Date().toISOString(),
      },
      user: author,
      overrideAccess: false,
    })
    created.push(String(content.id))

    expect(content.durationSeconds).toBe(30)
    expect(content.difficulty).toBe('easy')
    expect(content.audience).toBe('children')
    expect(typeof content.author === 'object' ? content.author?.id : content.author).toBe(author.id)
    expect(content.license).toBe('cc-by')
  })

  it('takes the author from the session, never from the request', async () => {
    const content = await payload.create({
      collection: 'contents',
      data: {
        title: `Metadata spec author ${suffix}`,
        difficulty: 'hard',
        body: richText('Testo specialistico.'),
        rightsDeclaredAt: new Date().toISOString(),
        author: '000000000000000000000000',
      },
      user: author,
      overrideAccess: false,
    })
    created.push(String(content.id))

    expect(typeof content.author === 'object' ? content.author?.id : content.author).toBe(author.id)
  })

  it('refuses an item without a language level', async () => {
    await expect(
      payload.create({
        collection: 'contents',
        // @ts-expect-error -- the level is required: this is the request a client must not get through
        data: {
          title: `Metadata spec no level ${suffix}`,
          body: richText('Senza livello.'),
          rightsDeclaredAt: new Date().toISOString(),
        },
        user: author,
        overrideAccess: false,
      }),
    ).rejects.toThrow(/Difficulty/)
  })
})
