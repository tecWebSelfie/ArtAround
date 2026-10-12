import { DifficultyBadge } from '@/components/mantine/DifficultyBadge'
import { DurationBadge } from '@/components/mantine/DurationBadge'
import { MapViewer } from '@/components/pascal/MapViewer'
import { filterPopulated } from '@/lib/isPopulated'
import { Content, Tour } from '@/payload-types'
import {
  AppShellFooter,
  AppShellHeader,
  AppShellMain,
  AppShellMainProps,
  Box,
  Button,
  Flex,
  Group,
  Overlay,
  Scroller,
  Stack,
  Stepper,
  StepperStep,
  Title,
} from '@mantine/core'
import { validateBuildJson } from '@pascal-app/core'
import { Suspense } from 'react'

export const TourNavigation = ({
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
            <Flex h="100%" align="flex-end" justify="flex-end" p="md">
              <Box style={{ pointerEvents: 'auto' }}>
                <Button color="dark" className="rounded-full">
                  Map bottom end overlay button
                </Button>
              </Box>
            </Flex>
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

export function TourProgress({ contents, step }: { contents: Content[]; step: number }) {
  return (
    <Scroller controlSize={'md'}>
      <Stepper
        active={step}
        size={'xs'}
        iconSize={24}
        wrap={false}
        classNames={{
          separator: 'min-w-1/12',
        }}
      >
        {contents.map((content) => (
          <StepperStep
            key={content.id}
            label={content.title}
            description={
              <Group gap={4}>
                <DifficultyBadge difficulty={content.difficulty} withLabel={false} />
                <DurationBadge time={content.readingTimeMins ?? 12} />
              </Group>
            }
          />
        ))}
      </Stepper>
    </Scroller>
  )
}
