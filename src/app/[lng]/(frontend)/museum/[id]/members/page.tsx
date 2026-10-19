import { MembersManager, type StaffMember } from '@/components/editing/MembersManager'
import {
  MUSEUM_FUNCTION_CURATOR,
  MUSEUM_FUNCTION_DIRECTOR,
  MUSEUM_FUNCTION_VERIFIED,
  type MuseumRole,
} from '@/fields/MuseumFunction'
import { getSession, requireUser } from '@/lib/session'
import { Container } from '@mantine/core'
import type { Route } from 'next'
import { redirect } from 'next/navigation'

/**
 * Staff management for a museum, open to its curators and director. What
 * each may grant mirrors `canManage` (the membership access rule), which
 * stays the enforcement on every write.
 */
const GRANTABLE: Partial<Record<MuseumRole, MuseumRole[]>> = {
  [MUSEUM_FUNCTION_DIRECTOR]: [MUSEUM_FUNCTION_CURATOR, MUSEUM_FUNCTION_VERIFIED],
  [MUSEUM_FUNCTION_CURATOR]: [MUSEUM_FUNCTION_VERIFIED],
}

export default async function MembersPage({ params }: PageProps<'/[lng]/museum/[id]/members'>) {
  const { lng, id } = await params
  const viewer = await requireUser(lng, `/${lng}/museum/${id}/members`)
  const { payload } = await getSession()
  const { docs } = await payload.find({
    collection: 'user-museum-memberships',
    where: { museum: { equals: id } },
    depth: 1,
    pagination: false,
    populate: { users: { name: true, username: true } },
  })

  const own = docs.find(
    (membership) =>
      (typeof membership.user === 'object' ? membership.user.id : membership.user) === viewer.id,
  )
  const grantable = viewer.isSuperAdmin
    ? [MUSEUM_FUNCTION_DIRECTOR, MUSEUM_FUNCTION_CURATOR, MUSEUM_FUNCTION_VERIFIED]
    : (GRANTABLE[own?.role as MuseumRole] ?? [])
  if (!grantable.length) redirect(`/${lng}/museum/${id}` as Route)

  const members: StaffMember[] = docs.flatMap((membership) =>
    typeof membership.user === 'object'
      ? [
          {
            membershipId: membership.id,
            userId: membership.user.id,
            name: membership.user.name.fullName,
            username: membership.user.username,
            role: membership.role,
          },
        ]
      : [],
  )

  return (
    <Container size="md" py="md">
      <MembersManager
        museumId={id}
        members={members}
        grantable={grantable}
        viewerId={String(viewer.id)}
      />
    </Container>
  )
}
