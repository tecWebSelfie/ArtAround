import { BackButton } from '@/components/navigation/BackButton'
import { LinkButton } from '@/components/editing/LinkButton'
import { ArtaroundTabs } from '@/components/mantine/ArtaroundTabs'
import { DetailCover } from '@/components/mantine/DetailCover'
import { ObjectsCarousel } from '@/components/mantine/ObjectsCarousel'
import { ToursCarousel } from '@/components/mantine/ToursCarousel'
import { scopedSearchHref } from '@/lib/search-url'
import type { ReactNode } from 'react'
import { getT } from '@/i18n.server'
import { filterPopulated } from '@/lib/isPopulated'
import { collectMuseumMarkers, mapNodes } from '@/lib/pascal/museum-plugin/markers-in-map'
import { SERVICE_META } from '@/lib/pascal/museum-plugin/markers'
import { SERVICE_TYPES } from '@/lib/pascal/museum-plugin/ServiceNode'
import { Museum, type MuseumThumbnail, type Tour } from '@/payload-types'
import { ACCESSIBILITY_COLOR } from '@/theme'
import {
  Avatar,
  AvatarGroup,
  Grid,
  GridCol,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  TooltipGroup,
} from '@mantine/core'
import { Accessibility, Amphora, BadgeInfo, Compass, MapPin } from 'lucide-react'
import type { Route } from 'next'
import { MuseumEditActions, MuseumInfo } from './MuseumPageParts'

/**
 * What the visitor may do on this museum, computed server-side with `can()`
 * (Payload's own access rules) by `page.tsx`. Absent = read-only (stories).
 */
export type MuseumEditing = {
  lng: string
  /** Director: metadata (field access on e.g. `name`). */
  canEditDetails: boolean
  /** Curator or director: the map (objects placement) and the staff page. */
  canManageMap: boolean
  /** Any signed-in visitor: tours and contents are user-generated. */
  isSignedIn: boolean
  /** Source-locale (`en`) values for the metadata form. */
  source: Pick<Museum, 'id' | 'name' | 'shortDescription' | 'email' | 'location' | 'brandColor'> & {
    descriptionHTML: string
  }
}

export default async function MuseumPage({
  museum,
  editing,
  navigationHref,
  translationNotice,
  openOnInfo = false,
}: {
  museum: Museum
  editing?: MuseumEditing
  /** The "translating" line, while texts are on their English fallback. */
  translationNotice?: ReactNode
  /** Free navigation of this museum, when its map is saved (`museumNavigationEntry`). */
  navigationHref?: Route | null
  /** Open on the Info tab (`?tab=info`) instead of the contents. */
  openOnInfo?: boolean
}) {
  const { t, lng } = await getT('museum-page')

  const tours = filterPopulated<Tour>(museum.tours?.docs)
  return (
    // One stacked column on phones. From `md` the page is a centered
    // container (1140px of content inside `xl` padding) and the hero splits
    // into cover | identity, so neither the cover (height-capped by
    // DetailCover) nor the tour deck (beside the objects, below) outgrows the
    // viewport.
    <Stack
      component="main"
      mx={{ base: 'md', sm: 'xl', md: 'auto' }}
      px={{ md: 'xl' }}
      maw={{ md: 1204 }}
      mt="sm"
      pb="xl"
    >
      {/* Up a level: back where the visitor came from, else the navigator. */}
      <BackButton withLanguage href={`/${lng}/navigator` as Route} />
      {/* Hero. Mantine's Grid lays out with `gap`, so below md (both columns
          full width, `md` gap) it stacks exactly like the page's Stack. */}
      <Grid gap={{ base: 'md', md: 'xl' }} align="flex-start" pb={{ md: 'md' }}>
        {/* The museum's photos: the first as cover, all of them in the
            lightbox. 5/12 beside the identity on desktop, so the tabs and the
            tour deck still reach the first viewport. */}
        <GridCol span={{ base: 12, md: 5 }}>
          <DetailCover
            pictures={filterPopulated<MuseumThumbnail>(museum.thumbnails)}
            title={museum.name}
          />
        </GridCol>
        {/* Identity and actions: the right pane on desktop. */}
        <GridCol span={{ base: 12, md: 7 }}>
          <Stack>
            <Stack gap={4}>
              <Title order={1} size="h2">
                {museum.name}
              </Title>
              {museum.location?.city && (
                <Group gap={4} c="dimmed" fz="sm">
                  <MapPin size={14} aria-hidden />
                  {museum.location.city}
                </Group>
              )}
            </Stack>
            <MuseumBadges museum={museum} accessibleLabel={t('Accessible')} />
            {navigationHref && (
              // Primary color (museum blue by default) + compass: moving inside the museum (DESIGN.md →
              // Buttons). The tour gradient is kept for what starts a tour.
              <LinkButton
                href={navigationHref}
                color="museum.8"
                autoContrast
                leftSection={<Compass size={18} aria-hidden />}
                w={{ base: '100%', sm: 'auto' }}
              >
                {t('Explore the map')}
              </LinkButton>
            )}
            {editing && <MuseumEditActions museumId={museum.id} editing={editing} />}
            <Text>{museum.shortDescription}</Text>
            {translationNotice}
          </Stack>
        </GridCol>
      </Grid>
      <ArtaroundTabs
        defaultValue={openOnInfo ? t('info') : undefined}
        tabs={[
          {
            value: t('contents'),
            icon: <Amphora size={16} />,
            panel: (
              // From md the tour deck keeps a phone-like width beside the
              // objects row: at full container width it would grow ~600px tall.
              <Grid gap={{ base: 'md', md: 'xl' }} align="flex-start">
                <GridCol span={{ base: 12, md: 5 }}>
                  {/* `tours` is the join over `tours.museum`. */}
                  <ToursCarousel
                    tours={tours}
                    seeAllHref={scopedSearchHref(lng, 'tours', 'at', museum.id) as Route}
                  />
                </GridCol>
                <GridCol span={{ base: 12, md: 7 }}>
                  <ObjectsCarousel
                    objects={museum.objects}
                    seeAllHref={scopedSearchHref(lng, 'objects', 'at', museum.id) as Route}
                  />
                </GridCol>
              </Grid>
            ),
          },
          {
            value: t('info'),
            icon: <BadgeInfo size={16} />,
            panel: <MuseumInfo museum={museum} editing={editing} />,
          },
        ]}
      />
    </Stack>
  )
}

export async function MuseumBadges(props: { museum: Museum; accessibleLabel: string }) {
  const { museum, accessibleLabel } = props
  // Services live in the saved map scene graph (Pascal `museum:service` nodes),
  // not in a Payload field, so the page derives its badges from the map JSON.
  const { services } = collectMuseumMarkers(mapNodes(museum.map))
  const available = SERVICE_TYPES.filter((type) => services.some((node) => node.service === type))

  return (
    <Group justify="space-between">
      {/*services badges*/}
      <TooltipGroup>
        <AvatarGroup>
          {available.map((type) => {
            const { Icon, color, label } = SERVICE_META[type]
            return (
              <Tooltip key={type} label={label} withArrow>
                <Avatar color={color} radius="xl" role="img" aria-label={label}>
                  <Icon size={16} aria-hidden />
                </Avatar>
              </Tooltip>
            )
          })}
        </AvatarGroup>
        {/* Shown only when the museum declares itself accessible: the badge is
            a claim visitors with access needs rely on, never decoration. */}
        {museum.accessibility?.isAccessible && (
          <Tooltip label={accessibleLabel} withArrow>
            <ThemeIcon
              radius="xl"
              size="lg"
              variant="filled"
              color={ACCESSIBILITY_COLOR}
              autoContrast
              role="img"
              aria-label={accessibleLabel}
            >
              <Accessibility size={16} aria-hidden />
            </ThemeIcon>
          </Tooltip>
        )}
      </TooltipGroup>
    </Group>
  )
}
