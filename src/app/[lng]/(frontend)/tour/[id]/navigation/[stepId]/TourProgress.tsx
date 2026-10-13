'use client'

import { DifficultyBadge } from '@/components/mantine/DifficultyBadge'
import { DurationBadge } from '@/components/mantine/DurationBadge'
import { Content, Tour } from '@/payload-types'
import { Button, Group, Scroller, Stack, Stepper, StepperStep, Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

export function TourProgress({
  contents,
  step,
  tourId,
}: {
  contents: Content[]
  step: number
  tourId: Tour['id']
}) {
  const activeStep = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    activeStep.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
  }, [step])

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
        onStepClick={(step) => {
          modals.open({
            title: 'Salto tappa',
            centered: true,
            children: (
              <Stack className="w-full">
                <Text fz="sm">
                  Sei sicuro di voler saltare direttamente a {contents[step]?.title}?
                </Text>
                <Group grow>
                  <Button onClick={() => modals.closeAll()} variant="outline">
                    Annulla
                  </Button>
                  <Button component={Link} href={`/tour/${tourId}/navigation/${step}/open`}>
                    Vai
                  </Button>
                </Group>
              </Stack>
            ),
          })
        }}
      >
        {contents.map((content, index) => (
          <StepperStep
            key={content.id}
            label={content.title}
            ref={index === step ? activeStep : undefined}
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
