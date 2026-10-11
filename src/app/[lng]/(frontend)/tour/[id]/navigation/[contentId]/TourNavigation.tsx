import { MapViewer } from '@/components/pascal/MapViewer'
import { Tour } from '@/payload-types'
import { AppShellHeader, Stack, StackProps, Stepper, StepperStep, Title } from '@mantine/core'
import { validateBuildJson } from '@pascal-app/core'
import { Suspense } from 'react'

export const TourNavigation = ({
  tour,
  step,
  ...props
}: { tour: Tour; step: number } & Omit<StackProps, 'align'>) => {
  const museumMap = validateBuildJson(
    typeof tour.museum?.docs?.[0] === 'object' ? tour.museum?.docs?.[0].map : null,
  )
  return (
    <>
      <AppShellHeader>
        <Title size="h5" className="text-center">
          {tour.title}
        </Title>
        <Stepper active={step}>
          <StepperStep></StepperStep>
          <Suspense fallback={<div>Loading...</div>}>
            {museumMap.parsed ? <MapViewer map={museumMap.parsed} /> : <div>Map not available</div>}
          </Suspense>
        </Stepper>
      </AppShellHeader>
      <Stack {...props} align="center"></Stack>
    </>
  )
}
