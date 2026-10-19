'use client'

import { DifficultyBadge } from '@/components/mantine/DifficultyBadge'
import { DurationBadge } from '@/components/mantine/DurationBadge'
import { Tour } from '@/payload-types'
import { Group, Scroller, Stepper, StepperStep } from '@mantine/core'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  tourContentPath,
  tourNavigationPath,
  withNavigationPosition,
  withNavigationValue,
} from '@/lib/tour-navigation'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The ordered contents are the main quest; selecting one opens it without
 * moving the cursor. When the route starts from an entrance (no confirmed `at`),
 * that entrance leads the stepper as the starting step.
 */
export function TourProgress({
  contents,
  step,
  entranceLabel,
}: {
  contents: Tour['contents']
  step: number
  entranceLabel?: string | null
}) {
  const activeStep = useRef<HTMLButtonElement | null>(null)
  const { lng, id: tourId } = useParams<{ lng: string; id: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const { t } = useTranslation('tour-navigation')
  const hasEntrance = Boolean(entranceLabel)
  // The stepper's first index belongs to the entrance when it is shown.
  const offset = hasEntrance ? 1 : 0

  useEffect(() => {
    activeStep.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
  }, [step])

  return (
    <Scroller controlSize={'md'}>
      <Stepper
        active={step + offset}
        size={'xs'}
        iconSize={24}
        wrap={false}
        classNames={{
          separator: 'min-w-1/12',
        }}
        onStepClick={(index) => {
          // The starting step means "back to the plain tour route": it clears the
          // chosen destination without ever writing a position.
          if (hasEntrance && index === 0) {
            router.replace(
              withNavigationValue(
                tourNavigationPath(lng, tourId, step),
                search.toString(),
                'to',
                null,
              ),
              { scroll: false },
            )
            return
          }
          const content = contents[index - offset]
          if (content) {
            const contentId = typeof content === 'string' ? content : content.id
            const path = tourContentPath(lng, { id: tourId, contents }, step, contentId)
            router.push(withNavigationPosition(path, search.toString()))
          }
        }}
      >
        {hasEntrance && <StepperStep label={entranceLabel ?? t('Entrance')} />}
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
