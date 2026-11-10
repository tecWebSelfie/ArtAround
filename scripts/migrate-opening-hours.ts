/**
 * One-off, idempotent: museum opening hours moved from Payload `date` fields
 * (ISO instants) to `HH:mm` text, the museum's wall clock
 * (src/fields/OpeningHours.ts). Values already in `HH:mm` are left alone.
 *
 * Which wall time an old instant meant depends on how it was written:
 * - the seed and API writes stored 9:00 as `…T09:00:00.000Z`, so by default
 *   instants are read in UTC;
 * - writes made in another zone's local time: pass `--time-zone=<IANA zone>`
 *   (e.g. `Europe/Rome`) to read them on that clock instead;
 * - the old admin field had a day picker only, which stores 12:00 UTC of
 *   the picked day: no time was ever entered. A range whose two ends come out
 *   equal (12:00–12:00) is such a leftover and is dropped, reported in the log.
 *
 * `--dry-run` prints every change without writing: check it before a real run
 * on a database you don't know.
 *
 * Raw database writes on purpose: a Payload `update` would rerun the museum's
 * hooks (palette, translations) for a change of storage format only.
 *
 *   pnpm exec tsx scripts/migrate-opening-hours.ts [--dry-run] [--time-zone=Europe/Rome]
 */
import { config as loadEnv } from 'dotenv'
import { getPayload } from 'payload'

loadEnv({ path: ['.env.local', '.env'] })

const dryRun = process.argv.includes('--dry-run')
const timeZone = process.argv.find((arg) => arg.startsWith('--time-zone='))?.split('=')[1] ?? 'UTC'

const { default: config } = await import('../src/payload.config')
const { TIME_OF_DAY, WEEKDAYS } = await import('../src/lib/opening-hours')
const payload = await getPayload({ config })

// Throws on an unknown zone name, before anything is written.
const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** `HH:mm` as is; an ISO instant as its `HH:mm` in `timeZone`; anything else dropped. */
function toTimeOfDay(value: unknown): string | null {
  if (typeof value === 'string' && TIME_OF_DAY.test(value)) return value
  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? clock.format(date) : null
}

const Museums = payload.db.collections.museums
const museums = await Museums.find({ openingHours: { $exists: true } }, { openingHours: 1 }).lean()
let changed = 0
for (const museum of museums as { _id: unknown; openingHours?: Record<string, unknown> }[]) {
  const hours = museum.openingHours ?? {}
  const next: Record<string, unknown> = { ...hours }
  for (const day of WEEKDAYS) {
    const ranges = hours[day]
    if (!Array.isArray(ranges)) continue
    next[day] = ranges.flatMap((range: Record<string, unknown>) => {
      const opening = toTimeOfDay(range.opening)
      const closing = toTimeOfDay(range.closing)
      // Both ends are required now; an empty or equal pair is no range (the
      // old day-only picker's 12:00–12:00).
      if (!opening || !closing || opening === closing) {
        payload.logger.warn(
          `Museum ${String(museum._id)}, ${day}: dropped range ${String(range.opening)}–${String(range.closing)}`,
        )
        return []
      }
      return [{ ...range, opening, closing }]
    })
  }
  if (JSON.stringify(next) !== JSON.stringify(hours)) {
    if (dryRun) payload.logger.info({ museum: String(museum._id), before: hours, after: next })
    else await Museums.updateOne({ _id: museum._id }, { $set: { openingHours: next } })
    changed++
  }
}
payload.logger.info(
  `Opening hours (${timeZone}): ${changed} of ${museums.length} museums ${dryRun ? 'would be ' : ''}rewritten as HH:mm.`,
)
process.exit(0)
