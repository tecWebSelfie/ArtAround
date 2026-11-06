import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveLocalized } from '@/lib/localized'
import { requireMongoDB } from '../helpers/mongodb'

/**
 * Real-time translation of the contents (course brief, Navigator 18-33: "the
 * very same contents will be heard in Italian by Italians, in French by the
 * French, in Chinese by the Chinese"). The seam is `resolveLocalized()`, the
 * server read every localized page and `/api/{collection}/:id/localized`
 * share (AGENTS.md → On-demand AI translation):
 *
 * - a language nobody asked for yet serves the original text at once (MISS),
 *   so the visit never waits for the model;
 * - once the background translation is stored, the same content comes back
 *   in the visitor's language (HIT), and only that language changes;
 * - a translation older than the edited original is still served, flagged
 *   STALE so it gets refreshed.
 *
 * Runs on the development MongoDB (`pnpm services:start`). The translation
 * job itself (Groq) is not run: the test stores what it would store, the
 * French text and the plugin's provenance receipt. The plugin's staleness
 * route is an HTTP call to the app itself, answered here by a stubbed fetch.
 */
let payload: Payload
let contentId: string
const TITLE = `Translation spec ${crypto.randomUUID()}`

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

const plainBody = (doc: { body?: unknown }) => JSON.stringify(doc.body)

/** What the staleness route answers for the French translation. */
function staleRouteSays(isStale: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        data: {
          locales: [{ target_lng: 'fr', source_lng: 'en', is_stale: isStale, translated_at: '' }],
        },
      }),
    ),
  )
}

describe('contents in the visitor’s language', () => {
  beforeAll(async () => {
    await requireMongoDB()
    payload = await getPayload({ config: await config })
    const content = await payload.create({
      collection: 'contents',
      data: {
        title: TITLE,
        difficulty: 'medium',
        body: richText('A Dominican friar seated at his desk.'),
      },
      overrideAccess: true,
    })
    contentId = String(content.id)
  })

  afterAll(async () => {
    vi.unstubAllGlobals()
    if (!contentId) return
    await payload.delete({ collection: 'contents', id: contentId, overrideAccess: true })
    await payload.delete({
      collection: 'translator-provenance',
      where: { documentId: { equals: contentId } },
      overrideAccess: true,
    })
  })

  beforeEach(() => staleRouteSays(false))

  it('serves the original text at once when the language was never asked for', async () => {
    const state = await resolveLocalized(payload, {
      collection: 'contents',
      id: contentId,
      locale: 'fr',
    })

    expect(state.kind).toBe('miss')
    if (state.kind !== 'miss') return
    expect(state.doc.title).toBe(TITLE)
    expect(plainBody(state.doc)).toContain('A Dominican friar seated at his desk.')
  })

  it('serves the stored translation once it exists, leaving other languages alone', async () => {
    // What the translation job stores: the French text and its receipt.
    await payload.update({
      collection: 'contents',
      id: contentId,
      locale: 'fr',
      data: {
        title: `${TITLE} (fr)`,
        body: richText('Un frère dominicain assis à son bureau.'),
      },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'translator-provenance',
      data: {
        collectionSlug: 'contents',
        documentId: contentId,
        targetLocale: 'fr',
        sourceLocale: 'en',
        sourceFingerprint: 'spec',
        translatedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })

    const french = await resolveLocalized(payload, {
      collection: 'contents',
      id: contentId,
      locale: 'fr',
    })
    const german = await resolveLocalized(payload, {
      collection: 'contents',
      id: contentId,
      locale: 'de',
    })

    expect(french.kind).toBe('hit')
    if (french.kind !== 'hit') return
    expect(french.doc.title).toBe(`${TITLE} (fr)`)
    expect(plainBody(french.doc)).toContain('Un frère dominicain assis à son bureau.')
    expect(german.kind).toBe('miss')
  })

  it('keeps serving an outdated translation, flagged for a refresh', async () => {
    staleRouteSays(true)

    const state = await resolveLocalized(payload, {
      collection: 'contents',
      id: contentId,
      locale: 'fr',
    })

    expect(state.kind).toBe('stale')
    if (state.kind !== 'stale') return
    expect(plainBody(state.doc)).toContain('Un frère dominicain')
  })

  it('reports a content that does not exist', async () => {
    const state = await resolveLocalized(payload, {
      collection: 'contents',
      id: '000000000000000000000000',
      locale: 'fr',
    })

    expect(state.kind).toBe('not-found')
  })
})
