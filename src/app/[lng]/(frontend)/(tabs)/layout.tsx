import { getSession } from '@/lib/session'
import { MuseumSwitch } from '@/components/mantine/MuseumSwitch'
import { museumScope } from '@/lib/museum-mode'
import { AppShellFooter, Group, Stack } from '@mantine/core'
import { NavBar, type MyMuseum } from './NavBar'

export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  // Local API session (cookie): decides the NavBar's account entry and the
  // "My museums" shortcut for directors, curators and verified creators.
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

  // Museum mode: the switch shows the locked museum (or "All museums") on
  // every tab, and opens the "Change museum" modal.
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

  return (
    <>
      <Group justify="flex-end" px={{ base: 'md', sm: 'xl' }} pt="sm">
        <MuseumSwitch
          current={scope ? { id: scope.museumId, name: scope.name } : null}
          museums={museums.docs.map((museum) => ({
            id: museum.id,
            name: museum.name,
            city: museum.location?.city,
          }))}
        />
      </Group>
      <Stack>{children}</Stack>
      <AppShellFooter component="nav">
        <NavBar
          account={
            user
              ? {
                  id: String(user.id),
                  name: user.name?.fullName || user.username,
                  avatarUrl: typeof user.avatar === 'object' ? user.avatar?.url : null,
                }
              : null
          }
          myMuseums={myMuseums}
        />
      </AppShellFooter>
    </>
  )
}
