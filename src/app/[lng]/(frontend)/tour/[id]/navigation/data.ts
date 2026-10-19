import config from '@/payload.config'
import { getPayload } from 'payload'
import { cache } from 'react'
import { normalizeLocale } from '@/lib/localized'
export { getLocalizedPageDocument as getNavigationDocument } from '@/lib/localized-page'
import { validateBuildJson } from '@pascal-app/core'
import { museumObjectId, type NavigationCatalogObject } from '@/lib/tour-navigation'
import type { Museum } from '@/payload-types'

/**
 * Server reads shared by the persistent tour shell and its parallel modal slot.
 * Keeping them here lets both route branches use the same Payload data contract.
 */

/** React.cache deduplicates the same tour lookup when the shell and modal both need it. */
export const getNavigationTour = cache(async (id: string) => {
  const payload = await getPayload({ config })
  return payload.findByID({
    collection: 'tours',
    id,
    joins: { museum: { limit: 1 } },
    populate: { contents: { title: true, difficulty: true, readingTimeMins: true, objects: true } },
  })
})

/**
 * Builds the museum-scoped Spotlight catalog from its linked objects and placed
 * Pascal items. Only summaries cross into the client; full localized copy is
 * fetched when a visitor opens an object or content.
 */
export async function getNavigationCatalog(
  museum: Museum,
  lng: string,
): Promise<NavigationCatalogObject[]> {
  const payload = await getPayload({ config })
  // Museums link their objects directly. The Pascal map stays a second source
  // so objects placed in the 3D map appear even before they are linked.
  const ids = new Set(
    (museum.objects ?? []).map((entry) => (typeof entry === 'string' ? entry : entry.id)),
  )
  // Also include objects present on the Pascal map, even if they haven't been
  // linked to the museum yet.
  const map = validateBuildJson(museum.map).parsed
  for (const node of Object.values(map?.nodes ?? {})) {
    const id = museumObjectId(node)
    if (id) ids.add(id)
  }
  if (!ids.size) return []
  const objects = await payload.find({
    collection: 'objects',
    where: { id: { in: [...ids] } },
    select: { name: true, contents: true },
    populate: { contents: { title: true } },
    locale: normalizeLocale(lng) ?? 'en',
    depth: 1,
    pagination: false,
  })
  return objects.docs.map((object) => ({
    id: object.id,
    name: object.name,
    contents: (object.contents ?? []).flatMap((content) =>
      typeof content === 'string' ? [] : [{ id: content.id, title: content.title }],
    ),
  }))
}
