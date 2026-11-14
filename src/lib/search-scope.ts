import 'server-only'

import { displayName } from '@/lib/display-name'
import { OBJECT_ID } from '@/lib/museum-cookie'
import { contentIdsOf } from '@/lib/museum-mode'
import { normalizeLocale } from '@/lib/localized'
import type { Payload, TypedLocale, Where } from 'payload'

/**
 * The search pages' URL scopes: `?at=` (a museum), `?author=` and `?subject=` narrow
 * `/search/{tours,contents,objects}` to one museum, one person's work or one
 * artist/movement/event. They are what a "See all" link opens (the museum
 * page's tours and works, a profile's tours and contents, a subject's
 * contents and works), so the list continues the section it came from.
 *
 * Each scope is shown on the page as a removable chip (`SearchScopeChips`),
 * so a narrowed list never just looks short. Unlike museum mode (a cookie
 * that scopes every list), these live in the URL and stay shareable.
 *
 * The museum scope is `at`, not `museum`: a bare `?museum=` on any page is a
 * printed QR code that switches the app to museum mode (`src/proxy.ts`).
 * A page in picker mode (`?pick=…`, `tour-picker.ts`, `museum-picker.ts`)
 * does not read scopes.
 */

import type { ScopeParam, SearchKind } from '@/lib/search-url'

export type { ScopeParam, SearchKind } from '@/lib/search-url'

/** Which scopes each kind supports: objects have no author on the site. */
const KIND_SCOPES: Record<SearchKind, ScopeParam[]> = {
  tours: ['at', 'author', 'subject'],
  contents: ['at', 'author', 'subject'],
  objects: ['at', 'subject'],
}

type Params = Record<string, string | string[] | undefined>
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** One active scope: its parameter, the id, and the name its chip shows. */
export type SearchScope = { param: ScopeParam; id: string; name: string }

/**
 * Reads the kind's scopes from the query and resolves them on the server.
 * Returns the `where` to AND with the page's own filters (null when no scope
 * is set), and the scopes with their names for the chips. A scope whose id
 * is malformed or names nothing is dropped, so a stale link still opens a
 * list instead of an error.
 */
export async function resolveSearchScopes(
  payload: Payload,
  kind: SearchKind,
  params: Params,
  lng: string,
): Promise<{ where: Where | null; scopes: SearchScope[] }> {
  const requested = KIND_SCOPES[kind]
    .map((param) => ({ param, id: first(params[param]) }))
    .filter((scope): scope is { param: ScopeParam; id: string } =>
      Boolean(scope.id && OBJECT_ID.test(scope.id)),
    )
  const resolved = await Promise.all(
    requested.map(async ({ param, id }) => {
      const found = await resolveOne(payload, kind, param, id, normalizeLocale(lng) ?? 'en')
      return found ? { scope: { param, id, name: found.name }, where: found.where } : null
    }),
  )
  const kept = resolved.filter((entry) => entry !== null)
  return {
    where: kept.length ? { and: kept.map((entry) => entry.where) } : null,
    scopes: kept.map((entry) => entry.scope),
  }
}

/**
 * The name and the condition of one scope on one kind. System reads
 * (`depth: 0`, names and ids only): the list query itself runs as the
 * visitor (`asViewer` on every search page), so an id a scope lets through
 * is still subject to the visitor's access.
 */
async function resolveOne(
  payload: Payload,
  kind: SearchKind,
  param: ScopeParam,
  id: string,
  // Names are editorial (a subject reads "Giotto" or "Giotto di Bondone").
  locale: TypedLocale,
): Promise<{ name: string; where: Where } | null> {
  if (param === 'author') {
    const user = await payload
      .findByID({ collection: 'users', id, depth: 0, select: { name: true, username: true } })
      .catch(() => null)
    return user ? { name: displayName(user), where: { author: { equals: id } } } : null
  }

  if (param === 'at') {
    // Tours only need the name; objects and contents the map's objects.
    const museum = await payload
      .findByID({
        collection: 'museums',
        id,
        locale,
        depth: 0,
        select: kind === 'tours' ? { name: true } : { name: true, objects: true },
      })
      .catch(() => null)
    if (!museum) return null
    if (kind === 'tours') return { name: museum.name, where: { museum: { equals: id } } }
    // A museum holds the objects placed on its map, and their contents.
    const objectIds = ids(museum.objects)
    if (kind === 'objects') return { name: museum.name, where: { id: { in: objectIds } } }
    const contentIds = await contentIdsOf(payload, objectIds)
    return { name: museum.name, where: { id: { in: contentIds } } }
  }

  // Subject: the works that name it (creator, movement, event) and the
  // contents about it (`subjects.contents`, where the link is stored); a
  // tour is about it when one of its stops is.
  const subject = await payload
    .findByID({
      collection: 'subjects',
      id,
      locale,
      depth: 0,
      select: { name: true, contents: true },
    })
    .catch(() => null)
  if (!subject) return null
  if (kind === 'objects') {
    return {
      name: subject.name,
      where: {
        or: [
          { creators: { contains: id } },
          { movements: { contains: id } },
          { events: { contains: id } },
        ],
      },
    }
  }
  const about = ids(subject.contents)
  if (kind === 'contents') return { name: subject.name, where: { id: { in: about } } }
  return { name: subject.name, where: { contents: { in: about } } }
}

/** Ids of a relationship value, populated or not. */
const ids = (values: (string | { id: string })[] | null | undefined) =>
  (values ?? []).map((value) => (typeof value === 'string' ? value : value.id))

/** The active scopes as query parameters, kept on every URL the search writes. */
export const scopeParams = (scopes: SearchScope[]) =>
  Object.fromEntries(scopes.map((scope) => [scope.param, scope.id]))
