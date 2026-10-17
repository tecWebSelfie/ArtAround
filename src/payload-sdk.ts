import type { LocalizedDoc, LocalizedSlug } from '@/lib/localized'
import type { Config } from '@/payload-types'
import { PayloadSDK } from '@payloadcms/sdk'

function resolveBaseURL(): string {
  const raw = process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000'
  const trimmed = raw.replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

export const payloadSdk = new PayloadSDK<Config>({
  baseURL: resolveBaseURL(),
  baseInit: { credentials: 'include' },
})

export type LocalizedAPIResult<TSlug extends LocalizedSlug> =
  | { status: 'hit'; source: 'db'; locale: string; doc: LocalizedDoc<TSlug> }
  | {
      status: 'miss-queued' | 'miss-queue-failed' | 'stale-refreshing'
      source: 'fallback-en' | 'db-stale'
      locale: string
      doc: LocalizedDoc<TSlug>
      queued: number | null
      queueError?: string
      hint?: string
    }
  | { status: 'miss-throttled'; source: 'fallback-en'; locale: string; doc: LocalizedDoc<TSlug> }
  | { error: string }

/**
 * Typed client for `GET /api/{collection}/:id/localized[?locale=xx]`
 * (mounted by `autoTranslatePlugin`). `doc` is the generated entity type for
 * the collection — never `any`.
 *
 * `locale` is optional: omitted, the server falls back to the request's
 * `Accept-Language` header (pass it via `init.headers`); explicit `?locale=`
 * always wins. Prefer explicit — deterministic, shareable, cache-friendly.
 *
 * NOTE: `baseURL` above already includes the `/api` prefix (see
 * `NEXT_PUBLIC_PAYLOAD_URL`), as the SDK's built-in methods (`findByID`,
 * `update`, …) send paths like `/{collection}/{id}`. Custom `request()`
 * paths below therefore omit the `/api` prefix.
 */
export async function getLocalizedDoc<TSlug extends LocalizedSlug>(
  {
    collection,
    id,
    locale,
  }: {
    collection: TSlug
    id: string | number
    locale?: string
  },
  init?: RequestInit,
): Promise<LocalizedAPIResult<TSlug>> {
  const query = locale ? `?locale=${encodeURIComponent(locale)}` : ''
  const res = await payloadSdk.request({
    method: 'GET',
    path: `/${collection}/${String(id)}/localized${query}`,
    init,
  })
  return (await res.json()) as LocalizedAPIResult<TSlug>
}
