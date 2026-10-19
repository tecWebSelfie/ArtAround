import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasPurchased, isPurchasable, loadEntitlements } from '@/lib/entitlements'

export const dynamic = 'force-dynamic'

/**
 * `GET /api/purchases` — the current user's entitlements.
 *
 * - `GET /api/purchases` → `{ entitlements: ['contents:…', 'tours:…'] }`
 * - `GET /api/purchases?collection=contents&id=…` → `{ purchased: boolean }`
 *
 * Anonymous requests get an empty result (never an error) so the UI can render
 * a signed-out state without special-casing 401s.
 */
export async function GET(request: Request) {
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: request.headers })
  if (!user || user.collection !== 'users') {
    return NextResponse.json({ entitlements: [], purchased: false, authenticated: false })
  }

  const url = new URL(request.url)
  const collection = url.searchParams.get('collection')
  const id = url.searchParams.get('id')

  if (collection && id) {
    const purchased = isPurchasable(collection)
      ? await hasPurchased(payload, user.id, collection, id)
      : false
    return NextResponse.json({ authenticated: true, collection, id, purchased })
  }

  const entitlements = await loadEntitlements(payload, user.id)
  return NextResponse.json({ authenticated: true, entitlements: [...entitlements] })
}
