'use client'

import { DifficultyBadge } from '@/components/mantine/DifficultyBadge'
import { DurationBadge } from '@/components/mantine/DurationBadge'
import { Tour } from '@/payload-types'
import { Group, Scroller, Stepper, StepperStep } from '@mantine/core'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { tourContentPath, tourQuizPath, withNavigationPosition } from '@/lib/tour-navigation'
import { ListChecks } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The ordered contents are the main quest; selecting one opens it without moving the cursor.
 * A tour with a quiz ends with a "Quiz" step: visible from the start, so visitors know it is
 * coming, and selectable at any time (the quiz intro warns about stops still ahead).
 */
export function TourProgress({
  contents,
  step,
  hasQuiz = false,
}: {
  contents: Tour['contents']
  step: number
  hasQuiz?: boolean
}) {
  const { t } = useTranslation('tour-navigation')
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
          if (index === contents.length) {
            router.push(tourQuizPath(lng, tourId, step, search.toString()))
            return
          }
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
        {hasQuiz && (
          <StepperStep
            label={t('Quiz')}
            icon={<ListChecks size={14} aria-hidden />}
            ref={step === contents.length ? activeStep : undefined}
          />
        )}
      </Stepper>
    </Scroller>
  )
}
