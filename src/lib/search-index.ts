import type { Content, Museum, Object as ArtObject, Tour, User } from '@/payload-types'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import type { Payload, PayloadRequest, Where } from 'payload'

/**
 * Collections indexed by `@payloadcms/plugin-search`.
 *
 * The search collection is a derived Payload collection: the plugin keeps one
 * row per source document and calls `buildSearchDoc()` whenever that document
 * changes. Keeping the list here means the plugin config, the reindex script and
 * the marketplace/navigator queries all agree on what is searchable.
 */
export const SEARCH_PLUGIN_COLLECTIONS = [
  'tours',
  'contents',
  'users',
  'museums',
  'objects',
] as const

export type SearchPluginCollection = (typeof SEARCH_PLUGIN_COLLECTIONS)[number]
export type SearchDocKind = 'tour' | 'content' | 'user' | 'museum' | 'object'

export const SEARCH_KINDS: SearchDocKind[] = ['tour', 'content', 'user', 'museum', 'object']

export const SEARCH_KIND_BY_COLLECTION: Record<SearchPluginCollection, SearchDocKind> = {
  tours: 'tour',
  contents: 'content',
  users: 'user',
  museums: 'museum',
  objects: 'object',
}

export const SEARCH_COLLECTION_BY_KIND: Record<SearchDocKind, SearchPluginCollection> = {
  tour: 'tours',
  content: 'contents',
  user: 'users',
  museum: 'museums',
  object: 'objects',
}

/**
 * Cross-collection priority used by the home dropdown. Higher values are shown
 * first: tours lead (starting a tour is the app's main way in), then contents,
 * then museums. The marketplace keeps its own newest-first ordering. Stored per
 * row: run `pnpm search:reindex` after changing these.
 */
export const SEARCH_PRIORITIES: Record<SearchPluginCollection, number> = {
  tours: 10,
  contents: 8,
  museums: 6,
  objects: 5,
  users: 4,
}

/** Fields stored on the generated `search` collection. `doc` and `priority` are
 *  supplied by the plugin / caller and are not part of this payload. */
export type SearchDocData = {
  title: string
  excerpt: string
  kind: SearchDocKind
  city: string
  priceCents: number
  sourceCreatedAt?: string
}

type SearchableDoc = {
  id: string | number
  createdAt?: string | null
  [key: string]: unknown
}

function idOf(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && 'id' in value) {
    return String((value as { id: string | number }).id)
  }
  return null
}

function relationshipIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(idOf).filter((id): id is string => Boolean(id))
}

function joinParts(...parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' · ')
    .slice(0, 2000)
}

function lexicalText(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  try {
    return convertLexicalToPlaintext({ data: value as never }).trim()
  } catch {
    // Search must never fail a save because an editor stored an old/partial
    // rich-text shape.
    return ''
  }
}

function createdAt(value: unknown): string | undefined {
  if (!value) return undefined
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/**
 * Finds the museum whose name and city go into a tour's or object's search
 * text. A tour points at its museum (`tours.museum`); an object is exhibited by
 * the museums whose map places it (`museums.objects`, derived from the map), so
 * the first of those is used.
 */
async function museumForRelation({
  payload,
  relation,
  id,
  museumId,
  req,
}: {
  payload: Payload
  relation: 'tours' | 'objects'
  id: string
  /** Known museum id (tours carry it), skipping the reverse lookup. */
  museumId?: string | null
  req?: PayloadRequest
}) {
  const where = (
    relation === 'tours' ? { id: { equals: museumId ?? '' } } : { objects: { in: [id] } }
  ) as Where
  if (relation === 'tours' && !museumId) return null
  const result = await payload.find({
    collection: 'museums',
    where,
    limit: 1,
    depth: 0,
    locale: 'en',
    overrideAccess: true,
    req,
  })
  const museum = result.docs[0] as Museum | undefined
  if (!museum) return null
  return {
    name: museum.name,
    city: museum.location?.city ?? '',
  }
}

async function findSourceDoc({
  payload,
  collection,
  id,
  req,
}: {
  payload: Payload
  collection: SearchPluginCollection
  id: string
  req?: PayloadRequest
}): Promise<SearchableDoc> {
  return (await payload.findByID({
    collection,
    id,
    depth: 0,
    // The index is deliberately English-only so matching stays stable. Cards
    // are hydrated in the visitor's locale at render time.
    locale: 'en',
    overrideAccess: true,
    req,
  })) as unknown as SearchableDoc
}

/**
 * A tour's list price: the sum of its paid contents (`contents.price`, euro
 * cents), the same rule the tour page and checkout use for a visitor who owns
 * none of them (src/lib/price.ts, src/lib/checkout-quote.ts).
 */
async function tourListPrice({
  payload,
  contentIds,
  req,
}: {
  payload: Payload
  contentIds: string[]
  req?: PayloadRequest
}) {
  if (!contentIds.length) return 0
  const { docs } = await payload.find({
    collection: 'contents',
    where: { id: { in: contentIds } },
    select: { price: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs.reduce((sum, content) => sum + (content.price ?? 0), 0)
}

/**
 * Builds the searchable projection of one source document.
 *
 * This is used by the plugin `beforeSync` hook and by `pnpm search:reindex`, so
 * a normal save and a full rebuild always produce the same row shape.
 */
export async function buildSearchDoc({
  payload,
  collection,
  id,
  req,
}: {
  payload: Payload
  collection: SearchPluginCollection
  id: string
  req?: PayloadRequest
}): Promise<SearchDocData> {
  const doc = await findSourceDoc({ payload, collection, id, req })
  const kind = SEARCH_KIND_BY_COLLECTION[collection]
  const sourceCreatedAt = createdAt(doc.createdAt)

  switch (collection) {
    case 'tours': {
      const tour = doc as unknown as Tour
      const museum = await museumForRelation({
        payload,
        relation: 'tours',
        id,
        museumId: idOf(tour.museum),
        req,
      })
      return {
        title: tour.title,
        excerpt: joinParts(tour.description, museum?.name, museum?.city),
        kind,
        city: museum?.city ?? '',
        priceCents: await tourListPrice({
          payload,
          contentIds: relationshipIds(tour.contents),
          req,
        }),
        sourceCreatedAt,
      }
    }
    case 'contents': {
      const content = doc as unknown as Content
      return {
        title: content.title,
        // A paid body is readable only by entitled visitors (`canReadPaidBody`),
        // so it never enters the index: it would be matchable, and shown as a
        // result subtitle, for everyone. Paid contents are found by title.
        excerpt: (content.price ?? 0) > 0 ? '' : joinParts(lexicalText(content.body)),
        kind,
        city: '',
        priceCents: content.price ?? 0,
        sourceCreatedAt,
      }
    }
    case 'users': {
      const user = doc as unknown as User
      const name =
        user.name?.fullName ||
        [user.name?.firstName, user.name?.lastName].filter(Boolean).join(' ').trim() ||
        user.username
      return {
        title: name,
        excerpt: joinParts(user.username, user.description, user.bio),
        kind,
        city: '',
        priceCents: 0,
        sourceCreatedAt,
      }
    }
    case 'museums': {
      const museum = doc as unknown as Museum
      return {
        title: museum.name,
        excerpt: joinParts(
          museum.shortDescription,
          lexicalText(museum.description),
          museum.location?.city,
          museum.location?.region,
        ),
        kind,
        city: museum.location?.city ?? '',
        priceCents: 0,
        sourceCreatedAt,
      }
    }
    case 'objects': {
      const object = doc as unknown as ArtObject
      const museum = await museumForRelation({ payload, relation: 'objects', id, req })
      return {
        title: object.name,
        excerpt: joinParts(object.artist, object.description, museum?.name, museum?.city),
        kind,
        city: museum?.city ?? '',
        priceCents: 0,
        sourceCreatedAt,
      }
    }
    default:
      return {
        title: '',
        excerpt: '',
        kind: 'object',
        city: '',
        priceCents: 0,
        sourceCreatedAt,
      }
  }
}

/**
 * Refreshes search rows for tours/objects after a museum changes.
 *
 * The plugin only re-syncs the document that was saved, but a museum's name and
 * city are part of its tours/objects search text. The museum hooks call this for
 * both the new and previous relationship values so removed relations are
 * refreshed too.
 */
export async function refreshSearchDocs({
  payload,
  collection,
  ids,
  req,
}: {
  payload: Payload
  collection: Extract<SearchPluginCollection, 'tours' | 'objects'>
  ids: string[]
  req?: PayloadRequest
}) {
  const uniqueIds = [...new Set(ids.filter(Boolean))]
  if (uniqueIds.length === 0) return

  const existing = await payload.find({
    collection: 'search',
    where: {
      and: [{ 'doc.relationTo': { equals: collection } }, { 'doc.value': { in: uniqueIds } }],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })

  const bySourceId = new Map<string, (typeof existing.docs)[number]>()
  for (const searchDoc of existing.docs) {
    const relation = searchDoc.doc as { relationTo?: string; value?: string } | undefined
    if (relation?.value) bySourceId.set(String(relation.value), searchDoc)
  }

  for (const id of uniqueIds) {
    try {
      const data = await buildSearchDoc({ payload, collection, id, req })
      const current = bySourceId.get(id)
      if (current) {
        await payload.update({
          collection: 'search',
          id: current.id,
          data,
          overrideAccess: true,
          req,
        })
      } else {
        await payload.create({
          collection: 'search',
          data: {
            ...data,
            doc: { relationTo: collection, value: id },
            priority: SEARCH_PRIORITIES[collection],
          },
          overrideAccess: true,
          req,
        })
      }
    } catch (error) {
      // One stale relation must not roll back the museum save or block the
      // remaining dependent documents.
      payload.logger.error({
        collection,
        err: error,
        msg: `Could not refresh search row for ${collection}:${id}`,
      })
    }
  }
}

/** Collects relationship ids from a museum's `tours`/`objects` fields. */
export function museumRelationIds(
  museum: { tours?: unknown; objects?: unknown } | null | undefined,
  relation: 'tours' | 'objects',
) {
  return relationshipIds(museum?.[relation])
}
