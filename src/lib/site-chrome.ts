import 'server-only'

import type { MyMuseum, NavAccount } from '@/components/navigation/nav-shared'
import type { MuseumOption } from '@/components/mantine/MuseumSwitch'
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
  const memberships = user
    ? await payload.find({
        collection: 'user-museum-memberships',
        where: { user: { equals: user.id } },
        depth: 1,
        pagination: false,
        populate: { museums: { name: true } },
      })
    : null
  const myMuseums: MyMuseum[] = (memberships?.docs ?? []).flatMap((membership) =>
    typeof membership.museum === 'object'
      ? [{ id: membership.museum.id, name: membership.museum.name, role: membership.role }]
      : [],
  )

  // Museum mode: the switch shows the locked museum (or "All museums") and
  // opens the "Change museum" modal.
  const [scope, museums] = await Promise.all([
    museumScope(),
    payload.find({
      collection: 'museums',
      limit: 200,
      depth: 0,
      sort: 'name',
      select: { name: true, location: true },
    }),
  ])

  const account: NavAccount | null = user
    ? {
        id: String(user.id),
        name: user.name?.fullName || user.username,
        avatarUrl: typeof user.avatar === 'object' ? user.avatar?.url : null,
      }
    : null

  return {
    account,
    myMuseums,
    currentMuseum: scope ? { id: scope.museumId, name: scope.name } : null,
    museums: museums.docs.map(
      (museum): MuseumOption => ({ id: museum.id, name: museum.name, city: museum.location?.city }),
    ),
  }
})
