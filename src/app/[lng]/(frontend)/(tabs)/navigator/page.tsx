import { Stack } from '@mantine/core'
import { Suspense } from 'react'
import { DiscoverSections } from './DiscoverSections'
import NavigatorHomePage from './NavigatorPage'
import { RailPlaceholder } from './RotatingRail'

/**
 * The navigator home. The ways in (search, start blocks, group form) are the
 * client `NavigatorHomePage`; the discover rails under them are read on the
 * server and streamed in, so the first screen paints without waiting on them.
 */
export default async function NavigatorHome({ params }: PageProps<'/[lng]/navigator'>) {
  const { lng } = await params
  return (
    <NavigatorHomePage
      lng={lng}
      discover={
        // Two placeholders: the context rail and the rotating one.
        <Suspense
          fallback={
            <Stack gap="xl">
              <RailPlaceholder />
              <RailPlaceholder />
            </Stack>
          }
        >
          <DiscoverSections lng={lng} />
        </Suspense>
      }
    />
  )
}
