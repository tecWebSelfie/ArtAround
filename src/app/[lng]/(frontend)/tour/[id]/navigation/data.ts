import config from '@/payload.config'
import { getPayload } from 'payload'
import { cache } from 'react'
import { normalizeLocale } from '@/lib/localized'
export { getLocalizedPageDocument as getNavigationDocument } from '@/lib/localized-page'
import { validateBuildJson } from '@pascal-app/core'
import { placedObjectIds, type NavigationCatalogObject } from '@/lib/tour-navigation'
import type { Museum } from '@/payload-types'
import { isLocked } from '@/lib/price'
import { asViewer } from '@/lib/session'

/**
 * Server reads shared by the persistent tour shell and its parallel modal slot.
 * Keeping them here lets both route branches use the same Payload data contract.
 */

/** React.cache deduplicates the same tour lookup when the shell and modal both need it. */
export const getNavigationTour = cache(async (id: string) => {
  const payload = await getPayload({ config })
  // `museum` is the tour's own relationship (depth 1 populates it for the shell).
  return payload.findByID({
    collection: 'tours',
    id,
    depth: 1,
    populate: { contents: { title: true, difficulty: true, readingTimeMins: true, objects: true } },
  })
})

/**
 * Builds the museum-scoped Spotlight catalog from the objects placed on its
 * Pascal map. Only summaries cross into the client; full localized copy is
 * fetched when a visitor opens an object or content.
 */
export async function getNavigationCatalog(
  museum: Museum,
  lng: string,
): Promise<NavigationCatalogObject[]> {
  const payload = await getPayload({ config })
  // `museums.objects` is the map-derived index; maps saved before that index
  // existed are read directly so older museums keep their catalog.
  const ids = new Set(
    (museum.objects ?? []).map((entry) => (typeof entry === 'string' ? entry : entry.id)),
  )
  for (const id of placedObjectIds(validateBuildJson(museum.map).parsed)) ids.add(id)
  if (!ids.size) return []
  const objects = await payload.find({
    collection: 'objects',
    where: { id: { in: [...ids] } },
    select: { name: true, contents: true },
    // `price` + `body` let the server tell paid-and-locked contents apart.
    // Read as the visitor: field access withholds `body` exactly when they
    // aren't entitled to it, so `isLocked` needs no rules of its own.
    populate: { contents: { title: true, price: true, body: true } },
    locale: normalizeLocale(lng) ?? 'en',
    depth: 1,
    pagination: false,
    ...(await asViewer()),
  })
  return objects.docs.map((object) => ({
    id: object.id,
    name: object.name,
    // Only the summary crosses into the client: the body stays on the server.
    contents: (object.contents ?? []).flatMap((content) =>
      typeof content === 'string'
        ? []
        : [
            {
              id: content.id,
              title: content.title,
              price: content.price ?? null,
              locked: isLocked(content),
            },
          ],
    ),
  }))
}
