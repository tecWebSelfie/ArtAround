import 'server-only'

import type { TourCandidate } from '@/components/editing/forms/TourForm'
import { asId } from '@/access/museumRoles'
import { isLocked } from '@/lib/price'
import { copyableStops } from '@/lib/tour-copy'
import { asViewer, getSession } from '@/lib/session'
import type { Museum, Tour } from '@/payload-types'

/**
 * The visitor's existing visit copy (`tours.visitCopyOf`) for "Edit" on
 * `source`: `source` itself when it is their copy, else their latest copy of
 * it; null means make one.
 */
export async function existingVisitCopy(
  source: Pick<Tour, 'id' | 'author' | 'visitCopyOf'>,
): Promise<string | null> {
  const { payload, user } = await getSession()
  if (!user) return null
  if (source.visitCopyOf && asId(source.author) === String(user.id)) return source.id
  const { docs } = await payload.find({
    collection: 'tours',
    where: { visitCopyOf: { equals: source.id }, author: { equals: user.id } },
    sort: '-updatedAt',
    limit: 1,
    // One query: no total count to compute.
    pagination: false,
    depth: 0,
    select: {},
    ...(await asViewer()),
  })
  return docs[0]?.id ?? null
}

/**
 * Data for the tour editor: the contents a tour of this museum can include,
 * i.e. the contents of the objects its map exhibits (`museums.objects`).
 * Read as the visitor, so `locked` reflects what they can actually read.
 * `stopIds` (the tour being edited or copied) adds its stops that are no
 * longer candidates, flagged (see `getUnavailableStops`).
 */

export async function getTourEditorData(museumId: string, stopIds: string[] = []) {
  const { payload } = await getSession()
  const viewer = await asViewer()
  const museum: Pick<Museum, 'id' | 'name' | 'objects'> = await payload.findByID({
    collection: 'museums',
    id: museumId,
    depth: 0,
    select: { name: true, objects: true },
    ...viewer,
  })
  const objectIds = (museum.objects ?? []).map((object) =>
    typeof object === 'string' ? object : object.id,
  )
  const objects = objectIds.length
    ? await payload.find({
        collection: 'objects',
        where: { id: { in: objectIds } },
        depth: 1,
        pagination: false,
        select: { name: true, contents: true },
        populate: { contents: { title: true, price: true, body: true } },
        ...viewer,
      })
    : { docs: [] }

  const candidates: TourCandidate[] = objects.docs.flatMap((object) =>
    (object.contents ?? []).flatMap((content) =>
      typeof content === 'object'
        ? [
            {
              id: content.id,
              title: content.title,
              objectName: object.name,
              price: content.price ?? 0,
              locked: isLocked(content),
            },
          ]
        : [],
    ),
  )
  return {
    museum: { id: String(museum.id), name: museum.name },
    candidates: [...candidates, ...(await getUnavailableStops(stopIds, candidates))],
  }
}

/**
 * The tour's own stops that are not candidates any more: their object left
 * the museum map, or the content is gone. The editor keeps them, flagged,
 * instead of silently dropping them on save; the author decides. Deleted
 * contents come back with no title (the form names them generically).
 */
async function getUnavailableStops(
  contentIds: string[],
  candidates: TourCandidate[],
): Promise<TourCandidate[]> {
  const known = new Set(candidates.map((candidate) => candidate.id))
  const missing = contentIds.filter((id) => !known.has(id))
  if (missing.length === 0) return []
  const { payload } = await getSession()
  const found = await payload.find({
    collection: 'contents',
    where: { id: { in: missing } },
    depth: 1,
    pagination: false,
    select: { title: true, price: true, body: true, objects: true },
    populate: { objects: { name: true } },
    ...(await asViewer()),
  })
  const byId = new Map(found.docs.map((content) => [String(content.id), content]))
  return missing.map((id) => {
    const content = byId.get(id)
    const object = content?.objects?.docs?.[0]
    return {
      id,
      title: content?.title ?? '',
      objectName: typeof object === 'object' && object ? object.name : '',
      price: content?.price ?? 0,
      locked: content ? isLocked(content) : false,
      unavailable: true,
    }
  })
}

/**
 * Editor data for a NEW tour (`/tour/new`), blank or a COPY of another one
 * (`?from=<id>`, whose stops are `sourceStopIds`): the museum's
 * candidates plus the original's stops the visitor can keep and visit, in
 * order (`copyableStops`). Unlike the editor of an existing tour, nothing is
 * flagged: the author fixes their own tour's unavailable stops there, a copy
 * just starts without them. A stop is unavailable exactly when it is not a
 * candidate (`getUnavailableStops`' own definition), so no stop ids are
 * passed to `getTourEditorData`, which skips that lookup.
 */
export async function getNewTourEditorData(museumId: string, sourceStopIds: string[] = []) {
  const { payload, user } = await getSession()
  const data = await getTourEditorData(museumId)
  const candidateIds = new Set(data.candidates.map((candidate) => candidate.id))
  const ofCandidates = sourceStopIds.filter((id) => candidateIds.has(id))
  // The visibility and author of the stops: read as the visitor, so contents
  // they can't read are absent and drop out with the private ones of others.
  const { docs } = ofCandidates.length
    ? await payload.find({
        collection: 'contents',
        where: { id: { in: ofCandidates } },
        depth: 0,
        pagination: false,
        select: { visibility: true, author: true },
        ...(await asViewer()),
      })
    : { docs: [] }
  const stops = copyableStops({
    stopIds: sourceStopIds,
    candidateIds,
    contents: docs.map((doc) => ({
      id: String(doc.id),
      visibility: doc.visibility,
      author: asId(doc.author) ?? '',
    })),
    viewerId: String(user?.id ?? ''),
  })
  return { ...data, stops }
}
