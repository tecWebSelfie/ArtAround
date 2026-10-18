'use client'

import { DifficultyBadge } from '@/components/mantine/DifficultyBadge'
import { DurationBadge } from '@/components/mantine/DurationBadge'
import { Tour } from '@/payload-types'
import { Group, Scroller, Stepper, StepperStep } from '@mantine/core'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { tourContentPath, withNavigationPosition } from '@/lib/tour-navigation'
import { useEffect, useRef } from 'react'

/** The ordered contents are the main quest; selecting one opens it without moving the cursor. */
export function TourProgress({ contents, step }: { contents: Tour['contents']; step: number }) {
  const activeStep = useRef<HTMLButtonElement | null>(null)
  const { lng, id: tourId } = useParams<{ lng: string; id: string }>()
  const search = useSearchParams()
  const router = useRouter()

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
        onStepClick={(index) => {
          const content = contents[index]
          if (content) {
            const contentId = typeof content === 'string' ? content : content.id
            const path = tourContentPath(lng, { id: tourId, contents }, step, contentId)
            router.push(withNavigationPosition(path, search.toString()))
          }
        }}
      >
        {contents.map((content, index) => (
          <StepperStep
            key={typeof content === 'string' ? content : content.id}
            label={typeof content === 'string' ? `${index + 1}` : content.title}
            ref={index === step ? activeStep : undefined}
            description={
              typeof content === 'object' && (
                <Group gap={4}>
                  <DifficultyBadge difficulty={content.difficulty} withLabel={false} />
                  <DurationBadge time={content.readingTimeMins ?? 12} />
                </Group>
              )
            }
          />
        ))}
      </Stepper>
    </Scroller>
  )
}
