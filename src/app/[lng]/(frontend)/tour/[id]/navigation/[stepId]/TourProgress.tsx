'use client'

import { DifficultyBadge } from '@/components/mantine/DifficultyBadge'
import { DurationBadge } from '@/components/mantine/DurationBadge'
import { Tour } from '@/payload-types'
import { Badge, Group, Scroller, Stepper, StepperStep } from '@mantine/core'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  tourContentPath,
  tourNavigationPath,
  tourQuizPath,
  withNavigationPosition,
  withNavigationValue,
} from '@/lib/tour-navigation'
import { ListChecks, MapPinOff } from 'lucide-react'
import { useIsGroupGuest } from '@/components/group/GroupProvider'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The ordered contents are the main quest; selecting one opens it without
 * moving the cursor. When the route starts from an entrance (no confirmed `at`),
 * that entrance leads the stepper as the starting step.
 * A tour with a quiz ends with a "Quiz" step: visible from the start, so visitors know it is
 * coming, and selectable at any time (the quiz intro warns about stops still ahead).
 * For group guests it is read-only progress: the host chooses the steps.
 * Stops that can no longer be visited (`skipped`, see `unavailableStops`) stay
 * in their place, greyed with a "Skipped" badge and not selectable, so the
 * visitor sees what the tour leaves out rather than a silently shorter list.
 */
export function TourProgress({
  contents,
  step,
  entranceLabel,
  hasQuiz = false,
  skipped,
}: {
  contents: Tour['contents']
  step: number
  /** Cursor indexes of the stops that can no longer be visited. */
  skipped?: ReadonlySet<number>
  entranceLabel?: string | null
  hasQuiz?: boolean
}) {
  const activeStep = useRef<HTMLButtonElement | null>(null)
  const { lng, id: tourId } = useParams<{ lng: string; id: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const { t } = useTranslation('tour-navigation')
  const hasEntrance = Boolean(entranceLabel)
  // The stepper's first index belongs to the entrance when it is shown.
  const offset = hasEntrance ? 1 : 0
  const guest = useIsGroupGuest()

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
        onStepClick={
          guest
            ? undefined
            : (index) => {
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
                // The step after the last stop is the quiz.
                if (index - offset === contents.length) {
                  router.push(tourQuizPath(lng, tourId, step, search.toString()))
                  return
                }
                const content = contents[index - offset]
                if (content && !skipped?.has(index - offset)) {
                  const contentId = typeof content === 'string' ? content : content.id
                  const path = tourContentPath(lng, { id: tourId, contents }, step, contentId)
                  router.push(withNavigationPosition(path, search.toString()))
                }
              }
        }
      >
        {hasEntrance && <StepperStep label={entranceLabel ?? t('Entrance')} />}
        {contents.map((content, index) => (
          <StepperStep
            key={typeof content === 'string' ? content : content.id}
            label={typeof content === 'string' ? `${index + 1}` : content.title}
            ref={index === step ? activeStep : undefined}
            // An unavailable stop reads as crossed out and can't be selected.
            {...(skipped?.has(index)
              ? {
                  icon: <MapPinOff size={14} aria-hidden />,
                  color: 'gray',
                  allowStepSelect: false,
                  classNames: { stepLabel: 'line-through opacity-60' },
                  description: (
                    <Badge size="xs" variant="light" color="gray">
                      {t('Skipped')}
                    </Badge>
                  ),
                }
              : {
                  description: typeof content === 'object' && (
                    <Group gap={4}>
                      <DifficultyBadge difficulty={content.difficulty} withLabel={false} />
                      <DurationBadge time={content.readingTimeMins ?? 12} />
                    </Group>
                  ),
                })}
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
