/**
 * One-off, idempotent: museum opening hours moved from Payload `date` fields
 * (ISO instants) to `HH:mm` text, the museum's wall clock
 * (src/fields/OpeningHours.ts). This rewrites stored ISO values as their UTC
 * `HH:mm`: the seed wrote 9:00 as `…T09:00:00.000Z`, so UTC is the wall time
 * it meant. Values already in `HH:mm` are left alone.
 *
 * Raw database writes on purpose: a Payload `update` would rerun the museum's
 * hooks (palette, translations) for a change of storage format only.
 *
 *   pnpm exec tsx scripts/migrate-opening-hours.ts
 */
import { config as loadEnv } from 'dotenv'
import { getPayload } from 'payload'

loadEnv({ path: ['.env.local', '.env'] })

const { default: config } = await import('../src/payload.config')
const { TIME_OF_DAY } = await import('../src/lib/opening-hours')
const payload = await getPayload({ config })

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

/** `HH:mm` as is; an ISO instant as its UTC `HH:mm`; anything else dropped. */
function toTimeOfDay(value: unknown): string | null {
  if (typeof value === 'string' && TIME_OF_DAY.test(value)) return value
  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(11, 16) : null
}

const Museums = payload.db.collections.museums
const museums = await Museums.find({ openingHours: { $exists: true } }, { openingHours: 1 }).lean()
let changed = 0
for (const museum of museums as { _id: unknown; openingHours?: Record<string, unknown> }[]) {
  const hours = museum.openingHours ?? {}
  const next: Record<string, unknown> = { ...hours }
  for (const day of DAYS) {
    const ranges = hours[day]
    if (!Array.isArray(ranges)) continue
    next[day] = ranges.map((range: Record<string, unknown>) => ({
      ...range,
      opening: toTimeOfDay(range.opening),
      closing: toTimeOfDay(range.closing),
    }))
  }
  if (JSON.stringify(next) !== JSON.stringify(hours)) {
    await Museums.updateOne({ _id: museum._id }, { $set: { openingHours: next } })
    changed++
  }
}
payload.logger.info(`Opening hours: ${changed} of ${museums.length} museums rewritten as HH:mm.`)
process.exit(0)
