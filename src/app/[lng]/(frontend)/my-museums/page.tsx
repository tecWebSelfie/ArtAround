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
import { MuseumSearch } from './MuseumSearch'

/**
 * "Your museums": the museums where the signed-in visitor holds a role, each
 * with the work that role opens there. It replaced the "My museums" menu of
 * the navigation bars: the bars stay the same for visitors and staff, and
 * this list (linked from the visitor's own profile) has room for the actions.
 *
 * A private page, not a profile tab: the profile is the person's public face,
 * this is where they go to work. One row per museum; directors first, then
 * curators, then verified creators; by name within a role. A search field
 * appears once the list is long (`MuseumSearch`), and from `md` a long list
 * takes two columns.
 *
 * The actions only link to the existing tools, which keep their own guards
 * (`can()`, the membership access rules): this page grants nothing.
 */

/**
 * The tile's color for a museum without one of its own: a stable pick by
 * name among hues that mean nothing else in the app (not Navigator green,
 * content teal, tour grape, paid orange, destructive red, navigation and
 * accessibility blue), drawn `light` so its initials keep their contrast.
 */
const FALLBACK_HUES = ['indigo', 'violet', 'pink', 'gray'] as const
const fallbackHue = (name: string) =>
  FALLBACK_HUES[
    [...name].reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0) % FALLBACK_HUES.length
  ]

/** From this many museums the list takes two columns from `md`. */
const TWO_COLUMNS_FROM = 4

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

  // The tools, one rule for every row: the role's main work (editing the
  // map for staff, a new tour for a verified creator) is the one outlined
  // `default` button; the others follow as gray `subtle` ones. Neutral on
  // every row, so a long list stays one system instead of a rainbow: the
  // museum's color lives on its tile only. `sm` (36px) everywhere, a
  // comfortable tap on a phone carried between rooms.
  const main = { variant: 'default', size: 'sm' } as const
  // The quiet ones carry less side padding: no fill to frame, and the three
  // tools then fit one line on a 375px phone.
  const other = { variant: 'subtle', size: 'sm', color: 'gray', px: 'xs' } as const

  const rows = museums.map(({ museum, role }) => {
    const Icon = MUSEUM_ROLE_ICON[role]
    const [cover] = filterPopulated<MuseumThumbnail>(museum.thumbnails)
    const accent = museumAccent(museum.palette)
    const base = `/${lng}/museum/${museum.id}`
    const nameId = `museum-${museum.id}`
    return (
      // Tile and name side by side; the tools on a line of their own, under
      // both on phones (the whole width for the buttons), under the name
      // from `md`.
      <li
        key={museum.id}
        className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-(--mantine-spacing-md) gap-y-(--mantine-spacing-sm) border-b border-(--mantine-color-default-border) py-(--mantine-spacing-lg)"
      >
        {/* The museum's tile, its identity at a glance and the one place its
            color lives: its photo, else its initials on its own color
            (shade 6, at least 4.5:1 with white by the palette's rule) or on
            a neutral fallback hue. The role sits on its corner as the
            profile avatar's status does, bordered so it holds on a photo.
            It repeats the name's link: out of the tab order and hidden from
            screen readers, one stop per museum. */}
        <Link
          href={base as Route}
          tabIndex={-1}
          aria-hidden
          className="self-start from-md:row-span-2"
        >
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
              color={accent ?? fallbackHue(museum.name)}
              variant={accent ? 'filled' : 'light'}
              size={64}
              radius="lg"
              fz="lg"
            />
          </Indicator>
        </Link>
        <Stack gap={2} miw={0}>
          <Title order={2} size="h4" lineClamp={2} id={nameId}>
            <LinkAnchor href={base as Route} inherit c="inherit">
              {museum.name}
            </LinkAnchor>
          </Title>
          <Text size="sm" c="dimmed">
            {roleLabel[role]}
            {museum.location?.city && ` · ${museum.location.city}`}
          </Text>
        </Stack>
        {/* A group named by the museum, not a landmark: a long list would
            otherwise fill the screen reader's landmark menu. A 6px gap: the
            quiet buttons' own padding already keeps the taps apart, and the
            three tools then fit one line at 375px (longer translations wrap). */}
        <Group
          gap={6}
          role="group"
          aria-labelledby={nameId}
          className="col-span-2 from-md:col-span-1 from-md:col-start-2"
        >
          {hasRank(role, MUSEUM_FUNCTION_CURATOR) ? (
            <>
              <LinkButton
                href={`${base}/edit/mapeditor` as Route}
                leftSection={<MapIcon size={16} aria-hidden />}
                {...main}
              >
                {t('Edit map')}
              </LinkButton>
              <LinkButton
                href={`${base}/members` as Route}
                leftSection={<Users size={16} aria-hidden />}
                {...other}
              >
                {t('Staff')}
              </LinkButton>
              {/* The QR labels PDF (`/api/qr-sheet`): a file, so a plain
                  download link. Seen as "QR" between the QR and download
                  icons, so the three tools fit one line on a phone; heard
                  in full ("QR labels (PDF download)"), which still holds
                  the visible word (WCAG 2.5.3). */}
              <Button
                component="a"
                href={`/api/qr-sheet?kind=museum&id=${museum.id}&lng=${lng}`}
                download
                aria-label={t('QR labels (PDF download)')}
                leftSection={<QrCode size={16} aria-hidden />}
                rightSection={<Download size={14} aria-hidden />}
                {...other}
              >
                QR
              </Button>
            </>
          ) : (
            <>
              <LinkButton
                href={`/${lng}/tour/new?museum=${museum.id}` as Route}
                leftSection={<RouteIcon size={16} aria-hidden />}
                {...main}
              >
                {t('New tour')}
              </LinkButton>
              <LinkButton
                href={`/${lng}/content/new?museum=${museum.id}` as Route}
                leftSection={<FilePlus size={16} aria-hidden />}
                {...other}
              >
                {t('New content')}
              </LinkButton>
            </>
          )}
        </Group>
      </li>
    )
  })

  return (
    <Container component="main" size="md" py="md" w="100%">
      {/* Up a level: back where the visitor came from, else their profile. */}
      <BackButton href={`/${lng}/user/${user.id}` as Route} />
      <Stack gap="xs" mt="sm" mb="lg">
        <Group gap="sm" align="baseline">
          <Title order={1} size="h2">
            {t('Your museums')}
          </Title>
          {museums.length > 0 && (
            // How many, at a glance; in words for screen readers.
            <Text c="dimmed" fz="lg" className="tabular-nums">
              <span aria-hidden>{museums.length}</span>
              <span className="sr-only">{t('{{count}} museums', { count: museums.length })}</span>
            </Text>
          )}
        </Group>
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
        // and every row keeps the same anatomy (tile, name, role and city,
        // tools) in the same place, so the eye runs down one column.
        <MuseumSearch
          rows={rows}
          keys={museums.map(({ museum }) => `${museum.name} ${museum.location?.city ?? ''}`)}
          label={t('Find a museum')}
          noMatch={t('No museum matches')}
          className={`m-0 grid list-none p-0 ${museums.length >= TWO_COLUMNS_FROM ? 'from-md:grid-cols-2 from-md:gap-x-(--mantine-spacing-xl)' : ''}`}
        />
      )}
    </Container>
  )
}
