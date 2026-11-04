/**
 * Wikidata, the universal identifiers of works, artists, styles and events
 * (requirement 5 of `docs/plan/requisiti-18-33.md`). Objects and subjects
 * store a Q-id (`wikidataId`) beside their own Payload id; nothing else is
 * kept from Wikidata but what the app shows (names, descriptions) and the
 * links it follows (author, movement, events), so other identifiers (ULAN,
 * AAT, VIAF) stay one request away instead of being copied.
 *
 * Plain `fetch` on the public API (`wbsearchentities`, `wbgetentities`); the
 * `fetchImpl` parameter lets tests answer from recorded responses.
 */

const API = 'https://www.wikidata.org/w/api.php'
/** Wikimedia asks API clients to identify themselves. */
const USER_AGENT = 'ArtAround/1.0 (university museum guide project)'
const TIMEOUT_MS = 10_000

export const WIKIDATA_ID = /^Q[1-9]\d*$/

/** Jobs queue of the Wikidata imports (`jobs.autoRun` in `payload.config.ts`). */
export const WIKIDATA_QUEUE = 'wikidata'

/** The statements followed from a work to its subjects, one level only. */
export const SUBJECT_PROPERTIES = {
  /** creator: the author */
  P170: 'person',
  /** movement: the style */
  P135: 'movement',
  /** significant event */
  P793: 'event',
} as const

export type SubjectKind = (typeof SUBJECT_PROPERTIES)[keyof typeof SUBJECT_PROPERTIES]

export type WikidataSearchResult = { id: string; label: string; description: string | null }

type Snak = { datavalue?: { value?: { id?: string } } }
export type WikidataEntity = {
  id: string
  labels?: Record<string, { value: string }>
  descriptions?: Record<string, { value: string }>
  claims?: Record<string, { mainsnak?: Snak; rank?: string }[]>
}

type Fetch = typeof fetch

/** Waits before each retry of a rate-limited request (429 or 503). */
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000]

async function call(params: Record<string, string>, fetchImpl: Fetch) {
  const url = new URL(API)
  url.search = new URLSearchParams({ format: 'json', ...params }).toString()
  for (let attempt = 0; ; attempt++) {
    const response = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (response.ok) return response.json() as Promise<Record<string, unknown>>
    // Wikimedia rate-limits busy clients: wait as asked (or a bit more each time).
    const limited = response.status === 429 || response.status === 503
    if (!limited || attempt >= RETRY_DELAYS_MS.length) {
      throw new Error(`Wikidata answered ${response.status}`)
    }
    const retryAfter = Number(response.headers.get('retry-after')) * 1000
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(retryAfter || RETRY_DELAYS_MS[attempt]!, 30_000)),
    )
  }
}

/** Items matching what the curator typed, labelled in their language. */
export async function searchWikidata(
  query: string,
  language: string,
  fetchImpl: Fetch = fetch,
): Promise<WikidataSearchResult[]> {
  if (query.trim().length < 2) return []
  const data = await call(
    {
      action: 'wbsearchentities',
      search: query.trim(),
      language,
      uselang: language,
      type: 'item',
      limit: '8',
    },
    fetchImpl,
  )
  return ((data.search ?? []) as { id: string; label?: string; description?: string }[]).map(
    (item) => ({
      id: item.id,
      label: item.label ?? item.id,
      description: item.description ?? null,
    }),
  )
}

/**
 * Entities by id, keyed by the id that was asked for. Wikidata follows
 * redirects (merged items), so `entity.id` is the current id, which may
 * differ from the key: callers store the current one.
 */
export async function getWikidataEntities(
  ids: string[],
  languages: readonly string[],
  fetchImpl: Fetch = fetch,
): Promise<Map<string, WikidataEntity>> {
  const result = new Map<string, WikidataEntity>()
  const unique = [...new Set(ids.filter((id) => WIKIDATA_ID.test(id)))]
  // The API takes up to 50 ids per request.
  for (let start = 0; start < unique.length; start += 50) {
    const batch = unique.slice(start, start + 50)
    const data = await call(
      {
        action: 'wbgetentities',
        ids: batch.join('|'),
        props: 'labels|descriptions|claims',
        languages: languages.join('|'),
        redirects: 'yes',
      },
      fetchImpl,
    )
    const entities = (data.entities ?? {}) as Record<
      string,
      WikidataEntity & { missing?: string; redirects?: { from: string; to: string } }
    >
    for (const entity of Object.values(entities)) {
      if (entity.missing !== undefined) continue
      result.set(entity.redirects?.from ?? entity.id, entity)
    }
  }
  return result
}

/** Item ids a statement points to (deprecated statements left out). */
export function claimIds(entity: WikidataEntity, property: string): string[] {
  return (entity.claims?.[property] ?? [])
    .filter((claim) => claim.rank !== 'deprecated')
    .map((claim) => claim.mainsnak?.datavalue?.value?.id)
    .filter((id): id is string => typeof id === 'string' && WIKIDATA_ID.test(id))
}

/** Label and description per language, for the languages Wikidata has. */
export function localizedTexts(entity: WikidataEntity, languages: readonly string[]) {
  return languages.flatMap((language) => {
    const name = entity.labels?.[language]?.value
    return name ? [{ language, name, description: entity.descriptions?.[language]?.value }] : []
  })
}

export const wikidataUrl = (id: string) => `https://www.wikidata.org/wiki/${id}`
