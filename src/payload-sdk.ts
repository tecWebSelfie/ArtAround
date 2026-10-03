import { PayloadSDK } from '@payloadcms/sdk'
import type { Config } from '@/payload-types'
import type { LocalizedDoc, LocalizedSlug } from '@/lib/localized'

export const payloadSdk = new PayloadSDK<Config>({
  baseURL: process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000',
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
 * NOTE: `baseURL` above is the bare server origin (see `NEXT_PUBLIC_PAYLOAD_URL`),
 * so the `/api` prefix is part of the path here — unlike the SDK's built-in
 * methods, which expect `baseURL` to already include it.
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
    path: `/api/${collection}/${String(id)}/localized${query}`,
    init,
  })
  return (await res.json()) as LocalizedAPIResult<TSlug>
}
