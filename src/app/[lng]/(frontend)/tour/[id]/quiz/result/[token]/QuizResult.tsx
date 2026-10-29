'use client'

import { ActionFooter } from '@/components/mantine/ActionFooter'
import { tourQuizPath } from '@/lib/tour-navigation'
import { BarChart } from '@mantine/charts'
import {
  AppShellMain,
  Box,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Progress,
  RingProgress,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { ArrowRight, BookOpen, Check, RotateCcw, Share2, X } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { LfrsRating } from 'payload-lfrs/client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QuizContentDrawer } from '../../QuizContentDrawer'

export type QuizReviewItem =
  | { id: string; missing: true; correct: boolean }
  | {
      id: string
      missing: false
      prompt: string
      correct: boolean
      yourAnswer: string | null
      correctAnswer: string
      explanation: string | null
      contentIds: string[]
      /** A related stop of this tour the visitor had not reached (early quiz). */
      unvisited: boolean
      /** Share of visitors who got it right; null below the statistics threshold. */
      percentCorrect: number | null
    }

type Comparison = {
  betterThan: number
  bands: { label: string; visitors: number; own: boolean }[]
}

/**
 * Quiz results: the score, how it compares with other visitors (from
 * `MIN_ATTEMPTS_FOR_STATS` attempts on), an answer-by-answer review with
 * links back to the contents, then rate / share / retake, and the primary
 * way out to the navigator home in the thumb-reach footer.
 */
export function QuizResult({
  tour,
  score,
  total,
  percent,
  stepsCompleted,
  comparison,
  review,
}: {
  tour: { id: string; title: string }
  score: number
  total: number
  percent: number
  stepsCompleted: number
  comparison: Comparison | null
  review: QuizReviewItem[]
}) {
  const { t } = useTranslation('tour-quiz')
  const { lng } = useParams<{ lng: string }>()
  const [drawerContent, setDrawerContent] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)

  const verdict =
    percent >= 80
      ? t('Excellent work!')
      : percent >= 50
        ? t('Well done!')
        : t('Some stops deserve a second look.')

  const share = async () => {
    const url = window.location.href
    const text = t('I scored {{score}}/{{total}} on the “{{tour}}” quiz.', {
      score,
      total,
      tour: tour.title,
    })
    try {
      if (navigator.share) {
        await navigator.share({ title: tour.title, text, url })
        return
      }
      await navigator.clipboard.writeText(url)
      notifications.show({ message: t('Link to your results copied.') })
    } catch (error) {
      // Dismissing the share sheet is not an error worth reporting.
      if (error instanceof DOMException && error.name === 'AbortError') return
      notifications.show({
        color: 'red',
        message: t('The link could not be shared. Copy it from the address bar.'),
      })
    }
  }

  return (
    <>
      {/* AppShellMain reserves room for the fixed footer below. */}
      <AppShellMain>
        <Container size="xs" px="md" py="xl">
          <Stack gap="xl">
            <Stack gap="md" align="center" ta="center">
              <Title order={1} size="h2" style={{ textWrap: 'balance' }}>
                {tour.title}
              </Title>
              {/* The ring is the score itself, not decoration: label and value agree. */}
              <RingProgress
                size={160}
                thickness={14}
                roundCaps
                sections={[{ value: percent, color: percent >= 50 ? 'green' : 'orange' }]}
                aria-label={t('{{score}} correct answers out of {{total}}', { score, total })}
                label={
                  <Center>
                    <Text fw={800} fz={36} lh={1} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {score}
                      <Text span c="dimmed" fz={20} fw={600}>
                        /{total}
                      </Text>
                    </Text>
                  </Center>
                }
              />
              <Text size="lg" fw={600}>
                {verdict}
              </Text>
            </Stack>

            <Stack gap="sm" component="section" aria-labelledby="quiz-comparison">
              <Title order={2} size="h4" id="quiz-comparison">
                {t('Compared with other visitors')}
              </Title>
              {comparison ? (
                <>
                  <Text>
                    {t('You did better than {{percent}}% of visitors.', {
                      percent: comparison.betterThan,
                    })}
                  </Text>
                  <ScoreDistribution bands={comparison.bands} />
                </>
              ) : (
                <Text c="dimmed">
                  {t(
                    'You are among the first to take this quiz! Comparisons appear once more visitors have played.',
                  )}
                </Text>
              )}
            </Stack>

            <Stack gap="sm" component="section" aria-labelledby="quiz-review">
              <Title order={2} size="h4" id="quiz-review">
                {t('Your answers')}
              </Title>
              <Stack gap={0}>
                {review.map((item, index) => (
                  <Box key={item.id}>
                    {index > 0 && <Divider my="md" />}
                    <ReviewEntry item={item} number={index + 1} onReadContent={setDrawerContent} />
                  </Box>
                ))}
              </Stack>
            </Stack>

            <Stack gap="sm" component="section" aria-labelledby="quiz-rate">
              <Title order={2} size="h4" id="quiz-rate">
                {t('How was the tour?')}
              </Title>
              <LfrsRating
                targetCollection="tours"
                targetDoc={tour.id}
                max={5}
                onAuthError={() => setNeedsLogin(true)}
              />
              {needsLogin && (
                <Text size="sm" c="dimmed">
                  {t('Sign in to rate this tour.')}
                </Text>
              )}
            </Stack>

            <Group grow>
              <Button variant="default" leftSection={<Share2 size={18} />} onClick={share}>
                {t('Share')}
              </Button>
              <Button
                variant="default"
                leftSection={<RotateCcw size={18} />}
                component={Link}
                href={tourQuizPath(lng, tour.id, stepsCompleted, '')}
              >
                {t('Retake the quiz')}
              </Button>
            </Group>
          </Stack>
        </Container>
      </AppShellMain>

      <ActionFooter size="xs">
        <Button
          fullWidth
          size="md"
          component={Link}
          href={`/${lng}/navigator` as Route}
          rightSection={<ArrowRight size={18} />}
        >
          {t('Back to the navigator')}
        </Button>
      </ActionFooter>

      <QuizContentDrawer
        contentId={drawerContent}
        lng={lng}
        onClose={() => setDrawerContent(null)}
      />
    </>
  )
}

/**
 * Score bands as bars, the visitor's band highlighted in tour orange and named
 * in its axis label ("you"), so the highlight never relies on color alone.
 * The sentence above already states the takeaway; the chart adds the shape.
 */
function ScoreDistribution({ bands }: { bands: Comparison['bands'] }) {
  const { t } = useTranslation('tour-quiz')
  const data = bands.map((band) => ({
    band: band.own ? t('{{band}} (you)', { band: band.label }) : band.label,
    visitors: band.visitors,
    color: band.own ? 'orange.5' : 'gray.4',
  }))
  return (
    <Box
      role="img"
      aria-label={t('Visitors per score band: {{summary}}', {
        summary: data.map((d) => `${d.band} ${d.visitors}`).join(', '),
      })}
    >
      <BarChart
        h={180}
        data={data}
        dataKey="band"
        series={[{ name: 'visitors', label: t('Visitors'), color: 'gray.4' }]}
        tickLine="none"
        gridAxis="none"
        withYAxis={false}
        withTooltip={false}
        withBarValueLabel
      />
    </Box>
  )
}

function ReviewEntry({
  item,
  number,
  onReadContent,
}: {
  item: QuizReviewItem
  number: number
  onReadContent: (contentId: string) => void
}) {
  const { t } = useTranslation('tour-quiz')
  if (item.missing) {
    return (
      <Text c="dimmed">
        {t('Question {{n}} is no longer available.', { n: number })}{' '}
        {item.correct ? t('You answered it correctly.') : t('You did not get it right.')}
      </Text>
    )
  }
  return (
    <Stack gap="xs">
      <Text fw={600}>
        <Text span c="dimmed" mr={6} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {number}.
        </Text>
        {item.prompt}
      </Text>

      <Group gap={6} wrap="nowrap" align="flex-start">
        {item.correct ? (
          <Check size={18} color="var(--mantine-color-green-7)" aria-hidden />
        ) : (
          <X size={18} color="var(--mantine-color-red-7)" aria-hidden />
        )}
        <Text size="sm">
          <Text span fw={600} c={item.correct ? 'green.8' : 'red.8'}>
            {item.correct ? t('Right:') : t('Your answer:')}
          </Text>{' '}
          {item.yourAnswer ?? t('no answer')}
        </Text>
      </Group>
      {!item.correct && (
        <Group gap={6} wrap="nowrap" align="flex-start">
          <Check size={18} color="var(--mantine-color-green-7)" aria-hidden />
          <Text size="sm">
            <Text span fw={600} c="green.8">
              {t('Right answer:')}
            </Text>{' '}
            {item.correctAnswer}
          </Text>
        </Group>
      )}

      {item.explanation && (
        <Text size="sm" c="dimmed">
          {item.explanation}
        </Text>
      )}

      {item.percentCorrect !== null && (
        <Stack gap={4}>
          <Progress
            size="xs"
            value={item.percentCorrect}
            color="gray.6"
            aria-label={t('Visitors who answered correctly')}
          />
          <Text size="xs" c="dimmed">
            {t('{{percent}}% of visitors got this right', { percent: item.percentCorrect })}
          </Text>
        </Stack>
      )}

      {!item.correct && item.contentIds.length > 0 && (
        <Group gap="xs">
          {item.contentIds.map((contentId) => (
            <Button
              key={contentId}
              variant="subtle"
              size="compact-sm"
              leftSection={<BookOpen size={16} />}
              onClick={() => onReadContent(contentId)}
            >
              {item.unvisited ? t('Stop not visited yet: open it') : t('Read the content again')}
            </Button>
          ))}
        </Group>
      )}
    </Stack>
  )
}
