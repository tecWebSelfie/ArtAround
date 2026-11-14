import IsoCodes from 'iso-639-1'
// `.js` on purpose: this module is reachable from `payload.config`, which the Playwright
// helpers (tests/helpers/seedUser.ts) import. Playwright loads them as native ESM
// (package.json `"type": "module"`) and `next` has no `exports` map, so Node's ESM
// resolver needs the explicit file. Bundlers resolve both spellings.
// No other module on that path imports from `next/*` (checked with `playwright test --list`).
import { after } from 'next/server.js'
import type { Payload, TypedLocale, TypedUser } from 'payload'
import type { Config } from '@/payload-types'
import { relationshipIds } from './search-index'

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
  const first = headers.get('accept-language')?.split(',')[0]?.split(';')[0]?.trim()
  return normalizeLocale(first || null)
}

const PROVENANCE_COLLECTION = 'translator-provenance' as const

/**
 * Where the server calls its own routes (translator stale check and enqueue,
 * uploaded files). `PAYLOAD_INTERNAL_URL` overrides the public URL when the
 * server can't reach it itself (Tailscale cloud preview, docs/cloud-preview.md).
 * Never take it from the request: behind a proxy that host is the public one.
 */
export const SELF_ORIGIN =
  process.env.PAYLOAD_INTERNAL_URL || process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000'

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

async function isStale(collection: string, id: string | number, locale: string): Promise<boolean> {
  try {
    const res = await fetch(
      new URL(
        `${STALE_BASE}/${encodeURIComponent(collection)}/${encodeURIComponent(String(id))}`,
        SELF_ORIGIN,
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
  {
    collection,
    id,
    locale,
    user = null,
    overrideAccess = false,
  }: {
    collection: TSlug
    id: string | number
    locale: TypedLocale
    /**
     * The visitor the document is read for. Document reads apply
     * access control by default, so field rules such as the
     * paid-content body hold here too; `null` reads as an anonymous visitor.
     */
    user?: TypedUser | null
    /**
     * Skip access control, for server-only reads whose result never reaches
     * the browser as is (quiz questions: `src/lib/quiz.server.ts` sends only
     * reduced views without the answer).
     */
    overrideAccess?: boolean
  },
): Promise<LocalizedState<TSlug>> {
  const viewer = { user, overrideAccess }
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
    .findByID({ collection, id, locale: 'en', depth: 0, ...viewer })
    .catch(() => null)) as LocalizedDoc<TSlug> | null
  if (!fallbackDoc) return { kind: 'not-found' }

  if (receipts.totalDocs === 0) return { kind: 'miss', locale, doc: fallbackDoc }

  const localizedDoc = (await payload
    .findByID({ collection, id, locale, fallbackLocale: false, depth: 0, ...viewer })
    .catch(() => null)) as LocalizedDoc<TSlug> | null
  if (!localizedDoc) return { kind: 'not-found' }

  if (await isStale(collection, id, locale)) return { kind: 'stale', locale, doc: localizedDoc }
  return { kind: 'hit', locale, doc: localizedDoc }
}

/** Queue one background translation via the plugin's published enqueue route. */
export async function enqueueTranslation({
  collection,
  id,
  locale,
}: {
  collection: string
  /** One document, or several of the same collection in one request. */
  id: string | number | (string | number)[]
  locale: string
}): Promise<{ queued: number | null; queueError: string | null }> {
  try {
    const res = await fetch(new URL('/api/translate/enqueue', SELF_ORIGIN), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_lng: 'en',
        target_lng: locale,
        collection_slug: collection,
        collection_id: Array.isArray(id) ? id : [id],
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

/** "it" → "Italian": the English name of a language, as the AI prompts name it. */
export function languageName(code: string | null | undefined, fallback = 'English') {
  return (code && IsoCodes.getName(code)) || fallback
}

/**
 * Documents whose translation was just queued here, so a page polling for it
 * (and every other visitor meanwhile) doesn't queue it again. Per server
 * instance; a failed job is retried after the window.
 */
const requestedAt = new Map<string, number>()
/** The translator plugin's Payload Jobs queue (its runner's default name). */
const TRANSLATION_QUEUE = 'translations'
const REQUEST_AGAIN_AFTER_MS = 3 * 60_000
const requestKey = (collection: string, id: string, locale: string) =>
  `${collection}:${id}:${locale}`

/**
 * The ids not requested within the window, now marked as requested. Entries
 * past the window are dropped on the way, so the map stays as small as the
 * work in progress.
 */
function claim(collection: string, ids: string[], locale: string): string[] {
  const now = Date.now()
  for (const [key, at] of requestedAt) {
    if (now - at > REQUEST_AGAIN_AFTER_MS) requestedAt.delete(key)
  }
  const fresh = ids.filter((id) => !requestedAt.has(requestKey(collection, id, locale)))
  for (const id of fresh) requestedAt.set(requestKey(collection, id, locale), now)
  return fresh
}

/**
 * Whether a translation into `locale` can arrive at all: not into English
 * (the source language), and not without a provider key (CI, a deployment
 * without AI), where nothing is queued and no page waits.
 */
const canTranslateInto = (locale: string) => locale !== 'en' && Boolean(process.env.GROQ_API_KEY)

/**
 * Queues the translation of documents known to have none in `locale` (once
 * per window) and says whether the page showing them should wait for it.
 * Never throws: a page must render even when the queue is down.
 *
 * Two speeds. The translation queue's own schedule is deliberately slow (one
 * document every 10 s, src/plugins/autoTranslate.ts): a tour queues all its
 * stops at once, and translating them together used up the provider's
 * tokens-per-minute, so the visitor's own requests ("Shorter", the voice
 * assistant) failed meanwhile. `urgent` is for the one text the visitor is
 * reading right now: its job runs as soon as the response is sent, ahead of
 * that background trickle.
 */
export async function queueTranslations(
  payload: Payload,
  collection: LocalizedSlug,
  missing: (string | number)[],
  locale: TypedLocale,
  { urgent = false }: { urgent?: boolean } = {},
): Promise<boolean> {
  if (missing.length === 0 || !canTranslateInto(locale)) return false
  try {
    const ids = [...new Set(missing.map(String))]
    const toQueue = claim(collection, ids, locale)
    if (toQueue.length === 0) return true
    const { queueError } = await enqueueTranslation({ collection, id: toQueue, locale })
    if (queueError) {
      // Not queued after all: let the next page view try again.
      for (const id of toQueue) requestedAt.delete(requestKey(collection, id, locale))
      // Pending only if an earlier request of these documents is still on its way.
      return toQueue.length < ids.length
    }
    if (urgent) {
      const runNow = () =>
        payload.jobs
          .run({
            queue: TRANSLATION_QUEUE,
            where: {
              and: [
                { 'input.collection_slug': { equals: collection } },
                { 'input.collection_id': { in: toQueue } },
              ],
            },
            limit: toQueue.length,
          })
          // The scheduled run picks the job up if this one could not.
          .catch(() => undefined)
      try {
        // After the response: the visitor's page is not held back by the model.
        after(runNow)
      } catch {
        // No request to run after (a script or a test): start it right away.
        void runNow()
      }
    }
    return true
  } catch {
    return false
  }
}

/**
 * Makes sure the given documents get translated into `locale`: the ones with
 * no translation receipt yet are queued (`queueTranslations`), and the result
 * says whether any is still missing, i.e. whether the page showing them is
 * on its English fallback and should refresh shortly
 * (`TranslationPending`, src/components/TranslationPending.tsx).
 *
 * This is what makes translation happen for visitors: the server pages read
 * through the Local API (`resolveLocalized`, or `locale` with Payload's
 * fallback), which never queues anything; only the HTTP endpoint did, and no
 * page calls it.
 */
export async function requestTranslations(
  payload: Payload,
  collection: LocalizedSlug,
  ids: (string | number)[],
  locale: TypedLocale,
  options: { urgent?: boolean } = {},
): Promise<boolean> {
  if (ids.length === 0 || !canTranslateInto(locale)) return false
  try {
    const wanted = [...new Set(ids.map(String))]
    const receipts = await payload.find({
      collection: PROVENANCE_COLLECTION,
      where: {
        and: [
          { collectionSlug: { equals: collection } },
          { documentId: { in: wanted } },
          { targetLocale: { equals: locale } },
        ],
      },
      pagination: false,
      depth: 0,
    })
    const translated = new Set(receipts.docs.map((receipt) => receipt.documentId))
    return queueTranslations(
      payload,
      collection,
      wanted.filter((id) => !translated.has(id)),
      locale,
      options,
    )
  } catch {
    return false
  }
}

/**
 * Everything a tour shows in the visitor's language: the tour itself (title,
 * directions: on screen now, so urgent), its stops and its final quiz, which
 * are prepared in the background ahead of the visitor. One definition for the
 * tour page and the tour's navigation.
 */
export async function requestTourTranslations(
  payload: Payload,
  tour: { id: string; contents?: unknown; quiz?: { questions?: unknown } | null },
  locale: TypedLocale,
): Promise<boolean> {
  const pending = await Promise.all([
    requestTranslations(payload, 'tours', [tour.id], locale, { urgent: true }),
    requestTranslations(payload, 'contents', relationshipIds(tour.contents), locale),
    requestTranslations(payload, 'quizQuestions', relationshipIds(tour.quiz?.questions), locale),
  ])
  return pending.some(Boolean)
}

/**
 * Queues a fresh translation of a document whose stored one is older than its
 * source text (`resolveLocalized` → `stale`). The stored translation keeps
 * being served meanwhile, so nothing waits on this. Same once-per-window rule.
 */
export async function refreshTranslation(
  collection: LocalizedSlug,
  id: string | number,
  locale: TypedLocale,
): Promise<void> {
  if (claim(collection, [String(id)], locale).length === 0) return
  await enqueueTranslation({ collection, id, locale })
}
