import type { Payload, TypedLocale } from 'payload'
import { isPopulated } from '@/lib/isPopulated'
import { PICTURE_SELECT } from '@/lib/picture'
import type { asViewer } from '@/lib/session'
import type { Content, Tour } from '@/payload-types'

/**
 * Fills in the works each stop of a tour talks about.
 *
 * `contents.objects` is a join, and Payload resolves joins only on the
 * documents a read returns at its top level: on a tour's populated contents
 * the join comes back as bare object ids, whatever the depth. Without this
 * step `stopImage` finds no work thumbnail and every stop without its own
 * image shows the generic icon.
 *
 * One `find` for every work of the tour, read as the visitor (`viewer`), so
 * access rules still apply; ids it can't read stay ids.
 */
export async function withStopObjects(
  payload: Payload,
  tour: Tour,
  locale: TypedLocale,
  viewer: Awaited<ReturnType<typeof asViewer>>,
): Promise<Tour> {
  const objectId = (doc: string | { id: string }) => (typeof doc === 'string' ? doc : doc.id)
  const ids = [
    ...new Set(
      (tour.contents ?? [])
        .filter(isPopulated)
        .flatMap((content) => (content.objects?.docs ?? []).map(objectId)),
    ),
  ]
  if (ids.length === 0) return tour

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
  const byId = new Map(docs.map((doc) => [doc.id, doc]))

  const withObjects = (content: Content): Content =>
    content.objects?.docs
      ? {
          ...content,
          objects: {
            ...content.objects,
            docs: content.objects.docs.map((doc) => byId.get(objectId(doc)) ?? doc),
          },
        }
      : content

  return {
    ...tour,
    contents: tour.contents?.map((content) =>
      isPopulated(content) ? withObjects(content) : content,
    ),
  }
}
