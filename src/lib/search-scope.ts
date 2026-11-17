import 'server-only'

import { displayName } from '@/lib/display-name'
import { normalizeLocale } from '@/lib/localized'
import { OBJECT_ID } from '@/lib/museum-cookie'
import { filterEquals } from '@/lib/search/query'
import type { ScopeParam, SearchKind } from '@/lib/search-url'
import type { Payload, TypedLocale } from 'payload'

/**
 * The search pages' URL scopes: `?at=` (a museum), `?author=` and `?subject=`
 * narrow `/search/{tours,contents,objects}` to one museum, one person's work or
 * one artist/movement/event. They are what a "See all" link opens (the museum
 * page's tours and works, a profile's tours and contents, a subject's works), so
 * the list continues the section it came from.
 *
 * Each scope is one condition on an id the index already carries (`museum_id`,
 * `author_id`, `subject_ids`; `src/lib/search/documents.ts`), so a narrowed list
 * is the same ranked, paginated Typesense query as the unscoped one with one
 * more `filter_by`. Payload is read only for the name each chip shows: an empty
 * scope therefore stays empty instead of silently turning into a site search.
 *
 * Each scope is shown on the page as a removable chip (`SearchScopeChips`), so
 * a narrowed list never just looks short. Unlike museum mode (a cookie that
 * scopes every list), these live in the URL and stay shareable.
 *
 * The museum scope is `at`, not `museum`: a bare `?museum=` on any page is a
 * printed QR code that switches the app to museum mode (`src/proxy.ts`).
 * A page in picker mode (`?pick=…`, `tour-picker.ts`, `museum-picker.ts`)
 * does not read scopes.
 */

/** Which scopes each kind supports: objects have no author on the site. */
const KIND_SCOPES: Record<SearchKind, ScopeParam[]> = {
  tours: ['at', 'author', 'subject'],
  contents: ['at', 'author', 'subject'],
  objects: ['at', 'subject'],
}

/** The indexed field each scope filters on (`src/lib/search/schema.ts`). */
const FILTER_FIELD: Record<ScopeParam, string> = {
  at: 'museum_id',
  author: 'author_id',
  subject: 'subject_ids',
}

type Params = Record<string, string | string[] | undefined>
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** One active scope: its parameter, the id, and the name its chip shows. */
export type SearchScope = { param: ScopeParam; id: string; name: string }

/**
 * Reads the kind's scopes from the query and resolves their names.
 * Returns the `filter_by` conditions to AND with the page's own filters (empty
 * when no scope is set), and the scopes with their names for the chips. A
 * scope whose id is malformed or names nothing is dropped, so a stale link
 * still opens a list instead of an error.
 */
export async function resolveSearchScopes(
  payload: Payload,
  kind: SearchKind,
  params: Params,
  lng: string,
): Promise<{ filters: string[]; scopes: SearchScope[] }> {
  // A picker round trip (`?pick=…`) is its own mode: it reads no scopes.
  if (params.pick !== undefined) return { filters: [], scopes: [] }
  const locale = normalizeLocale(lng) ?? 'en'
  const requested = KIND_SCOPES[kind]
    .map((param) => ({ param, id: first(params[param]) }))
    .filter((scope): scope is { param: ScopeParam; id: string } =>
      Boolean(scope.id && OBJECT_ID.test(scope.id)),
    )
  const resolved = await Promise.all(
    requested.map(async ({ param, id }) => {
      const name = await nameOf(payload, param, id, locale)
      return name ? { param, id, name } : null
    }),
  )
  const scopes = resolved.filter((scope) => scope !== null)
  return {
    filters: scopes.map((scope) => filterEquals(FILTER_FIELD[scope.param], scope.id)),
    scopes,
  }
}

/**
 * The name one scope shows on its chip. System reads (`depth: 0`, names only:
 * chips are not the visitor's own content), in the page's locale, since a
 * subject reads "Giotto" or "Giotto di Bondone" depending on the language.
 * A malformed or deleted id resolves to null and the scope is dropped.
 */
async function nameOf(
  payload: Payload,
  param: ScopeParam,
  id: string,
  locale: TypedLocale,
): Promise<string | null> {
  if (param === 'author') {
    const user = await payload
      .findByID({ collection: 'users', id, depth: 0, select: { name: true, username: true } })
      .catch(() => null)
    return user ? displayName(user) : null
  }
  if (param === 'at') {
    const museum = await payload
      .findByID({ collection: 'museums', id, locale, depth: 0, select: { name: true } })
      .catch(() => null)
    return museum?.name ?? null
  }
  const subject = await payload
    .findByID({ collection: 'subjects', id, locale, depth: 0, select: { name: true } })
    .catch(() => null)
  return subject?.name ?? null
}

/** The active scopes as query parameters, kept on every URL the search writes. */
export const scopeParams = (scopes: SearchScope[]) =>
  Object.fromEntries(scopes.map((scope) => [scope.param, scope.id]))
