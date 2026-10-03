import IsoCodes from 'iso-639-1'
import type { Payload, TypedLocale } from 'payload'
import type { Config } from '@/payload-types'

/** Every collection slug in the generated config (incl. `translator-provenance`). */
export type LocalizedSlug = keyof Config['collections']

/** The generated entity type for a collection slug (e.g. `Museum` for `'museums'`). */
export type LocalizedDoc<TSlug extends LocalizedSlug> = Config['collections'][TSlug]

export type LocalizedState<TSlug extends LocalizedSlug> =
  | { kind: 'hit'; locale: string; doc: LocalizedDoc<TSlug> }
  | { kind: 'miss'; locale: string; doc: LocalizedDoc<TSlug> } // doc = EN fallback
  | { kind: 'stale'; locale: string; doc: LocalizedDoc<TSlug> } // doc = stored translation
  | { kind: 'not-found' }

export function normalizeLocale(raw: string | null): TypedLocale | null {
  if (!raw) return null
  const code = raw.toLowerCase().split(/[-_]/)[0]
  return IsoCodes.validate(code) ? (code as TypedLocale) : null
}

/**
 * `Accept-Language` fallback (first tag only, e.g. `fr-FR,fr;q=0.9` → `fr`).
 * Explicit `?locale=` always wins — callers should prefer it (deterministic
 * URLs, shareable links, in-app language switch); the header only covers
 * zero-config page loads reflecting the browser default.
 */
export function headerLocale(headers: Headers): TypedLocale | null {
  const first = headers
    .get('accept-language')
    ?.split(',')[0]
    ?.split(';')[0]
    ?.trim()
  return normalizeLocale(first || null)
}

const PROVENANCE_COLLECTION = 'translator-provenance' as const

// PINNED-CONTRACT NOTE — @focus-reactive/payload-plugin-translator is an exact
// pin (`0.13.4`, no caret, in package.json), so this internal route is frozen
// for us. It is UNPUBLISHED upstream (may change across releases — never
// upgrade this dep without re-checking it):
//   GET /api/translate/stale/:collection_slug/:collection_id
//   → { data: { locales: [{ target_lng, source_lng, is_stale, translated_at }] } }
// Fail-open: ANY failure (404 after an upgrade, network, shape change) is
// treated as "fresh". Worst case of a future upgrade: stale translations served
// until manual re-translate, never a broken page.
const STALE_BASE = '/api/translate/stale'

type StaleEntry = {
  target_lng: string
  source_lng: string
  is_stale: boolean
  translated_at: string
}

async function isStale(
  origin: string,
  collection: string,
  id: string | number,
  locale: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      new URL(
        `${STALE_BASE}/${encodeURIComponent(collection)}/${encodeURIComponent(String(id))}`,
        origin,
      ),
    )
    if (!res.ok) return false
    const body = (await res.json()) as { data?: { locales?: StaleEntry[] } }
    return body.data?.locales?.some((l) => l.target_lng === locale && l.is_stale) ?? false
  } catch {
    return false
  }
}

/**
 * Pure Local-API read: decides HIT / MISS / STALE for one doc × locale from
 * the translator plugin's receipt book (`translator-provenance`, unique on
 * collection+doc+locale). No enqueue, no throttle, no HTTP status codes —
 * compose it in endpoints, server components and scripts.
 */
export async function resolveLocalized<TSlug extends LocalizedSlug>(
  payload: Payload,
  origin: string,
  { collection, id, locale }: { collection: TSlug; id: string | number; locale: TypedLocale },
): Promise<LocalizedState<TSlug>> {
  const receipts = await payload.find({
    collection: PROVENANCE_COLLECTION,
    where: {
      and: [
        { collectionSlug: { equals: collection } },
        { documentId: { equals: String(id) } },
        { targetLocale: { equals: locale } },
      ],
    },
    limit: 1,
    depth: 0,
  })

  const fallbackDoc = (await payload
    .findByID({ collection, id, locale: 'en', depth: 0 })
    .catch(() => null)) as LocalizedDoc<TSlug> | null
  if (!fallbackDoc) return { kind: 'not-found' }

  if (receipts.totalDocs === 0) return { kind: 'miss', locale, doc: fallbackDoc }

  const localizedDoc = (await payload
    .findByID({ collection, id, locale, fallbackLocale: false, depth: 0 })
    .catch(() => null)) as LocalizedDoc<TSlug> | null
  if (!localizedDoc) return { kind: 'not-found' }

  if (await isStale(origin, collection, id, locale)) return { kind: 'stale', locale, doc: localizedDoc }
  return { kind: 'hit', locale, doc: localizedDoc }
}

/** Queue one background translation via the plugin's published enqueue route. */
export async function enqueueTranslation(
  origin: string,
  {
    collection,
    id,
    locale,
  }: {
    collection: string
    id: string | number
    locale: string
  },
): Promise<{ queued: number | null; queueError: string | null }> {
  try {
    const res = await fetch(new URL('/api/translate/enqueue', origin), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_lng: 'en',
        target_lng: locale,
        collection_slug: collection,
        collection_id: [id],
        strategy: 'overwrite',
      }),
    })
    if (!res.ok) return { queued: null, queueError: `enqueue HTTP ${res.status}` }
    // Pinned shape 0.13.4: { data: { success, queued } } — no job id is returned.
    const body = (await res.json()) as { data?: { queued?: number } }
    return { queued: body.data?.queued ?? null, queueError: null }
  } catch (err) {
    return { queued: null, queueError: err instanceof Error ? err.message : 'enqueue failed' }
  }
}
