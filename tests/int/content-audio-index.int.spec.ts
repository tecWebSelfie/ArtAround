import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { ensureContentAudioVariantIndex } from '@/lib/content-audio-index'

/**
 * The `onInit` upgrade of the `contentAudio` unique index
 * (`src/lib/content-audio-index.ts`): it runs at every boot, so it must also
 * boot an empty database (CI, a new deployment), where the collection does
 * not exist yet and MongoDB answers `listIndexes` with NamespaceNotFound.
 * Only the MongoDB driver collection is faked.
 */
function payloadWith(collection: Record<string, unknown>) {
  return { db: { collections: { contentAudio: { collection } } } } as unknown as Payload
}

describe('contentAudio index upgrade at boot', () => {
  it('boots a fresh database whose collection does not exist yet', async () => {
    const createIndex = vi.fn()
    const collection = {
      indexes: vi.fn(async () => {
        throw Object.assign(new Error('ns does not exist'), { code: 26 })
      }),
      createIndex,
      dropIndex: vi.fn(),
    }

    await expect(ensureContentAudioVariantIndex(payloadWith(collection))).resolves.toBeUndefined()
  })

  it('replaces the old content+locale index after creating the new one', async () => {
    const calls: string[] = []
    const collection = {
      indexes: async () => [
        { name: '_id_', key: { _id: 1 } },
        { name: 'content_1_locale_1', unique: true, key: { content: 1, locale: 1 } },
      ],
      createIndex: async () => void calls.push('create'),
      dropIndex: async (name: string) => void calls.push(`drop ${name}`),
    }

    await ensureContentAudioVariantIndex(payloadWith(collection))

    expect(calls).toEqual(['create', 'drop content_1_locale_1'])
  })

  it('still fails on other database errors', async () => {
    const collection = {
      indexes: async () => {
        throw Object.assign(new Error('not authorized'), { code: 13 })
      },
    }

    await expect(ensureContentAudioVariantIndex(payloadWith(collection))).rejects.toThrow(
      'not authorized',
    )
  })
})
