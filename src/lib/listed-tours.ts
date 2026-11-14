import 'server-only'

import { asViewer } from '@/lib/session'
import { LISTED_TOURS } from '@/lib/visibility'
import type { FindOptions, Payload, SelectType, TypedCollectionSelect } from 'payload'

/**
 * The one way a page or server helper reads a list of tours (the museum
 * rails, a work's or a content's tours, the tour search). Two rules apply to
 * every such list and are easy to forget at a new call site — `/search/tours`
 * once listed everyone's private tours by missing both:
 *
 * - the list rule (`LISTED_TOURS`): one visitor's own tours, planned visits
 *   and visit copies, never appear in a list. It is ANDed with the caller's
 *   `where`, so no caller filter can widen it;
 * - the visitor's permissions (`asViewer`): others' private tours stay out
 *   (`readTours`). A caller that passes `overrideAccess` itself (a system
 *   read, or its own `user`) opts out of this one, never of the list rule.
 *
 * Not covered here: the museum page's `tours` join (`Museums.ts`) and the
 * profile's `authoredTours` join (`Users.ts`), field configs that take
 * `LISTED_TOURS` directly, and in-memory filters over tours
 * read some other way (`isPersonalTour`, same rule as a predicate).
 */
export async function findListedTours<
  // A tours `select` as `payload.find` accepts it (its `SelectFromCollectionSlug` isn't exported).
  TSelect extends TypedCollectionSelect['tours'] & SelectType,
>(
  payload: Payload,
  // Lists show published tours only: no `draft` reads.
  options: Omit<FindOptions<'tours', TSelect>, 'collection' | 'draft'>,
) {
  const { where, ...rest } = options
  // `asViewer` reads the session (cached per render), so only when needed. An
  // `overrideAccess: undefined` key is no opt-out: Local API would default it to true.
  const access = options.overrideAccess === undefined ? await asViewer() : {}
  return payload.find<'tours', TSelect>({
    ...access,
    ...rest,
    collection: 'tours',
    where: where ? { and: [LISTED_TOURS, where] } : LISTED_TOURS,
  })
}
