/**
 * Sets one museum's `brandColor` through the real save path (the Payload Local
 * API update, so `syncMuseumPalette` in `src/collections/Museums.ts` derives
 * and stores the 10-shade `palette` exactly as a director's save would).
 *
 * Local development utility: the seeded museums ship without a color, so
 * museum mode keeps the default blue and the per-museum theme cannot be seen
 * or tested. This fills that gap without opening the admin form.
 *
 *   pnpm exec tsx scripts/set-museum-color.ts "Museo Galileo" "#4a2d8e"
 *   pnpm exec tsx scripts/set-museum-color.ts "Museo Galileo" ""   # back to the default blue
 *
 * Empty hex clears the color (the stored palette goes empty with it); a
 * reserved red/orange is rejected by the field validation, as in the form.
 */
import { config as loadEnv } from 'dotenv'
import { getPayload } from 'payload'

loadEnv({ path: ['.env.local', '.env'] })

// Dynamic import, as in `migrate-opening-hours.ts`: the config reads
// PAYLOAD_SECRET at module scope, so it must be imported only after the env
// files are loaded (a static import would be hoisted above loadEnv).
const { default: config } = await import('../src/payload.config')

async function main() {
  const [name, hex] = process.argv.slice(2)
  if (!name) {
    console.error(
      'Usage: pnpm exec tsx scripts/set-museum-color.ts "<museum name>" [ #rrggbb | "" ]',
    )
    process.exit(1)
  }
  const brand = (hex ?? '').trim().toLowerCase() || null

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'museums',
    where: { name: { equals: name } },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const museum = docs[0]
  if (!museum) {
    console.error(`No museum named "${name}" here.`)
    process.exit(1)
  }

  // The update runs the collection hooks, so the palette is derived, not sent.
  const saved = await payload.update({
    collection: 'museums',
    id: museum.id,
    data: { brandColor: brand },
    overrideAccess: true,
  })

  console.log(
    `${saved.name}: brandColor ${saved.brandColor ?? '(none)'}, palette ${
      saved.palette?.length ? saved.palette.join(' ') : '(empty: default blue)'
    }`,
  )
}

try {
  // Top-level await keeps the process alive until the update finishes.
  await main()
} catch (error) {
  console.error('Could not set the museum color:', error)
  process.exit(1)
} finally {
  process.exit(0)
}
