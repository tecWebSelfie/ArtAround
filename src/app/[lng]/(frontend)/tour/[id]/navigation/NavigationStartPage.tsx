import { getT } from '@/i18n.server'
import { Tour } from '@/payload-types'
import { JoinGroupForm } from '@/components/group/JoinGroupForm'
import { StartGroupButton } from '@/components/group/StartGroupButton'
import { AspectRatio, Divider, Group, Image, Stack, StackProps, Title } from '@mantine/core'
import { cn } from 'cn'
import { Map } from 'lucide-react'
import { StartTourButton } from './StartTourButton'

/**
 * Server-rendered introduction shown before the persistent map session starts:
 * start alone, open a group as its host, or join a group with its code.
 *
 * From `md` the composition fills the viewport below the site header and is
 * centered as one block (title and cover, then the grouped actions and join
 * form) instead of hanging from the top edge; phones keep today's flow.
 */
export default async function NavigationPage({ tour, ...props }: { tour: Tour } & StackProps) {
  const { t } = await getT('tour-navigation')
  const tourThumbnail = typeof tour.thumbnail === 'object' ? tour.thumbnail : null
  return (
    <Stack
      {...props}
      justify="space-evenly"
      align="center"
      mih={{ md: 'calc(100dvh - var(--site-header-height, 0px))' }}
      py={{ md: 'xl' }}
      // Stack's `justify`/`gap` aren't responsive props: Tailwind (utilities
      // layer, above Mantine's) centers the two groups as one block from md.
      className={cn('min-[62em]:justify-center min-[62em]:gap-10', props.className)}
    >
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
            // No cover yet: the tour's own brand gradient (as on marketplace
            // cards) instead of a grey "no thumbnail" image. Decorative.
            <div
              className="flex items-center justify-center rounded-full bg-linear-135 from-(--mantine-color-grape-6) to-(--mantine-color-orange-4) text-white"
              aria-hidden
            >
              <Map size="35%" strokeWidth={1.5} />
            </div>
          )}
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
