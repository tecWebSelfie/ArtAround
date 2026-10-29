import type { PolygonPoint2D } from '@pascal-app/core'
import { roomAt, type MuseumRooms } from './museum-rooms'
import type { NavigationCatalogContent, NavigationCatalogObject } from './tour-navigation'

/**
 * "Nearby" means "in the same room": straight-line distance would suggest
 * objects behind a wall, and indoor GPS jitter would make a radius fire at
 * random. When the visitor's room changes, this returns the contents of that
 * room's objects that are not part of the tour (they will meet those anyway)
 * and were not suggested before. Paid contents are included; `locked` tells
 * the UI to show the price badge.
 */
export type NearbySuggestion = {
  content: NavigationCatalogContent
  object: Pick<NavigationCatalogObject, 'id' | 'name'>
  room: string
}

export function nearbySuggestions({
  map,
  point,
  catalog,
  tourContentIds,
  alreadySuggested,
}: {
  map: MuseumRooms
  point: PolygonPoint2D | null
  catalog: NavigationCatalogObject[]
  tourContentIds: ReadonlySet<string>
  alreadySuggested: ReadonlySet<string>
}): { room: string | null; suggestions: NearbySuggestion[] } {
  const room = point ? roomAt(map.rooms, point) : null
  if (!room) return { room: null, suggestions: [] }
  const objectIdsInRoom = new Set(
    map.objects.filter((object) => roomAt([room], object.point)).map((object) => object.objectId),
  )
  const suggestions = catalog
    .filter((object) => objectIdsInRoom.has(object.id))
    .flatMap((object) =>
      object.contents
        .filter((content) => !tourContentIds.has(content.id) && !alreadySuggested.has(content.id))
        .map((content) => ({
          content,
          object: { id: object.id, name: object.name },
          room: room.name,
        })),
    )
  return { room: room.name, suggestions }
}
