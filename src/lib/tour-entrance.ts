import type { PlacedObject } from '@/lib/museum-rooms'
import {
  collectMuseumMarkers,
  placedEntrances,
  type ExitEntranceMarker,
} from '@/lib/pascal/museum-plugin/markers-in-map'
import { routeStart } from '@/lib/route-start'

/**
 * The entrance a tour starts from (docs/tour-navigation.md → Tour entrance),
 * as an entrance marker's node id, or null when the map has no placed
 * entrance.
 *
 * An author may choose it (`tours.startEntrance`). Unchosen, or chosen but no
 * longer a placed entrance of the map (staff moved or removed the marker), it
 * is the placed entrance nearest the tour's first stop (with no first stop on
 * the map, the first entrance), which is what a tour without the field always
 * did. "Nearest" is `routeStart`'s own rule, over plan distances between the
 * markers' and works' stored positions, as the visit planner measures them
 * (`src/app/api/plan-tour/route.ts`).
 *
 * Pure, over what the caller already read from the map (its markers and its
 * placed works, `useMuseumMapData` on the navigation page), so it never parses
 * the map again.
 */
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
  map: { exitEntrances: readonly ExitEntranceMarker[]; objects: readonly PlacedObject[] },
): string | null {
  const entrances = placedEntrances(map.exitEntrances).map((entrance) => ({
    id: entrance.id,
    point: [entrance.position[0], entrance.position[2]] as [number, number],
  }))
  if (startEntrance && entrances.some((entrance) => entrance.id === startEntrance)) {
    return startEntrance
  }
  const first = map.objects.find((object) => object.objectId === firstObjectId)?.point
  const nearest = first
    ? routeStart({
        at: null,
        workPoint: null,
        entrances,
        end: first,
        distance: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]),
      }).start
    : null
  return entrances.find((entrance) => entrance.point === nearest)?.id ?? entrances[0]?.id ?? null
}

/** Whether `id` names a placed entrance of the map's nodes: what `startEntrance` may hold. */
export function isPlacedEntrance(id: string, nodes: Record<string, unknown> | null) {
  return placedEntrances(collectMuseumMarkers(nodes).exitEntrances).some(
    (entrance) => entrance.id === id,
  )
}
