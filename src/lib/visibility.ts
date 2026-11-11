import { asId, isSuperAdmin } from '@/access/museumRoles'
import { jwtVerify, SignJWT } from 'jose'
import { createSecretKey } from 'node:crypto'
import type { Access, CollectionAfterChangeHook, PayloadRequest, Where } from 'payload'
import { parseCookies } from 'payload/shared'
import { cache } from 'react'

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
const CONTENTS_CACHE = 'groupTourContentIds'

/**
 * The group cookie of the request. REST requests carry it in `req.headers`;
 * Local API reads made by a page or route handler for its visitor
 * (`asViewer`, `resolveLocalized`) get a request with empty headers, so the
 * cookie comes from the Next request being rendered. Outside one (scripts,
 * jobs) `cookies()` throws: no visitor, no cookie.
 */
async function groupCookie(req: PayloadRequest): Promise<string | null> {
  const fromHeaders = req.headers ? parseCookies(req.headers).get(GROUP_TOUR_COOKIE) : undefined
  // A REST or GraphQL request's own headers are the whole truth.
  if (fromHeaders || req.payloadAPI !== 'local') return fromHeaders ?? null
  try {
    const { cookies } = await import('next/headers')
    return (await cookies()).get(GROUP_TOUR_COOKIE)?.value ?? null
  } catch (error) {
    // Next's own signals (a static prerender bailing out to dynamic) must go through.
    const { unstable_rethrow } = await import('next/navigation')
    unstable_rethrow(error)
    return null
  }
}

/**
 * The token's signature checked once per page render: every Local API read of
 * a page builds its own request, so `req.context` alone would verify it again
 * for each one. Outside a React render `cache` simply doesn't memoize.
 */
const verifyOnce = cache(verifyGroupTourToken)

/** The tour of the request's group cookie, verified once per request. */
export function groupTourOf(req: PayloadRequest): Promise<string | null> {
  const cached = req.context[COOKIE_CACHE] as Promise<string | null> | undefined
  if (cached) return cached
  const pending = groupCookie(req).then(verifyOnce)
  req.context[COOKIE_CACHE] = pending
  return pending
}

/**
 * The contents of the group cookie's tour, read once per request: a page
 * runs `contents.read` for every find, count and join it makes.
 */
function groupTourContentIds(req: PayloadRequest, tourId: string): Promise<string[]> {
  const cached = req.context[CONTENTS_CACHE] as Promise<string[]> | undefined
  if (cached) return cached
  const pending = req.payload
    .findByID({
      collection: 'tours',
      id: tourId,
      depth: 0,
      select: { contents: true },
      overrideAccess: true,
      req,
    })
    .then((tour) => (tour.contents ?? []).map(asId).filter((id): id is string => Boolean(id)))
    .catch(() => [])
  req.context[CONTENTS_CACHE] = pending
  return pending
}

/**
 * Read access for a collection with `visibility`: public documents, the
 * caller's own, and what the group cookie unlocks (`groupWhere`).
 */
const readVisible =
  (groupWhere: (req: PayloadRequest, tourId: string) => Promise<Where | null>): Access =>
  async ({ req }) => {
    if (isSuperAdmin(req)) return true
    const or: Where[] = [{ visibility: { not_equals: 'private' } }]
    if (req.user) or.push({ author: { equals: req.user.id } })
    const tourId = await groupTourOf(req)
    const group = tourId ? await groupWhere(req, tourId) : null
    if (group) or.push(group)
    return { or }
  }

/** `tours.read`: public tours, own tours, and the tour of the group cookie. */
export const readTours = readVisible(async (_req, tourId) => ({ id: { equals: tourId } }))

/** `contents.read`: public contents, own contents, and the contents of the group cookie's tour. */
export const readContents = readVisible(async (req, tourId) => {
  const ids = await groupTourContentIds(req, tourId)
  return ids.length ? { id: { in: ids } } : null
})

/**
 * `afterChange` hook: a document that is (or became) private leaves the
 * search index. The search plugin's `skipSync` only skips indexing, it never
 * removes a row saved while the document was public.
 */
export const hideFromSearch =
  (collection: 'contents' | 'tours'): CollectionAfterChangeHook =>
  async ({ doc, req }) => {
    if (doc.visibility !== 'private') return doc
    await req.payload.delete({
      collection: 'search',
      where: {
        and: [
          { 'doc.relationTo': { equals: collection } },
          { 'doc.value': { equals: String(doc.id) } },
        ],
      },
      overrideAccess: true,
      req,
    })
    return doc
  }

/**
 * Tours that lists show. A visit planned for one visitor ("Plan my visit",
 * `generation.generated`) is saved as a tour so that a group can follow it by
 * its link, but it is that visitor's own answer: every list of tours (the
 * museum page, a work's or a content's tours, search, the map's Spotlight)
 * leaves it out with this one rule, as a query and as a predicate.
 */
export const LISTED_TOURS: Where = { 'generation.generated': { not_equals: true } }
export const isPlannedVisit = (doc: unknown) =>
  (doc as { generation?: { generated?: boolean | null } | null } | null)?.generation?.generated ===
  true
