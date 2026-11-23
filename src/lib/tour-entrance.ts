import { museumRooms } from '@/lib/museum-rooms'
import { collectMuseumMarkers, placedEntrances } from '@/lib/pascal/museum-plugin/markers-in-map'

/**
 * The entrance a tour starts from (docs/tour-navigation.md → Tour entrance).
 *
 * An author may choose it (`tours.startEntrance`, an entrance marker's node
 * id on the museum map). Unchosen, or chosen but no longer a placed entrance
 * of the map (staff moved or removed the marker), it is the placed entrance
 * nearest the tour's first stop, which is what a tour without the field always
 * did. With no placed entrance at all there is none.
 *
 * Pure over the map's nodes, so the server (validation, navigation data), the
 * tour editor and the navigation page all resolve it the same way. Distances
 * are plan distances between the markers' and works' stored positions, as the
 * visit planner measures them (`src/app/api/plan-tour/route.ts`).
 */
export type TourEntrance = {
  id: string
  /** The author chose it, as opposed to the nearest-to-the-first-stop default. */
  chosen: boolean
}

export function tourStartEntrance(
  {
    startEntrance,
    firstObjectId,
  }: {
    /** The author's choice, if any. */
    startEntrance?: string | null
    /** The work of the tour's first visitable stop, if any. */
    firstObjectId?: string | null
  },
  nodes: Record<string, unknown> | null,
): TourEntrance | null {
  const entrances = placedEntrances(collectMuseumMarkers(nodes).exitEntrances)
  if (startEntrance && entrances.some((entrance) => entrance.id === startEntrance)) {
    return { id: startEntrance, chosen: true }
  }
  const first = firstObjectId
    ? museumRooms(nodes).objects.find((object) => object.objectId === firstObjectId)?.point
    : undefined
  let nearest = entrances[0]
  if (first) {
    let best = Number.POSITIVE_INFINITY
    for (const entrance of entrances) {
      const distance = Math.hypot(entrance.position[0] - first[0], entrance.position[2] - first[1])
      if (distance < best) {
        best = distance
        nearest = entrance
      }
    }
  }
  return nearest ? { id: nearest.id, chosen: false } : null
}

/** Whether `id` names a placed entrance of the map: what `startEntrance` may hold. */
export function isPlacedEntrance(id: string, nodes: Record<string, unknown> | null) {
  return placedEntrances(collectMuseumMarkers(nodes).exitEntrances).some(
    (entrance) => entrance.id === id,
  )
}
