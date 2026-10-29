import { getT } from '@/i18n.server'
import { Tour } from '@/payload-types'
import { JoinGroupForm } from '@/components/group/JoinGroupForm'
import { StartGroupButton } from '@/components/group/StartGroupButton'
import { AspectRatio, Divider, Group, Image, Stack, StackProps, Title } from '@mantine/core'
import { KIND_FALLBACK } from '@/components/mantine/kind-fallback'
import { tourMuseumId } from '@/lib/tour-navigation'
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
        <Title order={2} className="text-center text-balance">
          {tour.title}
        </Title>
        {/* Capped so the start actions stay above the fold on a phone. */}
        <AspectRatio ratio={1} className="w-8/12" maw={320}>
          {tourThumbnail?.url ? (
            <Image
              fit="cover"
              className="rounded-full"
              src={tourThumbnail.url}
              alt={tourThumbnail.alt ?? ''}
            />
          ) : (
            // No cover yet: the tour's own brand gradient (`KIND_FALLBACK`, as
            // on marketplace cards) instead of a grey "no thumbnail" image.
            <div
              className="flex items-center justify-center rounded-full text-white"
              style={{ background: KIND_FALLBACK.tour.background }}
              aria-hidden
            >
              <KIND_FALLBACK.tour.Icon size="35%" strokeWidth={1.5} />
            </div>
          )}
        </AspectRatio>
      </Stack>
      <Stack justify="center" align="center">
        <Group justify="center" gap="md">
          <StartTourButton museumId={tourMuseumId(tour)} tourId={tour.id} />
          <StartGroupButton tourId={tour.id} />
        </Group>
        <Divider label={t('or')} w="100%" />
        <JoinGroupForm />
      </Stack>
    </Stack>
  )
}
