// Not marked 'server-only': only the server component `MuseumInfo` imports
// it (so the table never reaches a client bundle), and the museum page's
// stories render that component in the browser, where the marker would throw.
import tzLookup from '@photostructure/tz-lookup'
import { isMuseumPoint } from '@/lib/museum-location'

/**
 * The IANA time zone at a museum's saved position ("Europe/Rome"), so the
 * Info tab can tell whether it is open now by the museum's own clock
 * (`museumClock` in `opening-hours.ts`), wherever the visitor reads it.
 *
 * Derived from the coordinates at render instead of stored: the lookup is an
 * offline table of ~90 KB that answers in microseconds, so a moved museum is
 * never left with a stale zone. Its known misses are near zone borders and at
 * sea, not in a city. Null without a position (or for an invalid one): the
 * page then shows the hours without an open/closed status.
 */
export function museumTimeZone(point: unknown): string | null {
  if (!isMuseumPoint(point)) return null
  const [longitude, latitude] = point
  try {
    return tzLookup(latitude, longitude)
  } catch {
    return null
  }
}
