import { EditableSection } from '@/components/editing/EditableSection'
import { MuseumMetadataForm } from '@/components/editing/forms/MuseumMetadataForm'
import { LinkButton } from '@/components/editing/LinkButton'
import { ArtaroundDataList } from '@/components/mantine/ArtaroundDataList'
import { ArtaroundTabs } from '@/components/mantine/ArtaroundTabs'
import { DetailCover } from '@/components/mantine/DetailCover'
import { ObjectsCarousel } from '@/components/mantine/ObjectsCarousel'
import { ToursCarousel } from '@/components/mantine/ToursCarousel'
import { getT } from '@/i18n.server'
import { filterPopulated } from '@/lib/isPopulated'
import { lexicalToHTML } from '@/lib/richtext'
import { collectMuseumMarkers, mapNodes } from '@/lib/pascal/museum-plugin/markers-in-map'
import { SERVICE_META } from '@/lib/pascal/museum-plugin/markers'
import { SERVICE_TYPES } from '@/lib/pascal/museum-plugin/ServiceNode'
import { Museum, type MuseumThumbnail, type Tour } from '@/payload-types'
import {
  Avatar,
  AvatarGroup,
  Group,
  List,
  ListItem,
  Spoiler,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  TooltipGroup,
  Typography,
} from '@mantine/core'
import {
  Accessibility,
  Amphora,
  BadgeInfo,
  Check,
  Compass,
  FilePlus,
  Map as MapIcon,
  MapPin,
  Route as Route_,
  Users,
} from 'lucide-react'
import type { Route } from 'next'

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
  source: Pick<Museum, 'id' | 'name' | 'shortDescription' | 'email' | 'location'> & {
    descriptionHTML: string
  }
}

export default async function MuseumPage({
  museum,
  editing,
  navigationHref,
}: {
  museum: Museum
  editing?: MuseumEditing
  /** Free navigation of this museum, when its map is saved (`museumNavigationEntry`). */
  navigationHref?: Route | null
}) {
  const { t } = await getT('museum-page')
  const { t: te } = await getT('editing')

  const descriptionHTML = lexicalToHTML(museum.description) || null
  // Only the facilities the museum confirmed; unknown ones are left unsaid.
  const access = museum.accessibility
  const accessFeatures = [
    access?.stepFreeEntrance && t('Step-free entrance'),
    access?.elevator && t('Elevator'),
    access?.accessibleBathrooms && t('Accessible toilets'),
    access?.tactilePaths && t('Tactile paths'),
    access?.audioGuides && t('Audio guides'),
    access?.signLanguage && t('Sign language'),
    access?.serviceAnimals && t('Service animals welcome'),
  ].filter((feature): feature is string => Boolean(feature))
  const base = editing ? `/${editing.lng}` : ''
  return (
    // Capped at Mantine's `md` container: past ~960px the cover and the tour
    // deck grow taller than the viewport and push the contents below the fold.
    <Stack mx={{ base: 'md', sm: 'xl', md: 'auto' }} maw={{ md: 960 }} mt="sm" pb="xl">
      {/* The museum's photos: the first as cover, all of them in the lightbox. */}
      <DetailCover
        pictures={filterPopulated<MuseumThumbnail>(museum.thumbnails)}
        title={museum.name}
      />
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
        // Navigation blue + compass: moving inside the museum (DESIGN.md →
        // Buttons). The tour gradient is kept for what starts a tour.
        <LinkButton
          href={navigationHref}
          color="blue.8"
          autoContrast
          leftSection={<Compass size={18} aria-hidden />}
          w={{ base: '100%', sm: 'auto' }}
        >
          {t('Explore the map')}
        </LinkButton>
      )}
      {editing && (editing.isSignedIn || editing.canManageMap) && (
        // Complex relations get dedicated pages; metadata is edited in place (Info tab).
        <Group gap="xs">
          {editing.canManageMap && (
            <LinkButton
              href={`${base}/museum/${museum.id}/edit/mapeditor` as Route}
              variant="light"
              size="xs"
              leftSection={<MapIcon size={14} />}
            >
              {te('Add objects to the map')}
            </LinkButton>
          )}
          {editing.isSignedIn && (
            <LinkButton
              href={`${base}/tour/new?museum=${museum.id}` as Route}
              variant="light"
              size="xs"
              leftSection={<Route_ size={14} />}
            >
              {te('Add tour')}
            </LinkButton>
          )}
          {editing.isSignedIn && (
            <LinkButton
              href={`${base}/content/new` as Route}
              variant="light"
              size="xs"
              leftSection={<FilePlus size={14} />}
            >
              {te('Add content')}
            </LinkButton>
          )}
          {editing.canManageMap && (
            <LinkButton
              href={`${base}/museum/${museum.id}/members` as Route}
              variant="subtle"
              size="xs"
              leftSection={<Users size={14} />}
            >
              {te('Staff')}
            </LinkButton>
          )}
        </Group>
      )}
      <Text>{museum.shortDescription}</Text>
      <ArtaroundTabs
        tabs={[
          {
            value: t('contents'),
            icon: <Amphora size={16} />,
            panel: (
              <Stack>
                {/* `tours` is the join over `tours.museum`. */}
                <ToursCarousel tours={filterPopulated<Tour>(museum.tours?.docs)} />
                <ObjectsCarousel objects={museum.objects} />
              </Stack>
            ),
          },
          {
            value: t('info'),
            icon: <BadgeInfo size={16} />,
            panel: (
              <EditableSection
                title={te('About this museum')}
                canEdit={Boolean(editing?.canEditDetails)}
                form={
                  editing && (
                    <MuseumMetadataForm
                      museum={editing.source}
                      descriptionHTML={editing.source.descriptionHTML}
                    />
                  )
                }
              >
                <ArtaroundDataList
                  data={{
                    [t('Description')]: (
                      <Spoiler maxHeight={80} showLabel={t('Show more')} hideLabel={t('Hide')}>
                        <Typography>
                          {!descriptionHTML ? (
                            t('No description available')
                          ) : (
                            <div dangerouslySetInnerHTML={{ __html: descriptionHTML }}></div>
                          )}
                        </Typography>
                      </Spoiler>
                    ),
                    [t('Address')]: [museum.location.address, museum.location.city].join(', '),
                    ...(museum.email ? { [t('Email')]: museum.email } : {}),
                    ...(accessFeatures.length
                      ? {
                          [t('Accessibility')]: (
                            <List
                              spacing={4}
                              size="sm"
                              icon={
                                <ThemeIcon size={18} radius="xl" variant="light" color="blue">
                                  <Check size={12} aria-hidden />
                                </ThemeIcon>
                              }
                            >
                              {accessFeatures.map((feature) => (
                                <ListItem key={feature}>{feature}</ListItem>
                              ))}
                            </List>
                          ),
                        }
                      : {}),
                  }}
                />
              </EditableSection>
            ),
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
              color="blue"
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
