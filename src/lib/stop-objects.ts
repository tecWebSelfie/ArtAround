import type { Payload, TypedLocale } from 'payload'
import { isPopulated } from '@/lib/isPopulated'
import { PICTURE_SELECT } from '@/lib/picture'
import type { asViewer } from '@/lib/session'
import type { Content, Object as ArtObject, Tour } from '@/payload-types'

type Viewer = Awaited<ReturnType<typeof asViewer>> | { overrideAccess: true }

/**
 * Fills in the works contents talk about (name and thumbnail).
 *
 * `contents.objects` is a join, and Payload doesn't populate further into a
 * join's documents: on a tour's populated contents the join comes back as
 * bare ids, and on a content read directly its works come back without their
 * thumbnails, whatever the depth. Without this step `stopPicture` finds no
 * work photo and stops without their own image show the generic icon.
 *
 * One `find` for every work of the given contents; ids the reader can't see
 * stay as they were.
 */
export async function withContentObjects(
  payload: Payload,
  contents: Content[],
  locale: TypedLocale,
  viewer: Viewer,
): Promise<Content[]> {
  const objectId = (doc: string | { id: string }) => (typeof doc === 'string' ? doc : doc.id)
  const ids = [
    ...new Set(contents.flatMap((content) => (content.objects?.docs ?? []).map(objectId))),
  ]
  if (ids.length === 0) return contents

  const { docs } = await payload.find({
    collection: 'objects',
    where: { id: { in: ids } },
    select: { name: true, thumbnail: true },
    populate: { objectsThumbnails: PICTURE_SELECT },
    depth: 1,
    limit: ids.length,
    pagination: false,
    locale,
    ...viewer,
  })
  // Partial documents (the select above), typed as whole ones the way a
  // `populate` select is: readers only touch name and thumbnail.
  const byId = new Map(docs.map((doc) => [doc.id, doc as ArtObject]))

  return contents.map((content) =>
    content.objects?.docs
      ? {
          ...content,
          objects: {
            ...content.objects,
            docs: content.objects.docs.map((doc) => byId.get(objectId(doc)) ?? doc),
          },
        }
      : content,
  )
}

/** `withContentObjects` over a tour's populated stops, read as the visitor. */
export async function withStopObjects(
  payload: Payload,
  tour: Tour,
  locale: TypedLocale,
  viewer: Viewer,
): Promise<Tour> {
  const filled = await withContentObjects(
    payload,
    (tour.contents ?? []).filter(isPopulated),
    locale,
    viewer,
  )
  const byId = new Map(filled.map((content) => [content.id, content]))
  return {
    ...tour,
    contents: tour.contents?.map((content) =>
      isPopulated(content) ? (byId.get(content.id) ?? content) : content,
    ),
  }
}
