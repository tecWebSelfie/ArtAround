import type { PolygonPoint2D } from '@pascal-app/core'
import { MAX_CANDIDATES, workInFront, type PlacedWork } from './work-in-front'

/** Live entry at 3 m / 30°, exit at 4.5 m / 45°: calm GPS and compass jitter. */
export function nearbyWorks(
  point: PolygonPoint2D | null,
  heading: number | null,
  works: readonly PlacedWork[],
  previous: readonly string[],
): string[] {
  if (!point || !point.every(Number.isFinite)) return []
  const ids = (decision: ReturnType<typeof workInFront>) =>
    decision.kind === 'sure' ? [decision.id] : decision.kind === 'choose' ? decision.ids : []
  const entering = ids(workInFront(point, heading, works))
  const retained = ids(
    workInFront(
      point,
      heading,
      works.filter(({ id }) => previous.includes(id)),
      { reach: 4.5, halfField: 45 },
    ),
  )
  return [...new Set([...entering, ...retained])].slice(0, MAX_CANDIDATES)
}
