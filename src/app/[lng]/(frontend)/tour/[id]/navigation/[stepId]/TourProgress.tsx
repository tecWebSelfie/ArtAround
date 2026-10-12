'use client'

import { DifficultyBadge } from '@/components/mantine/DifficultyBadge'
import { DurationBadge } from '@/components/mantine/DurationBadge'
import { Content } from '@/payload-types'
import { Group, Scroller, Stepper, StepperStep } from '@mantine/core'
import { useEffect, useRef } from 'react'

export function TourProgress({ contents, step }: { contents: Content[]; step: number }) {
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
