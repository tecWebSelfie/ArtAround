import { MuseumLocationMap } from '@/components/location/MuseumLocationMap'
import { EditableSection } from '@/components/editing/EditableSection'
import { MuseumAppearanceForm } from '@/components/editing/forms/MuseumAppearanceForm'
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
import { formatMuseumAddress } from '@/lib/museum-location'
import { collectMuseumMarkers, mapNodes } from '@/lib/pascal/museum-plugin/markers-in-map'
import { SERVICE_META } from '@/lib/pascal/museum-plugin/markers'
import { SERVICE_TYPES } from '@/lib/pascal/museum-plugin/ServiceNode'
import { Museum, type MuseumThumbnail, type Tour } from '@/payload-types'
import { ACCESSIBILITY_COLOR } from '@/theme'
import {
  Anchor,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  ColorSwatch,
  Grid,
  GridCol,
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
  ExternalLink,
  FilePlus,
  Map as MapIcon,
  MapPin,
  QrCode,
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
  source: Pick<Museum, 'id' | 'name' | 'shortDescription' | 'email' | 'location' | 'brandColor'> & {
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
  const { t, lng } = await getT('museum-page')
  const { t: te } = await getT('editing')
  const { t: tc } = await getT('common')

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
  // Planning the visit: when it's open, what it costs, how to reach the
  // museum, what's new. All optional museum fields; empty ones say nothing.
  const hours = openingHoursRows(museum.openingHours, lng)
  const phone =
    typeof museum.phone === 'string' ? museum.phone : (museum.phone?.international ?? null)
  const socials = museum.socials ?? []
  const news = [...(museum.news ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  const newsDate = new Intl.DateTimeFormat(lng, { dateStyle: 'medium' })
  const base = editing ? `/${editing.lng}` : ''
  const tours = filterPopulated<Tour>(museum.tours?.docs)
  return (
    // One stacked column on phones. From `md` the page is a centered
    // container (1140px of content inside `xl` padding) and the hero splits
    // into cover | identity, so neither the cover (height-capped by
    // DetailCover) nor the tour deck (beside the objects, below) outgrows the
    // viewport.
    <Stack
      mx={{ base: 'md', sm: 'xl', md: 'auto' }}
      px={{ md: 'xl' }}
      maw={{ md: 1204 }}
      mt="sm"
      pb="xl"
    >
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
                {editing.canManageMap && (
                  // A sheet of labels, one QR per object on the map, in the
                  // page's language (`/api/qr-sheet`). Scanned on site, each
                  // opens the app in this museum. A plain download link.
                  <Button
                    component="a"
                    href={`/api/qr-sheet?kind=museum&id=${museum.id}&lng=${editing.lng}`}
                    download
                    variant="subtle"
                    size="xs"
                    leftSection={<QrCode size={14} aria-hidden />}
                  >
                    {tc('Print the QR codes of all objects')}
                  </Button>
                )}
              </Group>
            )}
            <Text>{museum.shortDescription}</Text>
          </Stack>
        </GridCol>
      </Grid>
      <ArtaroundTabs
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
                  <ToursCarousel tours={tours} />
                </GridCol>
                <GridCol span={{ base: 12, md: 7 }}>
                  <ObjectsCarousel objects={museum.objects} />
                </GridCol>
              </Grid>
            ),
          },
          {
            value: t('info'),
            icon: <BadgeInfo size={16} />,
            panel: (
              // Reading measure on desktop; the pencil stays at the trailing
              // edge of the section it edits.
              <Box maw={{ md: '75ch' }}>
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
                      [t('Address')]: (
                        <Stack gap="sm">
                          <Text>{formatMuseumAddress(museum.location)}</Text>
                          <MuseumLocationMap point={museum.location.latlng} />
                        </Stack>
                      ),
                      ...(hours.length || museum.openingHours?.notes
                        ? {
                            [t('Opening hours')]: (
                              <Stack gap={4}>
                                {hours.map(({ day, ranges }) => (
                                  <Group key={day} gap="md" wrap="nowrap">
                                    <Text size="sm" w="7em" c="dimmed">
                                      {day}
                                    </Text>
                                    <Text size="sm" className="tabular-nums">
                                      {ranges || t('Closed')}
                                    </Text>
                                  </Group>
                                ))}
                                {museum.openingHours?.notes && (
                                  <Text size="sm" c="dimmed">
                                    {museum.openingHours.notes}
                                  </Text>
                                )}
                              </Stack>
                            ),
                          }
                        : {}),
                      ...(museum.ticketInfo?.label
                        ? {
                            [t('Tickets')]: (
                              <Stack gap={4}>
                                <Text size="sm">{museum.ticketInfo.label}</Text>
                                {museum.ticketInfo.url && (
                                  <Anchor
                                    href={museum.ticketInfo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    size="sm"
                                    className="inline-flex items-center gap-1 self-start"
                                  >
                                    {t('Tickets and prices on the museum’s site')}
                                    <ExternalLink size={14} aria-hidden />
                                  </Anchor>
                                )}
                              </Stack>
                            ),
                          }
                        : {}),
                      ...(phone
                        ? {
                            [t('Phone')]: (
                              <Anchor href={`tel:${phone.replace(/\s/g, '')}`} size="sm">
                                {phone}
                              </Anchor>
                            ),
                          }
                        : {}),
                      ...(museum.email ? { [t('Email')]: museum.email } : {}),
                      ...(socials.length
                        ? {
                            [t('Follow the museum')]: (
                              <Group gap="md">
                                {socials.map((social) => (
                                  <Anchor
                                    key={social.id ?? social.url}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    size="sm"
                                  >
                                    {social.platform}
                                  </Anchor>
                                ))}
                              </Group>
                            ),
                          }
                        : {}),
                      ...(news.length
                        ? {
                            [t('News')]: (
                              <Stack gap="sm">
                                {news.map((item) => (
                                  <Stack key={item.id ?? item.title} gap={2}>
                                    <Text size="xs" c="dimmed">
                                      {newsDate.format(new Date(item.date))}
                                    </Text>
                                    <Text size="sm" fw={600}>
                                      {item.title}
                                    </Text>
                                    <Text size="sm">{item.content}</Text>
                                  </Stack>
                                ))}
                              </Stack>
                            ),
                          }
                        : {}),
                      ...(accessFeatures.length
                        ? {
                            [t('Accessibility')]: (
                              <List
                                spacing={4}
                                size="sm"
                                icon={
                                  <ThemeIcon
                                    size={18}
                                    radius="xl"
                                    variant="light"
                                    color={ACCESSIBILITY_COLOR}
                                  >
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
                {/* The museum's color: only for the people who can change it
                    (director); visitors just see the app wearing it. */}
                {editing?.canEditDetails && (
                  <Box mt="xl">
                    <EditableSection
                      title={te('Museum color')}
                      canEdit
                      form={<MuseumAppearanceForm museum={editing.source} />}
                    >
                      <Group gap="xs">
                        {museum.brandColor && (
                          <ColorSwatch color={museum.brandColor} size={20} aria-hidden />
                        )}
                        <Text size="sm">
                          {museum.brandColor ? museum.brandColor : te('Default blue')}
                        </Text>
                      </Group>
                    </EditableSection>
                  </Box>
                )}
              </Box>
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

const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

/**
 * The week's opening hours as rows ("Monday", "09:00–13:00, 14:00–19:00"), day
 * names in the visitor's language; a day without ranges reads as closed. No
 * rows at all when the museum entered no hours, so nothing is guessed.
 */
function openingHoursRows(hours: Museum['openingHours'], lng: string) {
  if (!hours || WEEKDAYS.every((day) => !hours[day]?.length)) return []
  const dayName = new Intl.DateTimeFormat(lng, { weekday: 'long', timeZone: 'UTC' })
  // Opening and closing are Payload date fields (ISO instants); only their
  // time of day matters, in the visitor's notation.
  const time = new Intl.DateTimeFormat(lng, { timeStyle: 'short' })
  return WEEKDAYS.map((day, index) => ({
    // 1 January 2024 was a Monday.
    day: dayName.format(new Date(Date.UTC(2024, 0, 1 + index))),
    ranges: (hours[day] ?? [])
      .filter((range) => range.opening && range.closing)
      .map(
        (range) =>
          `${time.format(new Date(range.opening!))}–${time.format(new Date(range.closing!))}`,
      )
      .join(', '),
  }))
}
