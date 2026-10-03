import type { Endpoint } from 'payload'
import {
  enqueueTranslation,
  headerLocale,
  normalizeLocale,
  resolveLocalized,
  type LocalizedSlug,
} from '@/lib/localized'

// Demo rate limit for anonymous on-demand enqueue (per server instance).
// 30 enqueues/min per IP; HIT reads are never limited.
const enqueueHits = new Map<string, number[]>()
function allowEnqueue(ip: string): boolean {
  const now = Date.now()
  const windowStart = now - 60_000
  const hits = (enqueueHits.get(ip) ?? []).filter((t) => t > windowStart)
  if (hits.length >= 30) {
    enqueueHits.set(ip, hits)
    return false
  }
  hits.push(now)
  enqueueHits.set(ip, hits)
  return true
}

/**
 * Collection custom endpoint `GET /api/{collection}/:id/localized?locale=xx`.
 *
 * Thin HTTP shell over `resolveLocalized()` (`src/lib/localized.ts`, the same
 * helper server components and scripts use via Local API): receipt book
 * decides MISS/HIT, the pinned staleness route decides freshness (fail-open).
 * This layer only adds validation, the per-IP enqueue throttle and HTTP status
 * codes. Custom endpoints are unauthenticated by default — the allowlist is
 * implicit (only collections this is mounted on).
 */
export function localizedReadEndpoint(collection: LocalizedSlug): Endpoint {
  return {
    path: '/:id/localized',
    method: 'get',
    handler: async (req) => {
      if (!req.url) return Response.json({ error: 'missing request url' }, { status: 500 })
      const origin = req.url
      const id = req.routeParams?.id as string | undefined
      const params = new URL(origin).searchParams
      // Explicit ?locale= wins (invalid value = 400, fail loud); Accept-Language
      // is only the zero-config fallback when the param is absent entirely.
      const locale = params.has('locale')
        ? normalizeLocale(params.get('locale'))
        : headerLocale(req.headers)

      if (!id) return Response.json({ error: 'missing id' }, { status: 400 })
      if (!locale) {
        return Response.json(
          { error: 'missing or invalid locale — use ?locale= (ISO 639-1) or Accept-Language' },
          { status: 400 },
        )
      }

      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
      const throttled = !allowEnqueue(ip)
      const state = await resolveLocalized(req.payload, origin, { collection, id, locale })

      switch (state.kind) {
        case 'not-found':
          return Response.json({ error: `document not found: ${collection}/${id}` }, { status: 404 })
        case 'hit':
          return Response.json({ status: 'hit', source: 'db', locale, doc: state.doc })
        case 'miss': {
          if (throttled) {
            return Response.json(
              { status: 'miss-throttled', source: 'fallback-en', locale, doc: state.doc },
              { status: 429 },
            )
          }
          const q = await enqueueTranslation(origin, { collection, id, locale })
          return Response.json({
            status: q.queueError ? 'miss-queue-failed' : 'miss-queued',
            source: 'fallback-en',
            locale,
            doc: state.doc,
            queued: q.queued,
            ...(q.queueError ? { queueError: q.queueError } : {}),
            hint: 'Poll this same URL until status becomes "hit" — next visitors get HIT instantly.',
          })
        }
        case 'stale': {
          // Serve the stored translation either way; refresh only with quota.
          // (Throttled keeps polling on the client instead of mislabeling HIT.)
          if (throttled) {
            return Response.json({
              status: 'stale-refreshing',
              source: 'db-stale',
              locale,
              doc: state.doc,
              queued: null,
              queueError: 'throttled — retry shortly',
            })
          }
          const q = await enqueueTranslation(origin, { collection, id, locale })
          return Response.json({
            status: 'stale-refreshing',
            source: 'db-stale',
            locale,
            doc: state.doc,
            queued: q.queued,
            ...(q.queueError ? { queueError: q.queueError } : {}),
            hint: 'Serving the stored translation while a refresh runs — poll until status becomes "hit".',
          })
        }
      }
    },
  }
}
