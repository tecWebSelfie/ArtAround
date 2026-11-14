import { asId } from '@/access/museumRoles'
import { refreshSearchDocs, relationshipIds } from '@/lib/search-index'
import {
  museumPlacedObjects,
  visitableTour,
  type NavigationCatalogObject,
} from '@/lib/tour-navigation'
import type { Content, Museum, Tour } from '@/payload-types'
import type { Payload, PayloadRequest, Where } from 'payload'

/**
 * The stored "visitable stops" of a tour: `tours.visitableStops` (count) and
 * `tours.visitableContents` (the ids, in tour order).
 *
 * Product rule: a stop that cannot be visited (its content is gone or not
 * readable, is about no object, or its object is not placed on the museum
 * map: `unavailableStops`) is never shown to a visitor. Navigation applies
 * the rule live (`visitableTour`); everything else (the tour page, the cards,
 * the counts, the lists and the search index) needs it in a query or on a
 * list of tours read without the museum's map, so it is stored on the tour
 * and kept up to date by the hooks below. The rule itself is NOT defined
 * twice: `computeVisitableContentIds` builds the same inputs navigation has
 * (placed objects, catalog, stops) and calls `visitableTour`.
 *
 * Who keeps it fresh (docs/permissions-and-editing.md → Visitable stops):
 * the tour's own save (`beforeChange`), the museum's map (`Museums.ts`), an
 * object's contents (`Objects.ts`) and a content's deletion, visibility or
 * author (`Contents.ts`). `scripts/backfill-visitable-stops.ts` fills tours
 * saved before the field existed.
 */

type TourStops = Pick<Tour, 'contents' | 'museum' | 'author'>

/**
 * The ids of the tour's visitable stops, in tour order (duplicates kept, so
 * the count is the length of what a visitor sees). Reads with `overrideAccess`
 * and judges readability itself: a visitor reads a public content or the
 * tour author's own private one (the group-cookie rule of `readContents`);
 * `e7652cc` keeps other authors' private contents out of tours, legacy ones
 * count as unavailable here, as they do in navigation.
 */
export async function computeVisitableContentIds(
  payload: Payload,
  req: PayloadRequest | undefined,
  tour: TourStops,
  /** Museums already read by this run (a museum's tours share one read). */
  museums: Map<string, Promise<Pick<Museum, 'map'> | null>> = new Map(),
): Promise<string[]> {
  const stopIds = relationshipIds(tour.contents)
  const museumId = asId(tour.museum)
  if (!stopIds.length || !museumId) return []
  const authorId = asId(tour.author)

  const [museum, stops, owners] = await Promise.all([
    museums.get(museumId) ??
      (() => {
        const read = payload
          .findByID({
            collection: 'museums',
            id: museumId,
            select: { map: true },
            depth: 0,
            overrideAccess: true,
            req,
          })
          .catch(() => null)
        museums.set(museumId, read)
        return read
      })(),
    payload.find({
      collection: 'contents',
      where: { id: { in: stopIds } },
      select: { visibility: true, author: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    }),
    // The authored relation `objects.contents` is what the content's `objects`
    // join and the navigation catalog both read: a content belongs to at most
    // one object (`validateExclusiveContents`).
    payload.find({
      collection: 'objects',
      where: { contents: { in: stopIds } },
      select: { name: true, contents: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    }),
  ])
  // A museum that is gone leaves nothing to visit.
  if (!museum) return []

  const readable = new Set(
    stops.docs
      .filter((doc) => doc.visibility !== 'private' || (authorId && asId(doc.author) === authorId))
      .map((doc) => String(doc.id)),
  )
  // An unreadable or missing content arrives unpopulated (a bare id), like a
  // read of the tour as the visitor gives it.
  const contents = stopIds.map((id) =>
    readable.has(id) ? ({ id } as unknown as Content) : id,
  ) as Tour['contents']
  const catalog = owners.docs.map((object) => ({
    id: String(object.id),
    name: object.name,
    contents: relationshipIds(object.contents).map((id) => ({ id, title: '' })),
  })) as NavigationCatalogObject[]

  return visitableTour({ contents }, catalog, museumPlacedObjects(museum)).contents.map(
    (content) => (typeof content === 'string' ? content : content.id),
  )
}

/** The stored fields for a set of visitable ids (written by the hooks and the backfill). */
export const visitableFields = (ids: string[]) => ({
  visitableStops: ids.length,
  visitableContents: ids,
})

/**
 * Recomputes the stored stops of every tour matching `where` and writes the
 * ones that actually changed, then refreshes their search rows (a tour that
 * just lost its last visitable stop leaves the index, one that regained a
 * stop re-enters it: `isUnlistedInSearch`).
 *
 * The write goes straight to the database adapter (`db.updateOne`), through
 * `req` so it joins the caller's transaction: it is derived data, so it
 * must not run the tours' hooks (validation of the whole tour, quiz cleanup,
 * search sync, `updatedAt`), and with no hooks it cannot loop back into the
 * collections that call this. One tour after the other: a MongoDB session
 * does not take concurrent operations reliably (see `Objects.ts`).
 * Returns the ids it changed.
 */
export async function refreshVisitableStops({
  payload,
  req,
  where,
}: {
  payload: Payload
  req?: PayloadRequest
  where: Where
}): Promise<string[]> {
  const { docs } = await payload.find({
    collection: 'tours',
    where,
    select: {
      contents: true,
      museum: true,
      author: true,
      visitableStops: true,
      visitableContents: true,
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const changed: string[] = []
  const museums = new Map<string, Promise<Pick<Museum, 'map'> | null>>()
  for (const tour of docs) {
    const ids = await computeVisitableContentIds(payload, req, tour as TourStops, museums)
    const stored = relationshipIds(tour.visitableContents)
    if (tour.visitableStops === ids.length && stored.join() === ids.join()) continue
    await payload.db.updateOne({
      collection: 'tours',
      id: tour.id,
      data: visitableFields(ids),
      returning: false,
      req,
    })
    changed.push(String(tour.id))
  }
  await refreshSearchDocs({ payload, collection: 'tours', ids: changed, req })
  return changed
}

/**
 * The tours that include any of these contents (a content's visibility or
 * deletion, an object's contents): `refreshVisitableStops` over them. Derived
 * data, so a failure is logged and never fails the save that triggered it.
 */
export async function refreshVisitableStopsOfContents({
  payload,
  req,
  contentIds,
}: {
  payload: Payload
  req?: PayloadRequest
  contentIds: string[]
}) {
  const ids = [...new Set(contentIds.filter(Boolean))]
  if (!ids.length) return
  try {
    await refreshVisitableStops({ payload, req, where: { contents: { in: ids } } })
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Could not refresh the visitable stops of tours' })
  }
}
