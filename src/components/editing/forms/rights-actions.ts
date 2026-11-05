'use server'

import { hasRank } from '@/access/museumRoles'
import { MUSEUM_FUNCTION_CURATOR } from '@/fields/MuseumFunction'
import { getSiteChrome } from '@/lib/site-chrome'

/**
 * The museums the signed-in author may name as a content's rights holder:
 * those where they are curator or director. Feeds the "Rights holder" select
 * of `ContentFields`; the `contents` hook (`guardRights`) enforces the same
 * rule on save, so this list is a convenience, not the check.
 */
export async function loadRightsMuseums(): Promise<{ id: string; name: string }[]> {
  const { myMuseums } = await getSiteChrome()
  return myMuseums
    .filter(({ role }) => hasRank(role, MUSEUM_FUNCTION_CURATOR))
    .map(({ id, name }) => ({ id, name }))
}
