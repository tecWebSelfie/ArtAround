import { isSuperAdmin } from '@/access/museumRoles'
import { jwtVerify, SignJWT } from 'jose'
import { createSecretKey } from 'node:crypto'
import type { Access, PayloadRequest, Where } from 'payload'

/**
 * Public and private contents and tours (requirement 8 of
 * `docs/plan/requisiti-18-33.md`). A teacher prepares a class visit with
 * contents nobody else should find: private documents are left out of every
 * read — search, marketplace, object lists, the planner — except for
 *
 * - their author (and super admins);
 * - the guests of a group visit of a tour, who hold the group cookie: a
 *   short-lived token, signed by the server with the LiveKit secret when they
 *   joined the room (`/api/rooms/token`), naming the room's tour. It lets them
 *   read that tour and its contents, nothing else.
 *
 * The access functions return query constraints, so every Local API, REST
 * and page read applies the same rule.
 */

export const VISIBILITY_OPTIONS = [
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
] as const

export type Visibility = (typeof VISIBILITY_OPTIONS)[number]['value']

/** Cookie with the signed group-visit token (`signGroupTourToken`). */
export const GROUP_TOUR_COOKIE = 'aa-group-tour'
/** A class visit lasts a morning: the token ends with it. */
export const GROUP_TOUR_TOKEN_HOURS = 4

const secret = () => {
  const value = process.env.LIVEKIT_API_SECRET
  return value ? createSecretKey(Buffer.from(value, 'utf8')) : null
}

/** The token a group guest receives on joining a room of `tourId`. */
export async function signGroupTourToken(tourId: string, room: string) {
  const key = secret()
  if (!key) return null
  return new SignJWT({ tourId, room })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${GROUP_TOUR_TOKEN_HOURS}h`)
    .setSubject('group-tour')
    .sign(key)
}

/** The tour a valid, unexpired group token names; null otherwise. */
export async function verifyGroupTourToken(token: string | undefined | null) {
  const key = secret()
  if (!token || !key) return null
  try {
    const { payload } = await jwtVerify(token, key, { subject: 'group-tour' })
    return typeof payload.tourId === 'string' ? payload.tourId : null
  } catch {
    return null
  }
}

const COOKIE_CACHE = 'groupTourId'

/** The tour of the request's group cookie, verified once per request. */
export function groupTourOf(req: PayloadRequest): Promise<string | null> {
  const cached = req.context[COOKIE_CACHE] as Promise<string | null> | undefined
  if (cached) return cached
  const cookie = req.headers?.get('cookie') ?? ''
  const token = cookie
    .split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === GROUP_TOUR_COOKIE)?.[1]
  const pending = verifyGroupTourToken(token ? decodeURIComponent(token) : null)
  req.context[COOKIE_CACHE] = pending
  return pending
}

const notPrivate: Where = { visibility: { not_equals: 'private' } }

/** `tours.read`: public tours, own tours, and the tour of the group cookie. */
export const readTours: Access = async ({ req }) => {
  if (isSuperAdmin(req)) return true
  const or: Where[] = [notPrivate]
  if (req.user) or.push({ author: { equals: req.user.id } })
  const tourId = await groupTourOf(req)
  if (tourId) or.push({ id: { equals: tourId } })
  return { or }
}

/** `contents.read`: public contents, own contents, and the contents of the group cookie's tour. */
export const readContents: Access = async ({ req }) => {
  if (isSuperAdmin(req)) return true
  const or: Where[] = [notPrivate]
  if (req.user) or.push({ author: { equals: req.user.id } })
  const tourId = await groupTourOf(req)
  if (tourId) {
    const tour = await req.payload
      .findByID({
        collection: 'tours',
        id: tourId,
        depth: 0,
        select: { contents: true },
        overrideAccess: true,
        req,
      })
      .catch(() => null)
    const ids = (tour?.contents ?? []).map((entry) =>
      typeof entry === 'string' ? entry : String(entry.id),
    )
    if (ids.length) or.push({ id: { in: ids } })
  }
  return { or }
}

/** Drops a document's search row: private documents are never indexed. */
export async function removeFromSearch(
  req: PayloadRequest,
  collection: 'contents' | 'tours',
  id: string,
) {
  await req.payload.delete({
    collection: 'search',
    where: {
      and: [{ 'doc.relationTo': { equals: collection } }, { 'doc.value': { equals: id } }],
    },
    overrideAccess: true,
    req,
  })
}
