'use client'

import { useGroup, useGroupSettings } from '@/components/group/GroupProvider'
import { GroupRoom } from '@/components/group/GroupRoom'
import { isQuizHandedIn } from '@/lib/group'
import { useGroupExit } from '@/components/group/use-group-exit'
import type { QuizQuestionView } from '@/lib/quiz-core'
import { tourQuizResultPath } from '@/lib/tour-navigation'
import { useRemoteParticipants } from '@livekit/components-react'
import {
  Anchor,
  AppShellFooter,
  AppShellMain,
  Avatar,
  Button,
  Container,
  Group,
  Progress,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { RoomEvent } from 'livekit-client'
import { Check } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { groupQuizScores, type GroupQuizScore } from './actions'
import { TourQuiz, type QuizTourSummary } from './TourQuiz'

/**
 * The quiz page in a group: the host doesn't take the quiz but watches the
 * guests take it, ends it when ready, and sees everyone's score. Guests and
 * solo visitors get the normal quiz.
 */
export function QuizPageContent(props: {
  tour: QuizTourSummary
  questions: QuizQuestionView[]
  from: number
}) {
  const group = useGroup()
  const hosting = group?.membership.role === 'host' && group.membership.tourId === props.tour.id
  return hosting ? (
    // LiveKit's hooks need the room, which GroupProvider creates lazily.
    <GroupRoom>
      <GroupQuizBoard tour={props.tour} questionCount={props.questions.length} />
    </GroupRoom>
  ) : (
    <TourQuiz {...props} />
  )
}

/**
 * Host's board. Live from each guest's LiveKit attributes (see group-quiz.ts):
 * answered count while taking it, result token once handed in. "End the quiz"
 * sets the host's `quiz` attribute to 'ended', which makes every guest hand
 * in what they have; the scores are then read with the tokens.
 *
 * Scores appear only if the host chose "See everyone's quiz results" when
 * opening the group; otherwise guests never share their token and the board
 * only says who has finished.
 */
function GroupQuizBoard({ tour, questionCount }: { tour: QuizTourSummary; questionCount: number }) {
  const { t } = useTranslation('group')
  const { lng } = useParams<{ lng: string }>()
  const { confirmEnd } = useGroupExit()
  const guests = useRemoteParticipants({
    updateOnlyOn: [
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.ParticipantAttributesChanged,
      RoomEvent.ParticipantNameChanged,
    ],
  })
  // The host's own `quiz` attribute is what guests react to. Published with
  // `publish`, so a reload of the host's device keeps the quiz ended.
  const group = useGroup()
  const ended = group?.membership.attributes?.quiz === 'ended'
  const { showResults } = useGroupSettings()
  const finished = guests.filter((guest) => isQuizHandedIn(guest.attributes)).length
  const scores = useScores(
    tour.id,
    guests.flatMap((guest) => guest.attributes.quizToken ?? []),
  )

  const endQuiz = () =>
    modals.openConfirmModal({
      title: t('End the quiz?'),
      centered: true,
      children: (
        <Text size="sm">{t('Answers given so far are handed in, and you see the results.')}</Text>
      ),
      labels: { confirm: t('End the quiz'), cancel: t('Keep waiting') },
      onConfirm: () => group?.publish({ quiz: 'ended' }),
    })

  return (
    <>
      <AppShellMain>
        <Container size="xs" px="md" py="xl">
          <Stack gap="lg">
            <Stack gap={4}>
              <Title order={1} size="h2">
                {ended
                  ? showResults
                    ? t('Quiz results')
                    : t('The quiz is over')
                  : t('Your group is taking the quiz')}
              </Title>
              <Text c="dimmed">{tour.title}</Text>
              {!showResults && (
                <Text size="sm" c="dimmed">
                  {t('Scores stay private: each person sees only their own.')}
                </Text>
              )}
            </Stack>
            <Stack gap={6}>
              <Text size="sm" fw={500} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {t('{{finished}} of {{count}} finished', {
                  finished,
                  count: guests.length,
                })}
              </Text>
              <Progress
                size="sm"
                value={guests.length ? (finished / guests.length) * 100 : 0}
                aria-label={t('Quiz progress of the group')}
                classNames={{ section: 'bg-linear-to-r from-purple-700 to-orange-400' }}
              />
            </Stack>
            {guests.length === 0 && (
              <Text c="dimmed">{t('Nobody else is in the group right now.')}</Text>
            )}
            <Stack gap="sm" aria-live="polite">
              {guests.map((guest) => {
                const token = guest.attributes.quizToken
                const score = token ? scores.find((entry) => entry.token === token) : undefined
                const answered = Number(guest.attributes.quizAnswered ?? 0)
                return (
                  <Group key={guest.identity} gap="sm" wrap="nowrap">
                    <Avatar name={guest.name} color="initials" size="sm" />
                    <Text size="sm" flex={1} truncate>
                      {guest.name}
                    </Text>
                    {score ? (
                      <Group gap="xs" wrap="nowrap">
                        <Text size="sm" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {t('{{score}} of {{total}}', score)}
                        </Text>
                        <Anchor
                          component={Link}
                          href={tourQuizResultPath(lng, tour.id, score.token) as Route}
                          size="sm"
                        >
                          {t('Answers')}
                        </Anchor>
                      </Group>
                    ) : isQuizHandedIn(guest.attributes) ? (
                      <Group gap={4} c="green.8" wrap="nowrap">
                        <Check size={14} aria-hidden />
                        <Text size="sm" inherit>
                          {t('Finished')}
                        </Text>
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {t('{{answered}} of {{total}} answered', {
                          answered,
                          total: questionCount,
                        })}
                      </Text>
                    )}
                  </Group>
                )
              })}
            </Stack>
          </Stack>
        </Container>
      </AppShellMain>
      <AppShellFooter p="xs">
        <Container size="xs" px="md">
          {ended ? (
            <Button fullWidth size="md" variant="light" color="red" onClick={confirmEnd}>
              {t('End the group tour')}
            </Button>
          ) : (
            <Button fullWidth size="md" onClick={endQuiz}>
              {t('End the quiz')}
            </Button>
          )}
        </Container>
      </AppShellFooter>
    </>
  )
}

/** Scores for the result tokens guests shared; read again whenever a new one arrives. */
function useScores(tourId: string, tokens: string[]) {
  const key = tokens.join(',')
  const [scores, setScores] = useState<GroupQuizScore[]>([])
  useEffect(() => {
    if (!key) return
    let cancelled = false
    void groupQuizScores({ tourId, tokens: key.split(',') }).then((result) => {
      if (!cancelled) setScores(result)
    })
    return () => {
      cancelled = true
    }
  }, [tourId, key])
  return scores
}
