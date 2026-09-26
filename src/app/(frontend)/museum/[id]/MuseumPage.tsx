import {
  AspectRatio,
  Stack,
  Image,
  Title,
  DataList,
  DataListItem,
  DataListItemValue,
  DataListItemLabel,
  Typography,
  Text,
  AvatarGroup,
  Avatar,
  TooltipGroup,
  Tooltip,
  Group,
  ThemeIcon,
  Overlay,
  Button,
  Spoiler,
} from '@mantine/core'
import { ArtaroundTabs } from '@/components/mantine/ArtaroundTabs'
import { ArtaroundDataList } from '@/components/mantine/ArtaroundDataList'
import { Museum, type MuseumThumbnail } from '@/payload-types'
import {
  Amphora,
  Utensils,
  Toilet,
  Info,
  ShoppingBag,
  Accessibility,
  Images,
  BadgeInfo,
} from 'lucide-react'

import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'

export default async function MuseumPage({ museum }: { museum: Museum }) {
  let descriptionHTML: string | null = null
  if (
    museum.description &&
    typeof museum.description === 'object' &&
    'root' in museum.description
  ) {
    try {
      descriptionHTML = convertLexicalToHTML({ data: museum.description })
    } catch {
      descriptionHTML = null
    }
  }
  return (
    <Stack mx={{ base: 'md', sm: 'xl' }} mt="sm">
      <MuseumThumbnailGallery thumbnails={museum.thumbnails} />
      <Title order={2}>{museum.name}</Title>
      {museum.services && Object.keys(museum.services).length > 0 && (
        <MuseumBadges services={museum.services} />
      )}
      <ArtaroundTabs
        tabs={[
          {
            value: 'info',
            icon: <BadgeInfo size={16} />,
            panel: (
              <Stack>
                <Text>{museum.shortDescription}</Text>

                <ArtaroundDataList
                  data={{
                    Description: (
                      <Spoiler maxHeight={80} showLabel="Show more" hideLabel="Hide">
                        <Typography>
                          {!descriptionHTML ? (
                            'No description available'
                          ) : (
                            <div dangerouslySetInnerHTML={{ __html: descriptionHTML }}></div>
                          )}
                        </Typography>
                      </Spoiler>
                    ),
                    Address: [museum.location.address, museum.location.city].join(', '),
                  }}
                />
              </Stack>
            ),
          },
          {
            value: 'contents',
            icon: <Amphora size={16} />,
            panel: <Text>Contents panel content</Text>,
          },
        ]}
      />
    </Stack>
  )
}

export async function MuseumBadges(props: { services: Museum['services'] }) {
  const { services } = props

  return (
    <Group justify="space-between">
      {/*services badges*/}
      <TooltipGroup>
        <AvatarGroup>
          {services?.food && (
            <Tooltip label="Food available" withArrow>
              <Avatar color="green" radius="xl">
                <Utensils size={16} />
              </Avatar>
            </Tooltip>
          )}
          {services?.bathrooms && (
            <Tooltip label="Toilets available" withArrow>
              <Avatar color="blue" radius="xl">
                <Toilet size={16} />
              </Avatar>
            </Tooltip>
          )}
          {services?.infoPoint && (
            <Tooltip label="Info point available" withArrow>
              <Avatar color="orange" radius="xl">
                <Info size={16} />
              </Avatar>
            </Tooltip>
          )}
          {services?.shop && (
            <Tooltip label="Shop available" withArrow>
              <Avatar color="red" radius="xl">
                <ShoppingBag size={16} />
              </Avatar>
            </Tooltip>
          )}
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
        src={validThumb?.url ?? 'https://placehold.co/600x400?text=Placeholder'}
        fallbackSrc="https://placehold.co/600x400?text=Placeholder"
        alt={validThumb?.alt ?? 'Museum thumbnail not available'}
      />
      <Overlay backgroundOpacity={0} p="sm">
        <Group align="end" h="100%" justify="end">
          <Button
            styles={{ section: { marginLeft: 5 } }}
            rightSection={<Images size={10} />}
            size="compact-xs"
            variant="white"
            autoContrast
          >
            See more
          </Button>
        </Group>
      </Overlay>
    </AspectRatio>
  )
}
