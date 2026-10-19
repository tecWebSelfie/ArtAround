import 'server-only'

import config from '@/payload.config'
import type { User } from '@/payload-types'
import type { Route } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  createLocalReq,
  docAccessOperation,
  getPayload,
  type SanitizedCollectionPermission,
} from 'payload'
import { cache } from 'react'

/**
 * Server-side session for frontend pages.
 *
 * Local API calls bypass access control by default, which would leak paid
 * bodies and private fields. Every page read made on behalf of a visitor goes
 * through `asViewer` (`user` + `overrideAccess: false`), so pages see exactly
 * what REST would return to the same visitor.
 */
export const getSession = cache(async () => {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  // MCP API keys can authenticate too; frontend pages only care about users.
  const viewer =
    user && user.collection === 'users' ? (user as User & { collection: 'users' }) : null
  return { payload, user: viewer }
})

/**
 * Editing pages need a signed-in visitor: anonymous ones are sent to sign in
 * and come back to `returnTo` afterwards.
 */
export async function requireUser(lng: string, returnTo: string) {
  const { user } = await getSession()
  if (!user) redirect(`/${lng}/login?next=${encodeURIComponent(returnTo)}` as Route)
  return user
}

/** Local API options that apply the visitor's own permissions. */
export async function asViewer() {
  const { user } = await getSession()
  return { user, overrideAccess: false as const }
}

type PermissionSlug = 'museums' | 'objects' | 'contents' | 'tours' | 'users'

/**
 * Per-document permissions for the current visitor, computed by Payload from
 * the same access functions that guard writes (`docAccessOperation`, what the
 * admin panel uses). Pages use it to decide which edit affordances to show,
 * so the UI can never drift from the server rules.
 */
export const getDocPermissions = cache(
  async (collection: PermissionSlug, id: string): Promise<SanitizedCollectionPermission | null> => {
    const { payload, user } = await getSession()
    if (!user) return null
    const req = await createLocalReq({ user }, payload)
    return docAccessOperation({ collection: payload.collections[collection], id, req })
  },
)

/** Whether the visitor may perform `operation` on the document (and, optionally, a field). */
export async function can(
  collection: PermissionSlug,
  id: string,
  operation: 'update' | 'delete',
  field?: string,
): Promise<boolean> {
  const permissions = await getDocPermissions(collection, id)
  if (!permissions?.[operation]) return false
  if (operation === 'update' && field) {
    // Sanitized permissions collapse "everything allowed" to `true` and omit denied keys.
    const fields = permissions.fields
    if (fields === true) return true
    const entry = fields?.[field]
    return entry === true || Boolean(entry?.update)
  }
  return true
}
