'use client'

import { DurationBadge } from '@/components/mantine/DurationBadge'
import { Tour } from '@/payload-types'
import { Scroller, Stepper, StepperStep } from '@mantine/core'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  tourContentPath,
  tourNavigationPath,
  tourQuizPath,
  withNavigationPosition,
  withNavigationValue,
} from '@/lib/tour-navigation'
import { DoorOpen, Flag, ListChecks } from 'lucide-react'
import { useIsGroupGuest } from '@/components/group/GroupProvider'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import classes from './navigation-desktop.module.css'

/**
 * The ordered contents are the main quest; selecting one opens it without
 * moving the cursor. Two bookends frame them, always there so the bar keeps
 * one shape for the whole visit:
 * - "Start", the tour's start entrance named under it (the author's, else the
 *   one nearest the first stop: `tourStartEntrance`); done from the moment the
 *   tour begins. Selecting it returns to the plain tour route (it clears a
 *   destination the visitor chose), never moving their position.
 * - "Quiz" when the tour has one: selectable at any time (the quiz intro warns
 *   about stops still ahead). Otherwise "End", which only marks the finish:
 *   it can't be selected, since nothing lies there to open, and it becomes the
 *   active step once every stop is done.
 * For group guests it is read-only progress: the host chooses the steps.
 * `contents` holds the visitable stops only: stops that can no longer be
 * visited were dropped before navigation (`visitableTour`), so the stepper
 * never shows a greyed or "skipped" stop.
 */
export function TourProgress({
  contents,
  step,
  entranceLabel,
  hasQuiz = false,
}: {
  contents: Tour['contents']
  step: number
  entranceLabel?: string | null
  hasQuiz?: boolean
}) {
  const activeStep = useRef<HTMLButtonElement | null>(null)
  // Museum-owned tour URL: `id` is the museum, `tourId` the tour.
  const { lng, id: museumId, tourId } = useParams<{ lng: string; id: string; tourId: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const { t } = useTranslation('tour-navigation')
  // The stepper's first index belongs to "Start".
  const offset = 1
  const guest = useIsGroupGuest()

  useEffect(() => {
    activeStep.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
  }, [step])

  return (
    // Desktop: the track spans the header column and centres a tour that fits
    // (navigation-desktop.module.css); a longer one scrolls as on the phone.
    // Numeric control size also enlarges the scroll arrows; stop hit areas
    // grow independently of the compact metadata's visual type scale.
    <Scroller
      controlSize={44}
      classNames={{ content: classes.stepperTrack }}
      className="[&_.mantine-Stepper-step]:min-h-11"
    >
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
                // "Start" means "back to the plain tour route": it clears the
                // chosen destination without ever writing a position.
                if (index === 0) {
                  router.replace(
                    withNavigationValue(
                      tourNavigationPath(lng, museumId, tourId, step),
                      search.toString(),
                      'to',
                      null,
                    ),
                    { scroll: false },
                  )
                  return
                }
                // The step after the last stop is the quiz ("End" can't be selected).
                if (hasQuiz && index - offset === contents.length) {
                  router.push(tourQuizPath(lng, tourId, step, search.toString()))
                  return
                }
                const content = contents[index - offset]
                if (content) {
                  const contentId = typeof content === 'string' ? content : content.id
                  const path = tourContentPath(
                    lng,
                    { id: tourId, contents, museum: museumId },
                    step,
                    contentId,
                  )
                  router.push(withNavigationPosition(path, search.toString()))
                }
              }
        }
      >
        <StepperStep
          label={t('Start')}
          description={entranceLabel ?? undefined}
          icon={<DoorOpen size={14} aria-hidden />}
        />
        {contents.map((content, index) => (
          <StepperStep
            key={typeof content === 'string' ? content : content.id}
            label={typeof content === 'string' ? `${index + 1}` : content.title}
            ref={index === step ? activeStep : undefined}
            // Only the stop's length, small: what the visitor weighs against
            // the time they have left. Difficulty is theirs to choose
            // (reading options), so it is left off this tight row.
            description={
              typeof content === 'object' && (
                <DurationBadge
                  seconds={content.durationSeconds ?? 0}
                  lng={lng}
                  size="xs"
                  color="museum.8"
                  autoContrast
                />
              )
            }
          />
        ))}
        {hasQuiz ? (
          <StepperStep
            label={t('Quiz')}
            icon={<ListChecks size={14} aria-hidden />}
            ref={step === contents.length ? activeStep : undefined}
          />
        ) : (
          <StepperStep
            label={t('End')}
            icon={<Flag size={14} aria-hidden />}
            allowStepSelect={false}
            ref={step === contents.length ? activeStep : undefined}
          />
        )}
      </Stepper>
    </Scroller>
  )
}
