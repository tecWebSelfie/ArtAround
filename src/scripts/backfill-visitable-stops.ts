/**
 * Fills `tours.visitableStops` / `tours.visitableContents` for the tours saved
 * before those fields existed (and repairs any that drifted).
 *
 * Usage:
 *   pnpm tours:backfill-visitable
 *
 * The hooks keep the fields up to date on every later change (tour save,
 * museum map, object contents, content deletion/visibility:
 * src/lib/visitable-stops.ts); this is the one-off for the existing data. It
 * recomputes every tour with the same rule as navigation and the hooks,
 * writes only the ones that differ, and refreshes the search rows of those
 * (a tour with no visitable stop leaves the index). Idempotent.
 */
import { getPayload } from 'payload'
import config from '../payload.config'
import { refreshVisitableStops } from '../lib/visitable-stops'

async function backfill() {
  const payload = await getPayload({ config })
  const total = (await payload.count({ collection: 'tours', overrideAccess: true })).totalDocs
  const changed = await refreshVisitableStops({ payload, where: {} })
  const empty = (
    await payload.count({
      collection: 'tours',
      where: { visitableStops: { equals: 0 } },
      overrideAccess: true,
    })
  ).totalDocs
  payload.logger.info(
    `Visitable stops: ${changed.length} of ${total} tour(s) updated, ${empty} with no visitable stop.`,
  )
}

try {
  // Top-level await: `payload run` exits as soon as the module resolves.
  await backfill()
} catch (error) {
  console.error('Visitable stops backfill failed:', error)
  process.exit(1)
}
