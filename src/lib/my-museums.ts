import 'server-only'

import { isMuseumRole } from '@/fields/MuseumFunction'
import { isPopulated } from '@/lib/isPopulated'
import { PICTURE_SELECT } from '@/lib/picture'
import { getSession } from '@/lib/session'
import { cache } from 'react'

/**
 * The museums where the signed-in visitor holds a role, with that role:
 * what "Your museums" lists and the rights form's choice of holders draw
 * from. Read once per request (`cache`); empty when signed out.
 *
 * Only what the page shows is read: the membership's museum and role, the
 * museum's name, city, color and cover. A membership with a missing or
 * legacy role, or a museum the reader can't see, is left out.
 */
export const readMyMuseums = cache(async () => {
  const { payload, user } = await getSession()
  if (!user) return []
  const { docs } = await payload.find({
    collection: 'user-museum-memberships',
    where: { user: { equals: user.id } },
    select: { museum: true, role: true },
    depth: 2,
    pagination: false,
    populate: {
      museums: { name: true, location: true, thumbnails: true, palette: true },
      museumThumbnails: PICTURE_SELECT,
    },
  })
  return docs.flatMap(({ museum, role }) =>
    isPopulated(museum) && isMuseumRole(role) ? [{ museum, role }] : [],
  )
})
