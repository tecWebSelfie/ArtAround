import { getT } from '@/i18n.server'
import { Tour } from '@/payload-types'
import { JoinGroupForm } from '@/components/group/JoinGroupForm'
import { StartGroupButton } from '@/components/group/StartGroupButton'
import { AspectRatio, Divider, Group, Image, Stack, StackProps, Title } from '@mantine/core'
import { StartTourButton } from './StartTourButton'

/**
 * Server-rendered introduction shown before the persistent map session starts:
 * start alone, open a group as its host, or join a group with its code.
 */
export default async function NavigationPage({ tour, ...props }: { tour: Tour } & StackProps) {
  const { t } = await getT('tour-navigation')
  const tourThumbnail = typeof tour.thumbnail === 'object' ? tour.thumbnail : null
  return (
    <Stack {...props} justify="space-evenly" align="center">
      <Stack justify="center" align="center">
        <Title className="text-center">{tour.title}</Title>
        <AspectRatio ratio={1} className="w-10/12">
          <Image
            fit="cover"
            className="rounded-full"
            src={tourThumbnail?.url || 'https://via.placeholder.com/300x200?text=No+Tour+Thumbnail'}
            alt={tourThumbnail?.alt || t('tour thumbnail not available')}
          />
        </AspectRatio>
      </Stack>
      <Stack justify="center" align="center">
        <Group justify="center" gap="md">
          <StartTourButton tourId={tour.id} />
          <StartGroupButton tourId={tour.id} />
        </Group>
        <Divider label={t('or')} w="100%" />
        <JoinGroupForm />
      </Stack>
    </Stack>
  )
}
