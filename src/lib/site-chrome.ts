import 'server-only'

import { toNavAccount } from '@/components/navigation/nav-account'
import type { MuseumOption } from '@/components/mantine/MuseumSwitch'
import { museumScope } from '@/lib/museum-mode'
import { museumAccent } from '@/lib/museum-color'
import { getSession } from '@/lib/session'
import { cache } from 'react'

/**
 * Everything the app's navigation chrome shows about the visitor and the
 * museum scope: the account entry and the museum switch. Two places render
 * it from the same data: the phone's bottom bar (tabs layout) and the
 * desktop top bar (`SiteHeader`, frontend layout). `cache` makes both share
 * one round of Local API reads per request. The museums the visitor works
 * on are not chrome: "Your museums" reads them (`readMyMuseums`).
 */
export const getSiteChrome = cache(async () => {
  // Local API session (cookie): decides the account entry.
  const { payload, user } = await getSession()
  // Museum mode: the switch shows the locked museum (or "All museums") and
  // lists every museum; the two reads run together.
  const [scope, museums] = await Promise.all([
    museumScope(),
    payload.find({
      collection: 'museums',
      limit: 200,
      depth: 0,
      sort: 'name',
      select: { name: true, location: true, palette: true },
    }),
  ])

  return {
    account: user ? toNavAccount(user) : null,
    currentMuseum: scope ? { id: scope.museumId, name: scope.name, palette: scope.palette } : null,
    museums: museums.docs.map((museum): MuseumOption => ({
      id: museum.id,
      name: museum.name,
      city: museum.location?.city,
      // Shade 6 of the museum's palette: its swatch in the museum switch.
      color: museumAccent(museum.palette),
    })),
  }
})
