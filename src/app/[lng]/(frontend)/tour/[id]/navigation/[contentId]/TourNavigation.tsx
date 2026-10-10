import { Tour } from '@/payload-types'
import { AppShellHeader, Stack, StackProps, Stepper, StepperStep, Title } from '@mantine/core'

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
        </Stepper>
      </AppShellHeader>
      <Stack {...props} align="center"></Stack>
    </>
  )
}
