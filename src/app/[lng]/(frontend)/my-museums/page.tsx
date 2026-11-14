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
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'
import { Badge, Container, Group, Stack, Text, Title } from '@mantine/core'
import {
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
import { MuseumToolLink } from './MuseumToolLink'

/**
 * "Your museums": the museums where the signed-in visitor holds a role, each
 * with the work that role opens there. It replaced the "My museums" menu of
 * the navigation bars: the bars stay the same for visitors and staff, and
 * this list (linked from the visitor's own profile) has room for the actions.
 *
 * A private page, not a profile tab: the profile is the person's public face,
 * this is where they go to work. Each museum wears its own photo and color,
 * so the list reads as places, and every tool is drawn the same way. Directors first, then curators, then
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
        // One block per museum, each in its own colors: the museum's photo
        // (its cover, outlined in the museum's color as on the rail cards)
        // beside the tools its role opens, all drawn the same way
        // (`MuseumToolLink`). Side by side from `md`, stacked on phones.
        <Stack component="ul" gap={48} className="m-0 list-none p-0">
          {museums.map(({ museum, role }) => {
            const Icon = MUSEUM_ROLE_ICON[role]
            const [cover] = filterPopulated<MuseumThumbnail>(museum.thumbnails)
            const accent = museumAccent(museum.palette)
            const base = `/${lng}/museum/${museum.id}`
            return (
              <li
                key={museum.id}
                className="grid items-start gap-(--mantine-spacing-lg) from-md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
              >
                {/* The cover is the way into the museum's page. */}
                <Link
                  href={base as Route}
                  className="group block rounded-xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--mantine-primary-color-filled)"
                >
                  <div
                    className="aspect-video overflow-hidden rounded-xl border-2 border-solid border-(--mantine-color-default-border) bg-cover bg-center from-md:aspect-4/3"
                    // The picture and the museum's color are data: inline
                    // (the URL quoted, as in `CoverCard`).
                    style={{
                      backgroundImage: `url(${JSON.stringify(pictureSrc(cover, 'cover') ?? PLACEHOLDER_IMAGE)})`,
                      ...(accent && { borderColor: accent }),
                    }}
                  >
                    <Stack
                      justify="space-between"
                      align="flex-start"
                      className="h-full bg-linear-to-t from-black/80 via-black/10 to-black/25 transition-colors duration-300 group-hover:from-black/70 motion-reduce:transition-none"
                      p="md"
                    >
                      <Badge
                        variant="white"
                        color="dark"
                        size="md"
                        leftSection={<Icon size={14} aria-hidden />}
                      >
                        {roleLabel[role]}
                      </Badge>
                      <Stack gap={2}>
                        <Title order={2} size="h3" c="white" lineClamp={2}>
                          {museum.name}
                        </Title>
                        {museum.location?.city && (
                          <Group gap={4} c="gray.3" fz="sm" wrap="nowrap">
                            <MapPin size={14} aria-hidden />
                            {museum.location.city}
                          </Group>
                        )}
                      </Stack>
                    </Stack>
                  </div>
                </Link>
                {/* Curators and directors run the museum; a verified creator
                    adds their own work to it. */}
                <Stack gap={4} component="nav" aria-label={museum.name}>
                  {hasRank(role, MUSEUM_FUNCTION_CURATOR) ? (
                    <>
                      <MuseumToolLink
                        href={`${base}/edit/mapeditor`}
                        label={t('Museum map')}
                        description={t('Place the works and the services on the map')}
                        icon={<MapIcon size={20} aria-hidden />}
                        color={accent}
                      />
                      <MuseumToolLink
                        href={`${base}/members`}
                        label={t('Staff')}
                        description={t('The museum’s curators and verified creators')}
                        icon={<Users size={20} aria-hidden />}
                        color={accent}
                      />
                      <MuseumToolLink
                        href={`/api/qr-sheet?kind=museum&id=${museum.id}&lng=${lng}`}
                        download
                        label={t('QR labels')}
                        description={t('A PDF with one QR code for each work on the map')}
                        icon={<QrCode size={20} aria-hidden />}
                        color={accent}
                      />
                    </>
                  ) : (
                    <>
                      <MuseumToolLink
                        href={`/${lng}/tour/new?museum=${museum.id}`}
                        label={t('New tour')}
                        description={t('A route through the museum’s works')}
                        icon={<RouteIcon size={20} aria-hidden />}
                        color={accent}
                      />
                      <MuseumToolLink
                        href={`/${lng}/content/new`}
                        label={t('New content')}
                        description={t('Tell visitors the story of a work')}
                        icon={<FilePlus size={20} aria-hidden />}
                        color={accent}
                      />
                    </>
                  )}
                </Stack>
              </li>
            )
          })}
        </Stack>
      )}
    </Container>
  )
}
