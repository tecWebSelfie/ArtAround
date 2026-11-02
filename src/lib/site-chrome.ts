import 'server-only'

import { toNavAccount } from '@/components/navigation/nav-account'
import type { MyMuseum } from '@/components/navigation/nav-shared'
import type { MuseumOption } from '@/components/mantine/MuseumSwitch'
import { isPopulated } from '@/lib/isPopulated'
import { museumScope } from '@/lib/museum-mode'
import { getSession } from '@/lib/session'
import { cache } from 'react'

/**
 * Everything the app's navigation chrome shows about the visitor and the
 * museum scope: the account entry, the "My museums" shortcut and the museum
 * switch. Two places render it from the same data: the phone's bottom bar
 * (tabs layout) and the desktop top bar (`SiteHeader`, frontend layout).
 * `cache` makes both share one round of Local API reads per request.
 */
export const getSiteChrome = cache(async () => {
  // Local API session (cookie): decides the account entry and the "My museums"
  // shortcut for directors, curators and verified creators.
  const { payload, user } = await getSession()
  // The three reads are independent once the session is known: run them in
  // one round instead of waiting on the memberships first. Museum mode: the
  // switch shows the locked museum (or "All museums") and lists every museum.
  const [memberships, scope, museums] = await Promise.all([
    user
      ? payload.find({
          collection: 'user-museum-memberships',
          where: { user: { equals: user.id } },
          depth: 1,
          pagination: false,
          populate: { museums: { name: true } },
        })
      : null,
    museumScope(),
    payload.find({
      collection: 'museums',
      limit: 200,
      depth: 0,
      sort: 'name',
      select: { name: true, location: true },
    }),
  ])
  const myMuseums: MyMuseum[] = (memberships?.docs ?? []).flatMap((membership) =>
    isPopulated(membership.museum)
      ? [{ id: membership.museum.id, name: membership.museum.name, role: membership.role }]
      : [],
  )

  return {
    account: user ? toNavAccount(user) : null,
    myMuseums,
    currentMuseum: scope ? { id: scope.museumId, name: scope.name } : null,
    museums: museums.docs.map((museum): MuseumOption => ({
      id: museum.id,
      name: museum.name,
      city: museum.location?.city,
    })),
  }
})
