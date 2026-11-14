import { BackButton } from '@/components/navigation/BackButton'
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
import { museumAccent } from '@/lib/museum-color'
import { LinkButton } from '@/components/editing/LinkButton'
import { LinkAnchor } from '@/components/mantine/LinkAnchor'
import {
  Avatar,
  Button,
  Container,
  Group,
  Indicator,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import {
  Download,
  FilePlus,
  Landmark,
  Map as MapIcon,
  QrCode,
  Route as RouteIcon,
  Users,
} from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'

/**
 * "Your museums": the museums where the signed-in visitor holds a role, each
 * with the work that role opens there. It replaced the "My museums" menu of
 * the navigation bars: the bars stay the same for visitors and staff, and
 * this list (linked from the visitor's own profile) has room for the actions.
 *
 * A private page, not a profile tab: the profile is the person's public face,
 * this is where they go to work. One row per museum, in its own color;
 * directors first, then curators, then verified creators; by name within a
 * role.
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
      museums: { name: true, location: true, thumbnails: true, palette: true },
      museumThumbnails: PICTURE_SELECT,
    },
  })
  const { t } = await getT('user-page')
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
      <Stack gap="xs" mt="sm" mb="xl">
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
        // A list, not a wall of covers: a curator may hold several museums,
        // and every row keeps the same anatomy (picture, name, role and city,
        // tools) in the same place, so the eye runs down one column and many
        // museums still fit on a screen. The museum's own color marks its
        // tile and its main tool; the role's other tools stay quiet, and
        // the museum's name is each row's primary text.
        <Stack component="ul" gap={0} className="m-0 list-none p-0">
          {museums.map(({ museum, role }) => {
            const Icon = MUSEUM_ROLE_ICON[role]
            const [cover] = filterPopulated<MuseumThumbnail>(museum.thumbnails)
            const accent = museumAccent(museum.palette)
            const base = `/${lng}/museum/${museum.id}`
            // One rule for the tools: the role's main work (the map for
            // staff, a new tour for a verified creator) is the one `light`
            // button, in the museum's color; the other tools follow it as
            // quiet gray `subtle` buttons, so the row reads in that order.
            const main = {
              variant: 'light',
              size: 'compact-sm',
              color: accent ?? undefined,
            } as const
            const other = { variant: 'subtle', size: 'compact-sm', color: 'gray' } as const
            return (
              <Group
                key={museum.id}
                component="li"
                wrap="nowrap"
                align="flex-start"
                gap="md"
                py="lg"
                className="border-b border-(--mantine-color-default-border) last:border-b-0"
              >
                {/* The museum's tile, its identity at a glance: its photo,
                    else its initials on a color of its own (the museum's
                    color, or the deterministic per-name hue the profile
                    avatars use), so no two museums read alike. The role sits
                    on its corner as the profile avatar's status does. It
                    repeats the name's link: out of the tab order and hidden
                    from screen readers, one stop per museum. */}
                <Link href={base as Route} tabIndex={-1} aria-hidden className="shrink-0">
                  <Indicator
                    position="bottom-end"
                    offset={6}
                    color="transparent"
                    label={
                      <ThemeIcon size={24} radius="xl" variant="default">
                        <Icon size={14} />
                      </ThemeIcon>
                    }
                  >
                    <Avatar
                      src={pictureSrc(cover, 'card')}
                      name={museum.name}
                      color={accent ?? 'initials'}
                      variant="filled"
                      size={72}
                      radius="lg"
                      fz="xl"
                    />
                  </Indicator>
                </Link>
                <Stack gap="sm" miw={0} className="grow">
                  <Stack gap={2}>
                    <Title order={2} size="h4" lineClamp={2}>
                      <LinkAnchor href={base as Route} inherit c="inherit">
                        {museum.name}
                      </LinkAnchor>
                    </Title>
                    <Text size="sm" c="dimmed">
                      {roleLabel[role]}
                      {museum.location?.city && ` · ${museum.location.city}`}
                    </Text>
                  </Stack>
                  {/* Curators and directors run the museum; a verified
                      creator adds their own work to it. */}
                  <Group gap={4} component="nav" aria-label={museum.name}>
                    {hasRank(role, MUSEUM_FUNCTION_CURATOR) ? (
                      <>
                        <LinkButton
                          href={`${base}/edit/mapeditor` as Route}
                          leftSection={<MapIcon size={14} aria-hidden />}
                          {...main}
                        >
                          {t('Map')}
                        </LinkButton>
                        <LinkButton
                          href={`${base}/members` as Route}
                          leftSection={<Users size={14} aria-hidden />}
                          {...other}
                        >
                          {t('Staff')}
                        </LinkButton>
                        {/* The QR labels PDF (`/api/qr-sheet`): a file, so a
                            plain download link with the download icon. */}
                        <Button
                          component="a"
                          href={`/api/qr-sheet?kind=museum&id=${museum.id}&lng=${lng}`}
                          download
                          leftSection={<QrCode size={14} aria-hidden />}
                          rightSection={<Download size={12} aria-hidden />}
                          {...other}
                        >
                          {t('QR labels')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <LinkButton
                          href={`/${lng}/tour/new?museum=${museum.id}` as Route}
                          leftSection={<RouteIcon size={14} aria-hidden />}
                          {...main}
                        >
                          {t('New tour')}
                        </LinkButton>
                        <LinkButton
                          href={`/${lng}/content/new` as Route}
                          leftSection={<FilePlus size={14} aria-hidden />}
                          {...other}
                        >
                          {t('New content')}
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
