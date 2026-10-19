import { EditableSection } from '@/components/editing/EditableSection'
import { MuseumMetadataForm } from '@/components/editing/forms/MuseumMetadataForm'
import { LinkButton } from '@/components/editing/LinkButton'
import { ArtaroundDataList } from '@/components/mantine/ArtaroundDataList'
import { ArtaroundTabs } from '@/components/mantine/ArtaroundTabs'
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
  AspectRatio,
  Avatar,
  AvatarGroup,
  Button,
  Group,
  Image,
  Overlay,
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
  FilePlus,
  Images,
  Map as MapIcon,
  Route as Route_,
  Users,
} from 'lucide-react'
import type { Route } from 'next'
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'

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
}: {
  museum: Museum
  editing?: MuseumEditing
}) {
  const { t } = await getT('museum-page')
  const { t: te } = await getT('editing')

  const descriptionHTML = lexicalToHTML(museum.description) || null
  const base = editing ? `/${editing.lng}` : ''
  return (
    <Stack mx={{ base: 'md', sm: 'xl' }} mt="sm" pb="xl">
      <MuseumThumbnailGallery thumbnails={museum.thumbnails} />
      <Title order={2}>{museum.name}</Title>
      <MuseumBadges museum={museum} />
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
                    Description: (
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
                    Address: [museum.location.address, museum.location.city].join(', '),
                    ...(museum.email ? { Email: museum.email } : {}),
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

export async function MuseumBadges(props: { museum: Museum }) {
  const { museum } = props
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
                <Avatar color={color} radius="xl">
                  <Icon size={16} />
                </Avatar>
              </Tooltip>
            )
          })}
        </AvatarGroup>
        {/*Accessibility Badge */}
        <Tooltip label="Accessible" withArrow>
          <ThemeIcon radius="xl" size="lg" variant="filled" color="blue" autoContrast>
            <Accessibility size={16} />
          </ThemeIcon>
        </Tooltip>
      </TooltipGroup>
    </Group>
  )
}

export async function MuseumThumbnailGallery(props: { thumbnails: Museum['thumbnails'] }) {
  const validThumb = props.thumbnails?.find((t): t is MuseumThumbnail => typeof t !== 'string')

  return (
    <AspectRatio pos="relative" ratio={16 / 9}>
      <Image
        radius="lg"
        src={validThumb?.url}
        fallbackSrc={PLACEHOLDER_IMAGE}
        alt={validThumb?.alt ?? 'Museum thumbnail not available'}
      />
      <Overlay backgroundOpacity={0} p="sm">
        <Group align="end" h="100%" justify="end">
          <Button
            styles={{ section: { marginLeft: 5 } }}
            rightSection={<Images size={10} />}
            size="compact-xs"
            variant="white"
            color="blue.8"
            autoContrast
          >
            See more
          </Button>
        </Group>
      </Overlay>
    </AspectRatio>
  )
}
