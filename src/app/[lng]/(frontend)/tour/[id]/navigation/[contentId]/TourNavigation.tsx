import { MapViewer } from '@/components/pascal/MapViewer'
import { Tour } from '@/payload-types'
import { AppShellHeader, Stack, StackProps, Stepper, StepperStep, Title } from '@mantine/core'
import { Suspense } from 'react'

export const TourNavigation = ({
  tour,
  step,
  ...props
}: { tour: Tour; step: number } & Omit<StackProps, 'align'>) => {
  const museumMap = typeof tour.museum === 'object' ? tour.museum : null
  return (
    <>
      <AppShellHeader>
        <Title size="h5" className="text-center">
          {tour.title}
        </Title>
        <Stepper active={step}>
          <StepperStep></StepperStep>
          <Suspense fallback={<div>Loading...</div>}>
            <MapViewer />
          </Suspense>
        </Stepper>
      </AppShellHeader>
      <Stack {...props} align="center"></Stack>
    </>
  )
}
