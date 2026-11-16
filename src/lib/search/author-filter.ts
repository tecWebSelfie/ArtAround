import type { Payload } from 'payload'

/**
 * Resolve a profile's authored documents into a filter for the shared
 * Typesense index. Keeping the author lookup here lets search stay full-text
 * and visibility-aware without duplicating author filtering across pages.
 */
export async function authorSourceFilter(
  payload: Payload,
  collection: 'tours' | 'contents',
  authorId: string | undefined,
): Promise<{ kind: 'unfiltered' } | { kind: 'empty' } | { kind: 'filter'; value: string }> {
  if (!authorId) return { kind: 'unfiltered' }

  const { docs } = await payload.find({
    collection,
    where: { author: { equals: authorId } },
    select: {},
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const ids = docs.map((doc) => String(doc.id))

  // An empty scope must remain empty; omitting its Typesense filter would
  // accidentally turn a profile search into a site-wide search.
  if (ids.length === 0) return { kind: 'empty' }

  // `source_id` is a faceted field in the shared index. These IDs come from
  // Payload, and quoting them keeps the Typesense list syntax unambiguous.
  const values = ids.map((id) => `\`${id.replaceAll('`', '')}\``)
  return { kind: 'filter', value: `source_id:=[${values.join(',')}]` }
}
