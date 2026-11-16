import { BackButton } from '@/components/navigation/BackButton'
import {
  MUSEUM_FUNCTION_CURATOR,
  MUSEUM_FUNCTION_RANK,
  type MuseumRole,
} from '@/fields/MuseumFunction'
import { readMyMuseums } from '@/lib/my-museums'
import { NEUTRAL_INITIALS_COLORS } from '@/theme'
import { getT } from '@/i18n.server'
import { hasRank } from '@/access/museumRoles'
import { filterPopulated } from '@/lib/isPopulated'
import { MUSEUM_ROLE_ICON } from '@/lib/museum-role-meta'
import { pictureSrc } from '@/lib/picture'
import { requireUser } from '@/lib/session'
import type { MuseumThumbnail } from '@/payload-types'
import { museumAccent } from '@/lib/museum-color'
import { LinkButton } from '@/components/editing/LinkButton'
import { LinkAnchor } from '@/components/mantine/LinkAnchor'
import { lockedMuseumId } from '@/lib/museum-mode'
import {
  Avatar,
  Badge,
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
  ChevronRight,
  Download,
  FilePlus,
  Landmark,
  Map as MapIcon,
  MapPin,
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
 * curators, then verified creators; by name within a role, except that the
 * museum the app is locked to (museum mode: the visitor is in it) comes
 * first, marked "You are here". One column at every width; a search field
 * appears once the list is long (`MuseumSearch`, its query in the URL).
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
  const read = Promise.all([readMyMuseums(), lockedMuseumId()])
  const { t } = await getT('user-page')
  const { t: tc } = await getT('common')
  const roleLabel: Record<MuseumRole, string> = {
    director: tc('navbar.Director'),
    curator: tc('navbar.Curator'),
    verified: tc('navbar.Verified creator'),
  }

  const [myMuseums, activeMuseumId] = await read
  const museums = [...myMuseums]
    // The museum the app is locked to (museum mode: the visitor is in it)
    // first, then by role and name.
    .sort(
      (a, b) =>
        Number(b.museum.id === activeMuseumId) - Number(a.museum.id === activeMuseumId) ||
        MUSEUM_FUNCTION_RANK[b.role] - MUSEUM_FUNCTION_RANK[a.role] ||
        a.museum.name.localeCompare(b.museum.name, lng),
    )

  const rows = museums.map(({ museum, role }) => (
    <MuseumRow
      key={museum.id}
      museum={museum}
      role={role}
      roleLabel={roleLabel[role]}
      active={museum.id === activeMuseumId}
      lng={lng}
      t={t}
    />
  ))

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
        // One column at every width: two would zig-zag the role order
        // across columns, and the search covers a long list.
        <MuseumSearch
          rows={rows}
          keys={museums.map(({ museum }) => `${museum.name} ${museum.location?.city ?? ''}`)}
        />
      )}
    </Container>
  )
}

/** The `t` of the user-page namespace, handed to the row. */
type UserPageT = Awaited<ReturnType<typeof getT>>['t']

// The tools, one rule for every row: the role's main work (editing the
// map for staff, a new tour for a verified creator) is the one filled
// (`light` gray) button; the others follow as gray `subtle` ones. Neutral
// on every row, so a long list stays one system instead of a rainbow: the
// museum's color lives on its tile only. The fill, not an outline, marks
// the main one (an outline barely reads, 1.5:1 on the page). `sm` (36px)
// everywhere, a comfortable tap on a phone carried between rooms. The row
// wraps where the labels need it (longer languages, narrow phones).
const main = { variant: 'light', size: 'sm', color: 'gray' } as const
const other = { variant: 'subtle', size: 'sm', color: 'gray' } as const

/**
 * One museum of the list: its tile, its name and "role · city", and the tools
 * its role opens there. `active` marks the museum the app is locked to.
 */
function MuseumRow({
  museum,
  role,
  roleLabel,
  active,
  lng,
  t,
}: {
  museum: Awaited<ReturnType<typeof readMyMuseums>>[number]['museum']
  role: MuseumRole
  roleLabel: string
  active: boolean
  lng: string
  t: UserPageT
}) {
  const Icon = MUSEUM_ROLE_ICON[role]
  const [cover] = filterPopulated<MuseumThumbnail>(museum.thumbnails)
  const accent = museumAccent(museum.palette)
  const base = `/${lng}/museum/${museum.id}`
  const nameId = `museum-${museum.id}`
  // A director's museum still without a color shows its initials on a
  // stand-in hue: the row says where to give it its own.
  const needsColor = role === 'director' && !accent
  return (
    // Tile and name side by side; the tools on a line of their own, under
    // both on phones (the whole width for the buttons), under the name
    // from `md`.
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-(--mantine-spacing-md) gap-y-(--mantine-spacing-sm) border-b border-(--mantine-color-default-border) py-(--mantine-spacing-lg)">
      {/* The museum's tile, its identity at a glance and the one place its
          color lives: its photo, else its initials on its own color
          (shade 6, at least 4.5:1 with white by the palette's rule) or, `light`,
          on Mantine's per-name initials color among the theme's neutral
          hues (`NEUTRAL_INITIALS_COLORS`). The role sits on its corner as the
          profile avatar's status does, bordered so it holds on a photo.
          It repeats the name's link: out of the tab order and hidden from
          screen readers, one stop per museum. */}
      <Link href={base as Route} tabIndex={-1} aria-hidden className="self-start">
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
            allowedInitialsColors={NEUTRAL_INITIALS_COLORS}
            variant={accent ? 'filled' : 'light'}
            size={64}
            radius="lg"
            fz="lg"
          />
        </Indicator>
      </Link>
      <Stack gap={2} miw={0}>
        {/* The name opens the museum: a trailing chevron says so on a
            phone, where there is no hover. */}
        <Title order={2} size="h4" id={nameId}>
          <LinkAnchor
            href={base as Route}
            inherit
            c="inherit"
            className="inline-flex max-w-full items-center gap-1"
          >
            <span className="line-clamp-2">{museum.name}</span>
            <ChevronRight
              size={18}
              aria-hidden
              className="shrink-0 text-(--mantine-color-dimmed)"
            />
          </LinkAnchor>
        </Title>
        <Group gap={6} wrap="wrap">
          {active && (
            <Badge size="sm" variant="light" leftSection={<MapPin size={12} aria-hidden />}>
              {t('You are here')}
            </Badge>
          )}
          <Text size="sm" c="dimmed">
            {roleLabel}
            {museum.location?.city && ` · ${museum.location.city}`}
          </Text>
        </Group>
        {needsColor && (
          <LinkAnchor href={`${base}?tab=info` as Route} size="sm">
            {t('Give the museum its color')}
          </LinkAnchor>
        )}
      </Stack>
      {/* A group named by the museum, not a landmark: a long list would
          otherwise fill the screen reader's landmark menu. */}
      <Group
        gap="xs"
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
                download link, which says so in words for screen readers. */}
            <Button
              component="a"
              href={`/api/qr-sheet?kind=museum&id=${museum.id}&lng=${lng}`}
              download
              leftSection={<QrCode size={16} aria-hidden />}
              rightSection={<Download size={14} aria-hidden />}
              {...other}
            >
              {t('QR labels')}
              <span className="sr-only"> ({t('PDF download')})</span>
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
}
