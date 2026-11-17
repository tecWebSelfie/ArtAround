import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * The demo seed's Wikidata, offline: a `fetch` that answers the Wikidata API's
 * `wbgetentities` calls from `seed-assets/wikidata-entities.json` (recorded by
 * `scripts/snapshot-wikidata.ts`), so `importWikidataSubjects` links the demo
 * works to their subjects exactly as it does live, with no network. An id the
 * snapshot lacks answers as missing, like an item Wikidata doesn't have.
 *
 * Read relative to the working directory: the repository in development, the
 * standalone folder on the deploy (`copy-standalone-assets.mjs` copies
 * `seed-assets/` there).
 */
export const WIKIDATA_SNAPSHOT_PATH = 'seed-assets/wikidata-entities.json'

export async function offlineWikidataFetch(): Promise<typeof fetch> {
  const entities = JSON.parse(
    await readFile(path.resolve(WIKIDATA_SNAPSHOT_PATH), 'utf8'),
  ) as Record<string, object>
  return async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    if (url.searchParams.get('action') !== 'wbgetentities') {
      return Response.json({ error: 'offline' }, { status: 400 })
    }
    const ids = url.searchParams.get('ids')?.split('|') ?? []
    return Response.json({
      entities: Object.fromEntries(ids.map((id) => [id, entities[id] ?? { id, missing: '' }])),
    })
  }
}
