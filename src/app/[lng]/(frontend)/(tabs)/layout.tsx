import { getSession } from '@/lib/session'
import { AppShellFooter, Stack } from '@mantine/core'
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

  return (
    <>
      <Stack>{children}</Stack>
      <AppShellFooter component="nav">
        <NavBar account={user ? { id: String(user.id) } : null} myMuseums={myMuseums} />
      </AppShellFooter>
    </>
  )
}
