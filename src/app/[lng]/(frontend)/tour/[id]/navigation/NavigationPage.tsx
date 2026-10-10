import { getT } from '@/i18n.server'
import { Tour } from '@/payload-types'
import { AspectRatio, Image, Stack, StackProps, TextInput, ThemeIcon, Title } from '@mantine/core'
import { UserRoundGroup } from 'lucide-react'
import { StartTourButton } from './StartTourButton'

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
        <TextInput
          className="w-10/12"
          size="xs"
          radius={'md'}
          variant="default"
          placeholder={t('Room Code')}
          rightSection={
            <ThemeIcon>
              <UserRoundGroup />
            </ThemeIcon>
          }
        />
        <StartTourButton className="w-full" tourId={tour.id} />
      </Stack>
    </Stack>
  )
}
