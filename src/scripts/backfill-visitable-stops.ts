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
 * (a tour with no visitable stop leaves the index). It first drops the ids of
 * contents that no longer exist from the tours listing them
 * (`removeContentsFromTours`). Idempotent.
 */
import { getPayload } from 'payload'
import config from '../payload.config'
import { relationshipIds } from '../lib/search-index'
import { removeContentsFromTours } from '../lib/tour-stop-cleanup'
import { refreshVisitableStops } from '../lib/visitable-stops'

/** Ids per `$in` query (existence check and cleanup). */
const SLICE = 500

/**
 * Ids listed by tours whose content no longer exists (deleted before a
 * deleted content left its tours): they are dropped from the tours first.
 */
async function dropDeletedContents(payload: Awaited<ReturnType<typeof getPayload>>) {
  const { docs: tours } = await payload.find({
    collection: 'tours',
    select: { contents: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const listed = [...new Set(tours.flatMap((tour) => relationshipIds(tour.contents)))]
  // In slices: a big museum lists thousands of ids, too many for one `$in`.
  let cleaned = 0
  for (let from = 0; from < listed.length; from += SLICE) {
    const slice = listed.slice(from, from + SLICE)
    const { docs: existing } = await payload.find({
      collection: 'contents',
      where: { id: { in: slice } },
      select: {},
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    const alive = new Set(existing.map((doc) => String(doc.id)))
    const missing = slice.filter((id) => !alive.has(id))
    cleaned += (await removeContentsFromTours({ payload, contentIds: missing })).length
  }
  return cleaned
}

async function backfill() {
  const payload = await getPayload({ config })
  const total = (await payload.count({ collection: 'tours', overrideAccess: true })).totalDocs
  const cleaned = await dropDeletedContents(payload)
  const changed = await refreshVisitableStops({ payload, where: {} })
  const empty = (
    await payload.count({
      collection: 'tours',
      where: { visitableStops: { equals: 0 } },
      overrideAccess: true,
    })
  ).totalDocs
  payload.logger.info(
    `Visitable stops: ${cleaned} tour(s) lost deleted contents, ${changed.length} of ${total} tour(s) updated, ${empty} with no visitable stop.`,
  )
}

try {
  // Top-level await: `payload run` exits as soon as the module resolves.
  await backfill()
} catch (error) {
  console.error('Visitable stops backfill failed:', error)
  process.exit(1)
}
