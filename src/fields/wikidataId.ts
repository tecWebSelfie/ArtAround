import { WIKIDATA_ID } from '@/lib/wikidata'
import { APIError, type CollectionBeforeValidateHook, type TextField } from 'payload'

/**
 * The universal identifier of a work or subject: its Wikidata item
 * (`src/lib/wikidata.ts`). Shared by `objects` and `subjects`.
 */
export const wikidataIdField = (description: string): TextField => ({
  name: 'wikidataId',
  type: 'text',
  index: true,
  admin: { description },
})

/**
 * One document per Wikidata item in a collection. Checked in a hook instead of
 * a unique index: most documents have no Q-id, and a plain unique index would
 * treat all those empty values as duplicates.
 */
export const uniqueWikidataId =
  (collection: 'objects' | 'subjects'): CollectionBeforeValidateHook =>
  async ({ data, req, originalDoc }) => {
    const wikidataId = data?.wikidataId
    if (!wikidataId) return data
    if (!WIKIDATA_ID.test(wikidataId)) throw new APIError('A Wikidata id looks like Q12345.', 400)
    const { docs } = await req.payload.find({
      collection,
      where: { wikidataId: { equals: wikidataId } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
    })
    if (docs[0] && String(docs[0].id) !== String(originalDoc?.id)) {
      throw new APIError(`"${docs[0].name}" already has the Wikidata id ${wikidataId}.`, 400)
    }
    return data
  }
