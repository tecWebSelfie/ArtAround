import { MapViewer } from '@/components/pascal/MapViewer'
import { filterPopulated } from '@/lib/isPopulated'
import { Tour } from '@/payload-types'
import {
  AppShellFooter,
  AppShellHeader,
  AppShellMain,
  AppShellMainProps,
  Box,
  Button,
  Group,
  Overlay,
  Progress,
  Stack,
  Title,
} from '@mantine/core'
import { validateBuildJson } from '@pascal-app/core'
import { Suspense } from 'react'
import { TourProgress } from './TourProgress'

export const TourNavigationPage = ({
  tour,
  step,
  className,
  style,
}: { tour: Tour; step: number } & Pick<AppShellMainProps, 'className' | 'style'>) => {
  const museumMap = validateBuildJson(
    typeof tour.museum?.docs?.[0] === 'object' ? tour.museum?.docs?.[0].map : null,
  )
  const contents = filterPopulated(tour.contents)

  return (
    <>
      <AppShellHeader px="xs" pb="xs" className="rounded-b-xl">
        <Stack gap="xs">
          <Title size="h5" ta="center">
            {tour.title}
          </Title>
          <Progress size={'xs'} value={(step / contents.length) * 100} />
          <TourProgress contents={contents} step={step} />
        </Stack>
      </AppShellHeader>

      <AppShellMain h="100dvh" className={`overflow-hidden ${className ?? ''}`} style={style}>
        <Box pos="relative" h="100%">
          <Suspense fallback={<div>Loading...</div>}>
            {museumMap.parsed ? (
              <MapViewer map={museumMap.parsed} h="100%" w="100%" />
            ) : (
              <div>Map not available</div>
            )}
          </Suspense>
          <Overlay backgroundOpacity={0} style={{ pointerEvents: 'none' }}>
            <Stack className="h-full" justify="end">
              <Group wrap="nowrap" align="end" justify="space-around" className="p-2">
                <Button size="compact-xs">Cerca servizi</Button>
                <Box style={{ pointerEvents: 'auto' }}>
                  <Button color="dark" className="rounded-full">
                    Map bottomfefe
                  </Button>
                </Box>
                <Button></Button>
              </Group>
            </Stack>
          </Overlay>
        </Box>
      </AppShellMain>

      <NavigationNavBar />
    </>
  )
}

export function NavigationNavBar() {
  return (
    <AppShellFooter className="rounded-t-md">
      <Group grow p="xs" align="center">
        <Title>prova</Title>
      </Group>
    </AppShellFooter>
  )
}
