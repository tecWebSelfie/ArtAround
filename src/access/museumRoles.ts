import {
  MUSEUM_FUNCTION_CURATOR,
  MUSEUM_FUNCTION_DIRECTOR,
  MUSEUM_FUNCTION_RANK,
  type MuseumRole,
} from '@/fields/MuseumFunction'
import type { Access, PayloadRequest, Where } from 'payload'

/**
 * Per-museum authorization primitives shared by every collection rule.
 *
 * Roles are per museum (a director of A is nobody in B), so they cannot come
 * from the RBAC plugin's global `users.roles`: they are read from
 * `user-museum-memberships` once per request and cached in `req.context`
 * (access functions run many times per operation). Super admins bypass
 * everything, matching the RBAC plugin's own order.
 */

const ROLES_CACHE_KEY = 'museumRoles'

// `req.user` may also be an MCP API key principal, which never is a super admin.
export const isSuperAdmin = (req: PayloadRequest): boolean =>
  Boolean(req.user && 'isSuperAdmin' in req.user && req.user.isSuperAdmin)

export const authenticated: Access = ({ req }) => Boolean(req.user)

export const anyone: Access = () => true

export const superAdminOnly: Access = ({ req }) => isSuperAdmin(req)

const asId = (value: unknown): string | null =>
  typeof value === 'string'
    ? value
    : value && typeof value === 'object' && 'id' in value
      ? String((value as { id: unknown }).id)
      : null

/** museumId → the caller's function there (absent = no membership). */
export async function getMuseumRoles(req: PayloadRequest): Promise<Map<string, MuseumRole>> {
  if (!req.user) return new Map()
  const cached = req.context[ROLES_CACHE_KEY] as Promise<Map<string, MuseumRole>> | undefined
  if (cached) return cached
  // Cache the promise, not the result, so concurrent field-access checks of
  // the same request share one query.
  const pending = req.payload
    .find({
      collection: 'user-museum-memberships',
      where: { user: { equals: req.user.id } },
      depth: 0,
      pagination: false,
      select: { museum: true, role: true },
      req,
    })
    .then(({ docs }) => {
      const roles = new Map<string, MuseumRole>()
      for (const membership of docs) {
        const museumId = asId(membership.museum)
        if (museumId && membership.role) roles.set(museumId, membership.role)
      }
      return roles
    })
  req.context[ROLES_CACHE_KEY] = pending
  return pending
}

/** Drop the cached roles after a membership change inside the same request. */
export function forgetMuseumRoles(req: PayloadRequest) {
  delete req.context[ROLES_CACHE_KEY]
}

export const hasRank = (fn: MuseumRole | null | undefined, min: MuseumRole): boolean =>
  Boolean(fn) && MUSEUM_FUNCTION_RANK[fn!] >= MUSEUM_FUNCTION_RANK[min]

/** Museums where the caller holds at least `min`. */
export async function museumsWithRank(req: PayloadRequest, min: MuseumRole): Promise<string[]> {
  const roles = await getMuseumRoles(req)
  return [...roles].filter(([, fn]) => hasRank(fn, min)).map(([id]) => id)
}

export async function rankIn(req: PayloadRequest, museumId: string | null | undefined) {
  if (!museumId) return null
  return (await getMuseumRoles(req)).get(museumId) ?? null
}

/** Collection access: super admin, or a Where restricted to museums where caller ≥ `min`. */
export function museumScoped(min: MuseumRole, field = 'id'): Access {
  return async ({ req }) => {
    if (!req.user) return false
    if (isSuperAdmin(req)) return true
    const ids = await museumsWithRank(req, min)
    return ids.length ? ({ [field]: { in: ids } } as Where) : false
  }
}

/**
 * Objects exhibited by the given museums. `museums.objects` is the index the
 * map save derives from placed Pascal items (see `syncMuseumObjects`), so an
 * object "belongs" to every museum whose map shows it.
 */
export async function objectIdsInMuseums(
  req: PayloadRequest,
  museumIds: string[],
): Promise<string[]> {
  if (!museumIds.length) return []
  const { docs } = await req.payload.find({
    collection: 'museums',
    where: { id: { in: museumIds } },
    select: { objects: true },
    depth: 0,
    pagination: false,
    req,
  })
  return [...new Set(docs.flatMap((museum) => (museum.objects ?? []).map(asId)))].filter(
    (id): id is string => Boolean(id),
  )
}

/** Museums exhibiting any of the given objects (reverse of `objectIdsInMuseums`). */
export async function museumIdsForObjects(
  req: PayloadRequest,
  objectIds: string[],
): Promise<string[]> {
  if (!objectIds.length) return []
  const { docs } = await req.payload.find({
    collection: 'museums',
    where: { objects: { in: objectIds } },
    select: {},
    depth: 0,
    pagination: false,
    req,
  })
  return docs.map((museum) => String(museum.id))
}

/**
 * Museums a content belongs to: through the objects listing it in
 * `objects.contents`. Cached per request because paid-body read access asks
 * for every content of a list.
 */
export async function museumIdsForContent(
  req: PayloadRequest,
  contentId: string,
): Promise<string[]> {
  const key = `contentMuseums:${contentId}`
  const cached = req.context[key] as Promise<string[]> | undefined
  if (cached) return cached
  const pending = req.payload
    .find({
      collection: 'objects',
      where: { contents: { contains: contentId } },
      select: {},
      depth: 0,
      pagination: false,
      req,
    })
    .then(({ docs }) =>
      museumIdsForObjects(
        req,
        docs.map((object) => String(object.id)),
      ),
    )
  req.context[key] = pending
  return pending
}

/** Users holding at least `min` in a museum — the staff a lower rank cannot moderate. */
export async function staffIdsWithRank(
  req: PayloadRequest,
  museumId: string,
  min: MuseumRole,
): Promise<string[]> {
  const { docs } = await req.payload.find({
    collection: 'user-museum-memberships',
    where: { museum: { equals: museumId } },
    depth: 0,
    pagination: false,
    select: { user: true, role: true },
    req,
  })
  return docs
    .filter((membership) => hasRank(membership.role, min))
    .map((membership) => asId(membership.user))
    .filter((id): id is string => Boolean(id))
}

/**
 * Staff management rule: what an actor may grant or revoke in a museum —
 * strictly below their own rank (curators → verified; director → curator and
 * verified). The director seat is never grantable here: it is set when the
 * museum is created and moved only by a super admin.
 */
export function canManage(actor: MuseumRole | null, target: MuseumRole | null) {
  if (!actor || !hasRank(actor, MUSEUM_FUNCTION_CURATOR)) return false
  if (!target) return true
  if (target === MUSEUM_FUNCTION_DIRECTOR) return false
  return MUSEUM_FUNCTION_RANK[target] < MUSEUM_FUNCTION_RANK[actor]
}

export { asId }
