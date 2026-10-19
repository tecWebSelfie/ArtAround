'use client'

import { ContentDetailsModalContent } from '@/components/mantine/ContentDetailsModal'
import { Content } from '@/payload-types'
import { Button, Stack } from '@mantine/core'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'next/navigation'
import { contentObjectId, tourQuizPath, withNavigationPosition } from '@/lib/tour-navigation'
import { NavigationObjectActions } from '../../../NavigationObjectActions'

/**
 * Shows the next ordered content and advances only when the visitor confirms.
 * On the last stop of a tour with a quiz, completing goes straight to the quiz
 * (with the completed cursor as `from`), which is the tour's final step.
 */
export function StepModal({
  step: content,
  nextHref,
  lastStep = false,
  quizFrom,
}: {
  step: Content
  nextHref?: Route
  lastStep?: boolean
  /** Set when the tour has a quiz: the completed cursor the last stop's action passes to it. */
  quizFrom?: number
}) {
  const router = useRouter()
  const search = useSearchParams()
  const { lng, id: tourId } = useParams<{ lng: string; id: string }>()
  const { t } = useTranslation('tour-navigation')
  const toQuiz = lastStep && quizFrom !== undefined
  return (
    <Stack>
      <ContentDetailsModalContent content={content} />
      <NavigationObjectActions objectId={contentObjectId(content)} />
      {nextHref && (
        <Button
          onClick={() => {
            const params = new URLSearchParams(search)
            params.delete('to')
            if (toQuiz && quizFrom !== undefined) {
              router.push(tourQuizPath(lng, tourId, quizFrom, params.toString()))
              return
            }
            router.replace(withNavigationPosition(nextHref, params.toString()) as Route)
          }}
        >
          {toQuiz
            ? t('Complete and go to the quiz')
            : lastStep
              ? t('Complete tour')
              : t('Go to next step')}
        </Button>
      )}
    </Stack>
  )
}
