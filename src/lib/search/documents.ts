import { displayName } from '@/lib/display-name'
import { relationshipIds } from '@/lib/relationship-ids'
import { isEmptyTour, isPersonalTour } from '@/lib/tour-stops'
import { withVisitableStops } from '@/lib/tour-summary'
import type { Content, Museum, Object as ArtObject, Tour, User } from '@/payload-types'
import type { Payload, PayloadRequest, Where } from 'payload'
import {
  SEARCH_KIND_BY_COLLECTION,
  SEARCH_PRIORITIES,
  type SearchCollection,
  type SearchDocument,
} from './types'

/**
 * Builds one Typesense document from a Payload source document.
 *
 * This is the single projection used by the Payload hooks and by
 * `pnpm search:reindex`, so a normal save and a full rebuild always produce the
 * same shape. The index is deliberately English-only: result cards are
 * hydrated in the visitor's locale from the original documents.
 */

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

function joinParts(...parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' · ')
    .slice(0, 2000)
}

function createdAtEpoch(value: unknown): number | undefined {
  if (!value) return undefined
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? undefined : Math.floor(date.getTime() / 1000)
}

type MuseumRef = { id: string; name: string; city: string; region: string }

async function museumsWhere({
  payload,
  where,
  req,
}: {
  payload: Payload
  where: Where
  req?: PayloadRequest
}): Promise<MuseumRef[]> {
  const { docs } = await payload.find({
    collection: 'museums',
    where,
    select: { name: true, location: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    locale: 'en',
    req,
  })
  return (docs as Museum[]).map((museum) => ({
    id: String(museum.id),
    name: museum.name,
    city: museum.location?.city ?? '',
    region: museum.location?.region ?? '',
  }))
}

/**
 * Museums a document is shown in.
 *
 * A tour names its museum (`tours.museum`); an object is exhibited by the
 * museums whose map places it (`museums.objects`, the join behind the object's
 * `museums` field); a content belongs to the museums of the objects it
 * describes; a person to the museums of their tours and contents.
 */
async function museumsForContent({
  payload,
  contentIds,
  req,
}: {
  payload: Payload
  contentIds: string[]
  req?: PayloadRequest
}): Promise<MuseumRef[]> {
  if (contentIds.length === 0) return []
  const { docs: objects } = await payload.find({
    collection: 'objects',
    where: { contents: { in: contentIds } },
    select: {},
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const objectIds = objects.map((object) => String(object.id))
  if (objectIds.length === 0) return []
  return museumsWhere({ payload, where: { objects: { in: objectIds } }, req })
}

async function museumsForObject({
  payload,
  objectId,
  req,
}: {
  payload: Payload
  objectId: string
  req?: PayloadRequest
}) {
  return museumsWhere({ payload, where: { objects: { in: [objectId] } }, req })
}

async function findSourceDoc({
  payload,
  collection,
  id,
  req,
}: {
  payload: Payload
  collection: SearchCollection
  id: string
  req?: PayloadRequest
}): Promise<SearchableDoc | null> {
  try {
    return (await payload.findByID({
      collection,
      id,
      depth: 0,
      locale: 'en',
      overrideAccess: true,
      req,
    })) as unknown as SearchableDoc
  } catch {
    // Deleted between a list read and this projection: nothing to index.
    return null
  }
}

/** Prices, lengths and difficulties of a tour's stops, in one read. */
async function tourStops({
  payload,
  contentIds,
  req,
}: {
  payload: Payload
  contentIds: string[]
  req?: PayloadRequest
}) {
  if (contentIds.length === 0) return []
  const { docs } = await payload.find({
    collection: 'contents',
    where: { id: { in: contentIds } },
    select: { price: true, durationSeconds: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs
}

/**
 * Subjects a set of contents is about.
 *
 * The relation is stored on the subject (`subjects.contents`), so it is read
 * backwards: the ids are what a "See all" link's `?subject=` filters on, for the
 * contents themselves and for the tours that stop at them.
 */
async function subjectIdsOfContents({
  payload,
  contentIds,
  req,
}: {
  payload: Payload
  contentIds: string[]
  req?: PayloadRequest
}): Promise<string[] | undefined> {
  if (contentIds.length === 0) return undefined
  const { docs } = await payload.find({
    collection: 'subjects',
    where: { contents: { in: contentIds } },
    select: {},
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs.length > 0 ? docs.map((subject) => String(subject.id)) : undefined
}

export async function buildSearchDocument({
  payload,
  collection,
  id,
  req,
  source,
}: {
  payload: Payload
  collection: SearchCollection
  id: string
  req?: PayloadRequest
  /** Already-read source document (hooks, reindex): skips the extra read. */
  source?: Record<string, unknown>
}): Promise<SearchDocument | null> {
  const doc =
    (source as SearchableDoc | undefined) ?? (await findSourceDoc({ payload, collection, id, req }))
  if (!doc) return null

  const kind = SEARCH_KIND_BY_COLLECTION[collection]
  const base = {
    id: `${kind}_${id}`,
    source_id: id,
    kind,
    priority: SEARCH_PRIORITIES[collection],
    source_created_at: createdAtEpoch(doc.createdAt),
  }

  switch (collection) {
    case 'tours': {
      const tour = doc as unknown as Tour
      const museumId = idOf(tour.museum)
      const museums = museumId
        ? await museumsWhere({ payload, where: { id: { equals: museumId } }, req })
        : []
      const museum = museums[0]
      // Visitable stops only, as the card, tour page and checkout count them
      // (`withVisitableStops`): otherwise the price and duration filters
      // disagree with the tour once a paid stop stops being visitable.
      const stopIds = relationshipIds(withVisitableStops(tour).contents)
      const [stops, subjectIds] = await Promise.all([
        tourStops({ payload, contentIds: stopIds, req }),
        subjectIdsOfContents({ payload, contentIds: stopIds, req }),
      ])
      const stopSeconds = stops.reduce((sum, stop) => sum + (stop.durationSeconds ?? 0), 0)
      const seconds = tour.durationMinutes ? tour.durationMinutes * 60 : stopSeconds
      return {
        ...base,
        title: tour.title,
        excerpt: joinParts(museum?.name, museum?.city),
        // Descriptions only for public documents: a tour is never a paid body.
        description: tour.description || undefined,
        city: museum?.city || undefined,
        museum_id: museums.map((entry) => entry.id),
        museum_name: museum?.name,
        author_id: idOf(tour.author) ?? undefined,
        // The tour is about a subject when one of its stops is.
        subject_ids: subjectIds,
        duration_seconds: seconds || undefined,
        price_cents: stops.reduce((sum, stop) => sum + (stop.price ?? 0), 0),
      }
    }
    case 'contents': {
      const content = doc as unknown as Content
      const [museums, subjectIds] = await Promise.all([
        museumsForContent({ payload, contentIds: [id], req }),
        subjectIdsOfContents({ payload, contentIds: [id], req }),
      ])
      return {
        ...base,
        title: content.title,
        // Never the rich-text body: a paid text must not be matchable.
        excerpt: '',
        city: museums[0]?.city || undefined,
        museum_id: museums.map((entry) => entry.id),
        museum_name: museums[0]?.name,
        author_id: idOf(content.author) ?? undefined,
        subject_ids: subjectIds,
        difficulty: content.difficulty ?? undefined,
        duration_seconds: content.durationSeconds ?? undefined,
        price_cents: content.price ?? 0,
      }
    }
    case 'objects': {
      const object = doc as unknown as ArtObject
      const museums = await museumsForObject({ payload, objectId: id, req })
      // The three ways a work names a subject (`src/collections/Objects.ts`).
      const subjectIds = [
        ...new Set([
          ...relationshipIds(object.creators),
          ...relationshipIds(object.movements),
          ...relationshipIds(object.events),
        ]),
      ]
      return {
        ...base,
        title: object.name,
        excerpt: joinParts(object.artist, museums[0]?.name),
        description: object.description || undefined,
        city: museums[0]?.city || undefined,
        museum_id: museums.map((entry) => entry.id),
        museum_name: museums[0]?.name,
        subject_ids: subjectIds.length > 0 ? subjectIds : undefined,
        artist: object.artist || undefined,
      }
    }
    case 'museums': {
      const museum = doc as unknown as Museum
      return {
        ...base,
        title: museum.name,
        excerpt: joinParts(museum.location?.city, museum.location?.region),
        city: museum.location?.city || undefined,
        museum_id: [id],
        museum_name: museum.name,
      }
    }
    case 'users': {
      const user = doc as unknown as User
      const name = displayName(user)
      const [tours, contents] = await Promise.all([
        payload.find({
          collection: 'tours',
          where: { author: { equals: id } },
          select: { museum: true },
          depth: 0,
          pagination: false,
          overrideAccess: true,
          req,
        }),
        payload.find({
          collection: 'contents',
          where: { author: { equals: id } },
          select: {},
          depth: 0,
          pagination: false,
          overrideAccess: true,
          req,
        }),
      ])
      const tourMuseums = tours.docs
        .map((tour) => idOf(tour.museum))
        .filter((museumId): museumId is string => Boolean(museumId))
      const contentMuseums = await museumsForContent({
        payload,
        contentIds: contents.docs.map((content) => String(content.id)),
        req,
      })
      const museumIds = [...new Set([...tourMuseums, ...contentMuseums.map((entry) => entry.id)])]
      return {
        ...base,
        title: name,
        // Username stays searchable; description and bio are not indexed.
        excerpt: joinParts(user.username),
        museum_id: museumIds.length > 0 ? museumIds : undefined,
      }
    }
    default:
      return null
  }
}

/**
 * Documents that never get a search row: private contents and tours, the
 * personal tours (a planned visit, a visitor's own copy) and tours with no
 * visitable stop (`LISTED_TOURS`; both rules in `src/lib/tour-stops.ts`).
 * The hooks delete the Typesense document when a document becomes unlisted.
 */
export function isUnlistedInSearch(doc: unknown): boolean {
  return (
    (doc as { visibility?: string | null } | null)?.visibility === 'private' ||
    isPersonalTour(doc) ||
    isEmptyTour(doc)
  )
}
