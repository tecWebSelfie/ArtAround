import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { audioTextHash, contentAudioText, contentAudioWhere } from '@/lib/content-audio'
import { mockBody } from '@/mocks/content.mock'

/** The actual audio route checks the base entitlement before resolving a saved personal version. */
const api = vi.hoisted(() => ({ findByID: vi.fn(), find: vi.fn(), queue: vi.fn() }))
vi.mock('@/lib/session', () => ({
  asViewer: async () => ({ user: null, overrideAccess: false }),
  getSession: async () => ({
    payload: {
      findByID: api.findByID,
      find: api.find,
      jobs: { queue: api.queue },
      collections: { contentAudio: { config: { upload: { staticDir: '/tmp' } } } },
    },
  }),
}))
vi.mock('@/lib/rate-limit', () => ({ allowRequest: () => true }))
const { GET } = await import('@/app/api/content-audio/[id]/route')
const version = {
  kind: 'version',
  difficulty: 'easy',
  seconds: 60,
  audience: 'children',
  age: 5,
} as const
const content = { title: 'Work', body: mockBody('Base facts.') }
const variant = { id: 'v5', content: 'c1', body: mockBody('Facts for age five.') }
let sequence = 0
const invoke = (query = '', headers?: HeadersInit) => {
  const id = `c${++sequence}`
  return GET(
    new Request(`http://localhost/api/content-audio/${id}?locale=en&${query}`, { headers }),
    { params: Promise.resolve({ id }) },
  )
}
const versionQuery = `version=${encodeURIComponent(JSON.stringify(version))}`

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('AI_MOCK', 'true')
  api.findByID.mockResolvedValue(content)
  api.find.mockImplementation(async ({ collection }) => ({
    docs: collection === 'contentVariants' ? [variant] : [],
  }))
})
afterEach(() => vi.unstubAllEnvs())

describe('personal read-aloud access and caching', () => {
  it('rejects malformed and impossible versions before database access', async () => {
    for (const input of [
      '{',
      JSON.stringify({ ...version, age: 18 }),
      JSON.stringify({ ...version, audience: 'everyone' }),
    ]) {
      expect((await invoke(`version=${encodeURIComponent(input)}`)).status).toBe(400)
    }
    expect(api.findByID).not.toHaveBeenCalled()
  })
  it('never reads a paid variant when the visitor cannot read its source', async () => {
    api.findByID.mockResolvedValue({ title: 'Locked' })
    expect((await invoke(versionQuery)).status).toBe(403)
    expect(api.find).not.toHaveBeenCalled()
    expect(api.queue).not.toHaveBeenCalled()
    expect(api.findByID).toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: false }))
  })
  it('waits for the requested version instead of reading the base', async () => {
    api.find.mockResolvedValue({ docs: [] })
    expect(await (await invoke(versionQuery)).json()).toEqual({ status: 'translating' })
    expect(api.queue).not.toHaveBeenCalled()
  })
  it('can read a localized version before the base translation exists', async () => {
    api.findByID
      .mockResolvedValueOnce(content)
      .mockResolvedValueOnce({ title: 'Œuvre', body: null })
    const response = await GET(
      new Request(`http://localhost/api/content-audio/localized?locale=fr&${versionQuery}`),
      {
        params: Promise.resolve({ id: 'localized' }),
      },
    )
    expect(await response.json()).toEqual({ status: 'pending' })
    expect(api.queue).toHaveBeenCalledWith(
      expect.objectContaining({ input: { contentId: 'localized', locale: 'fr', variantId: 'v5' } }),
    )
  })
  it('queues distinct audio for two exact ages, without a base-record collision', async () => {
    await invoke(versionQuery)
    expect(api.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'contentVariants',
        where: expect.objectContaining({ and: expect.arrayContaining([{ age: { equals: 5 } }]) }),
      }),
    )
    expect(api.queue).toHaveBeenLastCalledWith(
      expect.objectContaining({ input: expect.objectContaining({ variantId: 'v5' }) }),
    )
    api.find.mockImplementation(async ({ collection }) => ({
      docs: collection === 'contentVariants' ? [{ ...variant, id: 'v8' }] : [],
    }))
    await invoke(`version=${encodeURIComponent(JSON.stringify({ ...version, age: 8 }))}`)
    expect(api.queue).toHaveBeenLastCalledWith(
      expect.objectContaining({ input: expect.objectContaining({ variantId: 'v8' }) }),
    )
    expect(contentAudioWhere('c1', 'en')).not.toEqual(contentAudioWhere('c1', 'en', 'v5'))
  })
  it('serves a saved variant with Range and revalidates its own fingerprint', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'artaround-audio-'))
    const file = path.join(dir, 'voice.mp3')
    await writeFile(file, Buffer.from([0, 1, 2, 3, 4, 5]))
    try {
      const hash = audioTextHash(contentAudioText({ ...content, body: variant.body }))
      api.find.mockImplementation(async ({ collection }) => ({
        docs: collection === 'contentVariants' ? [variant] : [{ filename: file, textHash: hash }],
      }))
      const range = await invoke(versionQuery, { range: 'bytes=2-4' })
      expect(range.status).toBe(206)
      expect(range.headers.get('content-range')).toBe('bytes 2-4/6')
      expect([...new Uint8Array(await range.arrayBuffer())]).toEqual([2, 3, 4])
      expect((await invoke(versionQuery, { 'if-none-match': `"${hash}"` })).status).toBe(304)
      expect((await invoke(versionQuery, { range: 'bytes=9-' })).status).toBe(416)
      expect(api.queue).not.toHaveBeenCalled()
    } finally {
      await rm(dir, { recursive: true })
    }
  })
})
