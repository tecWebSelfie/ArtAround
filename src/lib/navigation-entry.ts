import 'server-only'

import config from '@/payload.config'
import type { Museum } from '@/payload-types'
import type { Route } from 'next'
import { getPayload } from 'payload'
import { lockedMuseumId } from './museum-mode'
import { museumNavigationPath, withNavigationPosition } from './tour-navigation'

/**
 * Entry points from detail pages into free navigation
 * (`/[lng]/museum/[id]/navigation`): the "Explore the map" / "Find it on the
 * map" CTAs. A CTA is only offered when it leads somewhere usable, so these
 * return `null` rather than a link to an empty map.
 *
 * The rule matches tour navigation: a saved map is enough. Without a navmesh
 * the map still orients the visitor, opens contents and scans QR codes, and
 * routes show the explicit "No route available" state.
 */

/** A museum can be navigated once its map is saved. */
export function isNavigable(museum: Pick<Museum, 'map'>) {
  return Boolean(museum.map)
}

export function museumNavigationEntry(lng: string, museum: Pick<Museum, 'id' | 'map'>) {
  return isNavigable(museum) ? museumNavigationPath(lng, museum.id) : null
}

/**
 * Where "Find it on the map" goes for a content: the free map of a navigable
 * museum whose map places one of the content's objects, with the content open
 * and that object preset as the destination (`?to=`). In museum mode the locked
 * museum wins when it exhibits the content; otherwise the first match does.
 */
export async function contentNavigationEntry(
  lng: string,
  contentId: string,
): Promise<Route | null> {
  const payload = await getPayload({ config })
  const { docs: objects } = await payload.find({
    collection: 'objects',
    where: { contents: { contains: contentId } },
    select: {},
    depth: 0,
    pagination: false,
  })
  if (!objects.length) return null
  const objectIds = objects.map((object) => String(object.id))
  // `museums.objects` is derived from the placed map items, so a match means
  // the object really stands on that museum's map. Navigability is part of the
  // query: the map JSON is large and never needs to be read here.
  const { docs: navigable } = await payload.find({
    collection: 'museums',
    where: {
      and: [{ objects: { in: objectIds } }, { map: { exists: true } }],
    },
    select: { objects: true },
    depth: 0,
    pagination: false,
  })
  if (!navigable.length) return null
  const locked = await lockedMuseumId()
  const museum = navigable.find((item) => String(item.id) === locked) ?? navigable[0]!
  const placed = new Set(
    (museum.objects ?? []).map((entry) => (typeof entry === 'string' ? entry : entry.id)),
  )
  const objectId = objectIds.find((id) => placed.has(id))
  return withNavigationPosition(`${museumNavigationPath(lng, museum.id)}/content/${contentId}`, {
    ...(objectId ? { to: objectId } : {}),
  })
}
