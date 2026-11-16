/**
 * The search pages' scoped URLs, safe on both sides (server pages, client
 * components and stories): what a "See all" link opens. The scopes are
 * resolved on the server by `src/lib/search-scope.ts`.
 */

export type SearchKind = 'tours' | 'contents' | 'objects'
/** `at`: a museum (not `museum`, which `src/proxy.ts` reads as a printed QR code). */
export type ScopeParam = 'at' | 'author' | 'subject'

/** The search URL a "See all" link opens: one kind, one scope. */
export function scopedSearchHref(lng: string, kind: SearchKind, param: ScopeParam, id: string) {
  return `/${lng}/search/${kind}?${new URLSearchParams({ [param]: id })}`
}
