import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { recordedWikidataFetch } from '../src/lib/wikidata'

/**
 * The demo seed's Wikidata, offline: a `fetch` that answers the Wikidata API's
 * `wbgetentities` calls from `seed-assets/wikidata-entities.json` (recorded by
 * `scripts/snapshot-wikidata.ts`), so `importWikidataSubjects` links the demo
 * works to their subjects exactly as it does live, with no network.
 *
 * Read relative to the working directory: the repository in development, the
 * standalone folder on the deploy (`copy-standalone-assets.mjs` copies
 * `seed-assets/` there).
 */
export const WIKIDATA_SNAPSHOT_PATH = 'seed-assets/wikidata-entities.json'

/**
 * The snapshot's `fetch`. A missing or unreadable snapshot (a standalone
 * copied without `seed-assets/`) only costs the subjects: every item then
 * answers as missing, and the seed goes on.
 */
export async function offlineWikidataFetch(): Promise<typeof fetch> {
  try {
    const entities = JSON.parse(await readFile(path.resolve(WIKIDATA_SNAPSHOT_PATH), 'utf8'))
    return recordedWikidataFetch(entities as Record<string, object>)
  } catch (error) {
    console.warn(`No Wikidata snapshot, the demo works get no subjects: ${String(error)}`)
    return recordedWikidataFetch({})
  }
}
