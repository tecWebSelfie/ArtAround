import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'

/**
 * Read-aloud audio of the base text (requirement 4 of
 * `docs/plan/requisiti-18-33.md`): text preparation and MP3 timing, the
 * `generateContentAudio` task against an in-memory Local API, and the
 * `contents` hook that queues it. The speech provider is mocked: these tests
 * never call Fish Audio.
 */

const generateSpeech = vi.fn(async () => ({ audio: { uint8Array: silentMp3(100) } }))
vi.mock('ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('ai')>()),
  generateSpeech,
}))

const { audioTextHash, mp3DurationSeconds, silentMp3, splitForSpeech } =
  await import('@/lib/content-audio')
const { generateContentAudio } = await import('@/tasks/generateContentAudio')
const { Contents } = await import('@/collections/Contents')

const body = (text: string) => ({
  root: {
    type: 'root',
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          { type: 'text', version: 1, text, detail: 0, format: 0, mode: 'normal', style: '' },
        ],
      },
    ],
  },
})

type Doc = Record<string, unknown>

/** Local API double: one content per locale, the stored audios, recorded writes. */
function fakeRequest({
  contents,
  audios = [],
  variants = {},
}: {
  contents: Record<string, Doc>
  audios?: Doc[]
  variants?: Record<string, Doc>
}) {
  const writes: { op: string; collection: string; data: Doc; file?: unknown }[] = []
  const req = {
    payload: {
      findByID: async ({
        locale,
        collection,
        id,
      }: {
        locale: string
        collection: string
        id: string
      }) => (collection === 'contentVariants' ? (variants[id] ?? {}) : (contents[locale] ?? {})),
      find: async () => ({ docs: audios }),
      create: async ({ collection, data, file }: Doc & { collection: string; data: Doc }) => {
        writes.push({ op: 'create', collection, data, file })
        return data
      },
      update: async ({ collection, data, file }: Doc & { collection: string; data: Doc }) => {
        writes.push({ op: 'update', collection, data, file })
        return data
      },
    },
  } as unknown as PayloadRequest
  return { req, writes }
}

describe('preparing the text', () => {
  it('splits long texts at paragraphs, then sentences', () => {
    const paragraph = 'One sentence here. Another one there. '.repeat(20).trim()
    const chunks = splitForSpeech(`${paragraph}\n\nShort end.`, 200)
    expect(chunks.every((chunk) => chunk.length <= 200)).toBe(true)
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toContain('Short end.')
  })

  it('fingerprints the text, so an edit makes the audio stale', () => {
    expect(audioTextHash('A text')).toBe(audioTextHash(' A text '))
    expect(audioTextHash('A text')).not.toBe(audioTextHash('A new text'))
  })

  it('times an MP3 from its frames', () => {
    // 100 frames × 1152 samples / 44100 Hz ≈ 2.6 s
    expect(mp3DurationSeconds(silentMp3(100))).toBe(3)
    expect(mp3DurationSeconds(new Uint8Array(10))).toBe(0)
  })
})

describe('generateContentAudio', () => {
  beforeEach(() => generateSpeech.mockClear())

  it('reads a saved personal version and never changes the base duration or version lookup key', async () => {
    const { req, writes } = fakeRequest({
      contents: { en: { title: 'The work', body: body('Base facts.') } },
      variants: { v5: { kind: 'version', content: 'c1', body: body('Facts for age five.') } },
    })
    await generateContentAudio(req, { contentId: 'c1', locale: 'en', variantId: 'v5' })
    expect(generateSpeech).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'The work.\nFacts for age five.' }),
    )
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({
      collection: 'contentAudio',
      data: { variant: 'v5', content: 'c1' },
    })
  })

  it('rejects another content’s version or a missing translation without generating speech', async () => {
    const { req, writes } = fakeRequest({
      contents: { en: { title: 'The work', body: body('Base facts.') } },
      variants: { other: { kind: 'version', content: 'c2', body: body('Private facts.') } },
    })
    for (const variantId of ['other', 'untranslated']) {
      expect(await generateContentAudio(req, { contentId: 'c1', locale: 'en', variantId })).toEqual(
        { status: 'no-text' },
      )
    }
    expect(generateSpeech).not.toHaveBeenCalled()
    expect(writes).toEqual([])
  })

  it('reads the source text aloud, stores the MP3 and its real length', async () => {
    const { req, writes } = fakeRequest({
      contents: {
        en: { title: 'A knight in motion', body: body('Few paintings move like this.') },
      },
    })
    const result = await generateContentAudio(req, { contentId: 'c1', locale: 'en' })
    expect(result).toEqual({ status: 'generated', seconds: 3 })
    expect(generateSpeech).toHaveBeenCalledOnce()
    const audio = writes.find((write) => write.collection === 'contentAudio')
    expect(audio).toMatchObject({ op: 'create', data: { content: 'c1', locale: 'en' } })
    // The real length replaces the estimate on the content (source locale only).
    expect(writes.find((write) => write.collection === 'contents')?.data).toEqual({
      durationSeconds: 3,
    })
  })

  it('keeps an audio whose text did not change, and waits for missing translations', async () => {
    const text = 'A knight in motion.\n\nFew paintings move like this.'
    const upToDate = fakeRequest({
      contents: {
        it: { title: 'A knight in motion', body: body('Few paintings move like this.') },
      },
      audios: [{ id: 'a1', textHash: audioTextHash(text) }],
    })
    expect(await generateContentAudio(upToDate.req, { contentId: 'c1', locale: 'it' })).toEqual({
      status: 'up-to-date',
    })
    const untranslated = fakeRequest({ contents: { en: { title: 'T', body: body('x') } } })
    expect(await generateContentAudio(untranslated.req, { contentId: 'c1', locale: 'fr' })).toEqual(
      { status: 'no-text' },
    )
    expect(generateSpeech).not.toHaveBeenCalled()
  })
})

describe('contents: queueContentAudio', () => {
  const found = Contents.hooks?.afterChange?.find((fn) => fn.name === 'queueContentAudio')
  if (!found) throw new Error('No afterChange hook named queueContentAudio')
  const queueHook = found

  it('queues the audio when the English text changes, and only then', async () => {
    vi.stubEnv('FISH_API_KEY', 'test-key')
    const queue = vi.fn(async () => ({}))
    const req = { locale: 'en', payload: { jobs: { queue }, logger: console } }
    const doc = { id: 'c1', title: 'T', body: body('new') }
    const run = (args: Doc) =>
      queueHook({ doc, req, operation: 'update', context: {}, ...args } as never)

    await run({ previousDoc: { ...doc, body: body('old') } })
    expect(queue).toHaveBeenCalledWith(
      expect.objectContaining({
        task: 'generateContentAudio',
        input: { contentId: 'c1', locale: 'en' },
      }),
    )
    queue.mockClear()
    await run({ previousDoc: doc })
    await run({ previousDoc: { ...doc, body: body('old') }, context: { skipContentAudio: true } })
    await run({ previousDoc: { ...doc, body: body('old') }, req: { ...req, locale: 'it' } })
    expect(queue).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
