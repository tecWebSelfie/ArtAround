import type { PayloadRequest } from 'payload'

/**
 * Purchase seam. Payments (checkout, purchases collection, refunds) are owned
 * by a separate workstream: everything that needs to know "has this user
 * bought content X?" goes through these two functions, so wiring real
 * purchases later changes this file only.
 *
 * Until then nobody owns paid contents except their author and the staff of
 * the museums they belong to (see `canReadPaidBody`).
 */
export async function getOwnedContentIds(req: PayloadRequest): Promise<Set<string>> {
  if (!req.user) return new Set()
  // TODO(payments): read the caller's purchases here.
  return new Set()
}

export async function ownsContent(req: PayloadRequest, contentId: string): Promise<boolean> {
  return (await getOwnedContentIds(req)).has(contentId)
}
