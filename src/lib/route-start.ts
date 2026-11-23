/**
 * Where the navigation map's route starts, and whether that start is the
 * visitor's confirmed position or only a guess (docs/tour-navigation.md →
 * Two positions; DESIGN.md → Guessed start).
 *
 * - `at` is the confirmed position: a work (its point on the map) or one of
 *   the museum's entrances (its marker's node id), so a visitor at a museum
 *   with several entrances can say which one.
 * - Without it, a route to a destination is previewed from an entrance: a
 *   guess, drawn as such, never written back to the URL. At the start of a
 *   tour that is the tour's own entrance (`preferredEntranceId`, the one its
 *   progress bar starts from); otherwise the entrance nearest the destination
 *   (a visitor mid-tour or heading elsewhere is likelier near it).
 * - Without it and without a destination (a free visit) there is no basis
 *   for a guess, so there is no start: the map draws no avatar until the
 *   visitor says where they are.
 *
 * Pure (points in, start out), so the rule is tested apart from the 3D
 * scene that resolves the points (`MuseumMap`).
 */

export type RouteStart<P> = {
  start: P | null
  /** `start` is the visitor's confirmed position, not a guessed entrance. */
  confirmed: boolean
  /** The entrance the route starts from, confirmed or guessed. */
  entranceId: string | null
}

export function routeStart<P>({
  at,
  workPoint,
  entrances,
  end,
  distance,
  preferredEntranceId,
}: {
  /** The URL's `at`: a work's id or an entrance's node id. */
  at: string | null | undefined
  /** The point of the work `at` names, if it names one placed on the map. */
  workPoint: P | null
  /** The placed entrances with their points (null when not resolvable). */
  entrances: readonly { id: string; point: P | null }[]
  /** Where the route goes, if anywhere. */
  end: P | null
  distance: (from: P, to: P) => number
  /** The entrance to preview from instead of the nearest one, when resolvable. */
  preferredEntranceId?: string | null
}): RouteStart<P> {
  if (workPoint) return { start: workPoint, confirmed: true, entranceId: null }
  const confirmed = entrances.find((entrance) => entrance.id === at && entrance.point)
  if (confirmed?.point) {
    return { start: confirmed.point, confirmed: true, entranceId: confirmed.id }
  }
  if (!end) return { start: null, confirmed: false, entranceId: null }
  const preferred = entrances.find((entrance) => entrance.id === preferredEntranceId)
  if (preferred?.point) {
    return { start: preferred.point, confirmed: false, entranceId: preferred.id }
  }
  let nearest: { id: string; point: P } | null = null
  let best = Number.POSITIVE_INFINITY
  for (const { id, point } of entrances) {
    if (!point) continue
    const current = distance(point, end)
    if (current < best) {
      best = current
      nearest = { id, point }
    }
  }
  return { start: nearest?.point ?? null, confirmed: false, entranceId: nearest?.id ?? null }
}
