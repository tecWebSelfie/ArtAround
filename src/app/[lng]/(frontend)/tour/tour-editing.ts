import 'server-only'

import type { TourCandidate } from '@/components/editing/forms/TourForm'
import { isLocked } from '@/lib/price'
import { asViewer, getSession } from '@/lib/session'
import type { Museum } from '@/payload-types'

/**
 * Data for the tour editor: the contents a tour of this museum can include,
 * i.e. the contents of the objects its map exhibits (`museums.objects`).
 * Read as the visitor, so `locked` reflects what they can actually read.
 */

export async function getTourEditorData(museumId: string) {
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
  return { museum: { id: String(museum.id), name: museum.name }, candidates }
}
