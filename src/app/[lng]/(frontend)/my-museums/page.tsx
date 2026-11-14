import { BackButton } from '@/components/navigation/BackButton'
import { LinkButton } from '@/components/editing/LinkButton'
import {
  MUSEUM_FUNCTION_CURATOR,
  MUSEUM_FUNCTION_RANK,
  type MuseumRole,
} from '@/fields/MuseumFunction'
import { getT } from '@/i18n.server'
import { hasRank } from '@/access/museumRoles'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import { MUSEUM_ROLE_ICON } from '@/lib/museum-role-meta'
import { PICTURE_SELECT, pictureSrc } from '@/lib/picture'
import { getSession, requireUser } from '@/lib/session'
import type { MuseumThumbnail } from '@/payload-types'
import { LinkAnchor } from '@/components/mantine/LinkAnchor'
import { Avatar, Button, Container, Group, Stack, Text, Title } from '@mantine/core'
import { FilePlus, Landmark, Map as MapIcon, QrCode, Route as RouteIcon, Users } from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'

/**
 * "Your museums": the museums where the signed-in visitor holds a role, each
 * with the work that role opens there. It replaced the "My museums" menu of
 * the navigation bars: the bars stay the same for visitors and staff, and
 * this list (linked from the visitor's own profile) has room for the actions.
 *
 * A private page, not a profile tab: the profile is the person's public face,
 * this is where they go to work. Directors first, then curators, then
 * verified creators; by name within a role.
 *
 * The actions only link to the existing tools, which keep their own guards
 * (`can()`, the membership access rules): this page grants nothing.
 */

export async function generateMetadata(props: PageProps<'/[lng]/my-museums'>): Promise<Metadata> {
  await props.params
  const { t } = await getT('user-page')
  return { title: t('Your museums') }
}

export default async function MyMuseumsPage({ params }: PageProps<'/[lng]/my-museums'>) {
  const { lng } = await params
  const user = await requireUser(lng, `/${lng}/my-museums`)
  const { payload } = await getSession()
  const memberships = payload.find({
    collection: 'user-museum-memberships',
    where: { user: { equals: user.id } },
    depth: 2,
    pagination: false,
    populate: {
      museums: { name: true, location: true, thumbnails: true },
      museumThumbnails: PICTURE_SELECT,
    },
  })
  const { t } = await getT('user-page')
  const { t: te } = await getT('editing')
  const { t: tc } = await getT('common')
  const roleLabel: Record<MuseumRole, string> = {
    director: tc('navbar.Director'),
    curator: tc('navbar.Curator'),
    verified: tc('navbar.Verified creator'),
  }

  // Only roles the app knows how to name (a legacy or missing role is left out).
  const museums = (await memberships).docs
    .flatMap((membership) =>
      isPopulated(membership.museum) && Object.hasOwn(MUSEUM_FUNCTION_RANK, membership.role ?? '')
        ? [{ museum: membership.museum, role: membership.role as MuseumRole }]
        : [],
    )
    .sort(
      (a, b) =>
        MUSEUM_FUNCTION_RANK[b.role] - MUSEUM_FUNCTION_RANK[a.role] ||
        a.museum.name.localeCompare(b.museum.name, lng),
    )

  return (
    <Container component="main" size="md" py="md" w="100%">
      {/* Up a level: back where the visitor came from, else their profile. */}
      <BackButton href={`/${lng}/user/${user.id}` as Route} />
      <Stack gap="xs" mt="sm" mb="lg">
        <Title order={1} size="h2">
          {t('Your museums')}
        </Title>
        <Text c="dimmed">
          {t('The museums where you have a role, and what you can do in each.')}
        </Text>
      </Stack>
      {museums.length === 0 ? (
        // Reached by URL without any role: say how a role is given, offer nothing to click.
        <Stack
          gap={4}
          align="center"
          ta="center"
          className="rounded-(--mantine-radius-lg) border-2 border-dashed border-(--mantine-color-default-border) px-(--mantine-spacing-md) py-(--mantine-spacing-xl)"
        >
          <Landmark size={28} aria-hidden className="text-(--mantine-color-dimmed)" />
          <Text fw={600}>{t('You have no role in a museum yet')}</Text>
          <Text size="sm" c="dimmed" maw="45ch">
            {t('A museum’s director or curators add you to its staff from the museum’s page.')}
          </Text>
        </Stack>
      ) : (
        // A plain list, one museum per row: identity on the left, the work
        // it opens under the name. Rows, not cards: the actions are the content.
        <Stack component="ul" gap={0} className="m-0 list-none p-0">
          {museums.map(({ museum, role }) => {
            const Icon = MUSEUM_ROLE_ICON[role]
            const [cover] = filterPopulated<MuseumThumbnail>(museum.thumbnails)
            const href = `/${lng}/museum/${museum.id}` as Route
            // Curators and directors run the museum (map, staff, QR labels);
            // a verified creator adds their own work to it.
            const staff = hasRank(role, MUSEUM_FUNCTION_CURATOR)
            return (
              <Group
                key={museum.id}
                component="li"
                wrap="nowrap"
                align="flex-start"
                gap="md"
                py="md"
                className="border-b border-(--mantine-color-default-border) last:border-b-0"
              >
                {/* The picture repeats the name's link: hidden from the
                    keyboard and screen readers, one stop per museum. */}
                <Link href={href} tabIndex={-1} aria-hidden className="shrink-0">
                  <Avatar src={pictureSrc(cover, 'card')} size={64} radius="md">
                    <Landmark size={24} />
                  </Avatar>
                </Link>
                <Stack gap="xs" miw={0} className="grow">
                  <Stack gap={2}>
                    <Title order={2} size="h5">
                      <LinkAnchor href={href} inherit c="inherit">
                        {museum.name}
                      </LinkAnchor>
                    </Title>
                    <Group gap="xs" c="dimmed" fz="sm" wrap="wrap">
                      <Group gap={4} wrap="nowrap">
                        <Icon size={14} aria-hidden />
                        {roleLabel[role]}
                      </Group>
                      {museum.location?.city && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{museum.location.city}</span>
                        </>
                      )}
                    </Group>
                  </Stack>
                  <Group gap="xs">
                    {staff ? (
                      <>
                        <LinkButton
                          href={`/${lng}/museum/${museum.id}/edit/mapeditor` as Route}
                          variant="light"
                          size="xs"
                          leftSection={<MapIcon size={14} aria-hidden />}
                        >
                          {te('Add objects to the map')}
                        </LinkButton>
                        <LinkButton
                          href={`/${lng}/museum/${museum.id}/members` as Route}
                          variant="subtle"
                          size="xs"
                          leftSection={<Users size={14} aria-hidden />}
                        >
                          {te('Staff')}
                        </LinkButton>
                        {/* A sheet of QR labels for the museum's objects (`/api/qr-sheet`). */}
                        <Button
                          component="a"
                          href={`/api/qr-sheet?kind=museum&id=${museum.id}&lng=${lng}`}
                          download
                          variant="subtle"
                          size="xs"
                          leftSection={<QrCode size={14} aria-hidden />}
                        >
                          {tc('Print the QR codes of all objects')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <LinkButton
                          href={`/${lng}/tour/new?museum=${museum.id}` as Route}
                          variant="light"
                          size="xs"
                          leftSection={<RouteIcon size={14} aria-hidden />}
                        >
                          {te('Add tour')}
                        </LinkButton>
                        <LinkButton
                          href={`/${lng}/content/new` as Route}
                          variant="subtle"
                          size="xs"
                          leftSection={<FilePlus size={14} aria-hidden />}
                        >
                          {te('Add content')}
                        </LinkButton>
                      </>
                    )}
                  </Group>
                </Stack>
              </Group>
            )
          })}
        </Stack>
      )}
    </Container>
  )
}
