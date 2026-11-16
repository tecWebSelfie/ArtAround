'use client'

import { ACCESSIBILITY_COLOR } from '@/theme'
import { DeleteDocumentButton } from '@/components/editing/DeleteDocumentButton'
import { DifficultyBadge } from '@/components/mantine/DifficultyBadge'
import { DurationBadge } from '@/components/mantine/DurationBadge'
import { LockedPriceBadge } from '@/components/mantine/LockedPriceBadge'
import { formatRating } from '@/lib/rating'
import { formatUnit } from '@/lib/duration'
import { stopImage, type summarizeTour } from '@/lib/tour-summary'
import { stopDirections } from '@/lib/tour-logistics'
import { QrCodeButton } from '@/components/QrCodeButton'
import type { Content, Difficulty, Tour } from '@/payload-types'
import {
  Anchor,
  Badge,
  Group,
  Image,
  Stack,
  Text,
  ThemeIcon,
  Timeline,
  TimelineItem,
  Title,
  UnstyledButton,
} from '@mantine/core'
import {
  Accessibility,
  BookOpen,
  EyeOff,
  ChevronRight,
  Clock,
  Footprints,
  Landmark,
  ListChecks,
  MapPin,
  Signpost,
  Star,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** Parts of the tour page (`TourPage.tsx`): its heading, figures and stops. */

/**
 * The tour's title with its QR code and (for its author) delete, the byline
 * (museum, author), then the description and the translation notice. Two
 * steps of spacing: the title and its byline read as one heading unit,
 * tight; the description and the notice follow it as body text.
 */
export function TourHeading({
  tour,
  museum,
  author,
  canDelete,
  printMuseumId,
  translationNotice,
}: {
  tour: Tour
  museum: { id: string; name: string } | null
  author: string | null | undefined
  canDelete: boolean
  printMuseumId: string | null
  translationNotice: ReactNode
}) {
  const { t } = useTranslation('tour-page')
  const { lng } = useParams<{ lng: string }>()
  return (
    <Stack gap="sm">
      <Stack gap={4}>
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
          <Title order={1} size="h2" textWrap="balance">
            {tour.title}
          </Title>
          <Group gap="xs" wrap="nowrap">
            <QrCodeButton
              kind="tour"
              id={tour.id}
              title={tour.title}
              printMuseumId={printMuseumId}
            />
            {canDelete && (
              <DeleteDocumentButton
                collection="tours"
                id={tour.id}
                name={tour.title}
                redirectTo={`/${lng}/navigator` as Route}
              />
            )}
          </Group>
        </Group>
        {(museum || author) && (
          <Group gap="xs" c="dimmed" fz="sm">
            {museum && (
              <Anchor
                component={Link}
                href={`/${lng}/museum/${museum.id}` as Route}
                size="sm"
                c="light-dark(var(--mantine-color-museum-8), var(--mantine-color-museum-4))"
                className="inline-flex items-center gap-1"
              >
                <Landmark size={14} aria-hidden />
                {museum.name}
              </Anchor>
            )}
            {museum && author && <span aria-hidden>·</span>}
            {author && <Text size="sm">{t('By {{name}}', { name: author })}</Text>}
          </Group>
        )}
      </Stack>
      {tour.description && <Text c="dimmed">{tour.description}</Text>}
      {translationNotice}
    </Stack>
  )
}

/**
 * At a glance: what taking the tour asks of the visitor. Light badges, as in
 * the Plan my visit preview; each one names its figure in words beside the
 * icon (never color alone).
 */
export function TourFigures({
  summary,
  isPrivate,
}: {
  summary: ReturnType<typeof summarizeTour>
  /** A class visit only its author and group guests see. */
  isPrivate: boolean
}) {
  const { t } = useTranslation('tour-page')
  const { lng } = useParams<{ lng: string }>()
  return (
    <Group gap="xs">
      {summary.visitMinutes != null && (
        <Badge size="lg" variant="light" leftSection={<Clock size={14} />}>
          {t('About {{duration}}', {
            duration: formatUnit(summary.visitMinutes, 'minute', lng),
          })}
        </Badge>
      )}
      <Badge size="lg" variant="light" color="gray" leftSection={<MapPin size={14} />}>
        {t('{{count}} stops', { count: summary.stops })}
      </Badge>
      {summary.distanceMeters != null && (
        <Badge size="lg" variant="light" color="gray" leftSection={<Footprints size={14} />}>
          {t('{{distance}} on foot', {
            distance: formatUnit(summary.distanceMeters, 'meter', lng),
          })}
        </Badge>
      )}
      {summary.wheelchairAccessible && (
        <Badge
          size="lg"
          variant="light"
          color={ACCESSIBILITY_COLOR}
          leftSection={<Accessibility size={14} />}
        >
          {t('Step-free route')}
        </Badge>
      )}
      {isPrivate && (
        <Badge size="lg" variant="light" color="gray" leftSection={<EyeOff size={14} />}>
          {t('Private')}
        </Badge>
      )}
      {summary.quizQuestions > 0 && (
        <Badge size="lg" variant="light" color="grape" leftSection={<ListChecks size={14} />}>
          {t('Ends with a quiz')}
        </Badge>
      )}
      {summary.rating && (
        <Badge
          size="lg"
          variant="light"
          color="yellow"
          leftSection={<Star size={14} fill="currentColor" />}
          aria-label={t('Rated {{rating}} out of 5', {
            rating: formatRating(summary.rating.average, lng),
          })}
          className="tabular-nums"
        >
          {`${formatRating(summary.rating.average, lng)} (${summary.rating.count})`}
        </Badge>
      )}
    </Group>
  )
}

/** The stops in order, each with how to get there from the previous one, then the quiz. */
export function TourStops({
  tour,
  contents,
  locked,
  summary,
  difficultyLabel,
}: {
  tour: Tour
  contents: Content[]
  locked: Set<string>
  summary: ReturnType<typeof summarizeTour>
  difficultyLabel: Record<Difficulty, string>
}) {
  const { t } = useTranslation('tour-page')
  const { lng } = useParams<{ lng: string }>()
  return (
    <Stack gap="sm">
      <Group justify="space-between" align="baseline" gap="xs">
        <Title order={2} size="h4">
          {t('The stops')}
        </Title>
        {summary.readingMinutes != null && (
          <Text size="sm" c="dimmed">
            {t('{{duration}} of reading', {
              duration: formatUnit(summary.readingMinutes, 'minute', lng),
            })}
          </Text>
        )}
      </Group>
      {summary.stops === 0 && (
        <Text size="sm" c="dimmed">
          {t('This tour has no stops to visit right now.')}
        </Text>
      )}
      <Timeline bulletSize={28} lineWidth={2} mt="xs">
        {contents.map((content, index) => {
          const directions = stopDirections(tour, content.id)
          // TimelineItem must stay a direct child of Timeline (it
          // injects layout props into direct children only).
          return (
            <TimelineItem
              key={content.id}
              bullet={
                <Text size="xs" fw={700} className="tabular-nums">
                  {index + 1}
                </Text>
              }
            >
              <StopRow
                content={content}
                locked={locked.has(content.id)}
                difficultyLabel={difficultyLabel[content.difficulty]}
              />
              {/* How to get there from the previous stop, as the author wrote it. */}
              {directions && (
                <Group gap={6} wrap="nowrap" align="start" c="dimmed">
                  <Signpost size={14} aria-hidden className="mt-0.5 shrink-0" />
                  <Text size="xs">{directions}</Text>
                </Group>
              )}
            </TimelineItem>
          )
        })}
        {summary.quizQuestions > 0 && (
          <TimelineItem bullet={<ListChecks size={14} aria-hidden />}>
            <Stack gap={0} py={4}>
              <Text fw={600} size="sm">
                {t('Quiz')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('Test what you remember after the last stop')}
              </Text>
            </Stack>
          </TimelineItem>
        )}
      </Timeline>
    </Stack>
  )
}

/**
 * One stop of the timeline, as a single link to the content page: its picture
 * (content image, else its object's thumbnail, else the teal content icon),
 * the title, and what reading it asks for. A locked stop names its price.
 */
function StopRow({
  content,
  locked,
  difficultyLabel,
}: {
  content: Content
  locked: boolean
  difficultyLabel: string
}) {
  const { t } = useTranslation('tour-page')
  const { lng } = useParams<{ lng: string }>()
  const image = stopImage(content)
  return (
    <UnstyledButton
      component={Link}
      href={`/${lng}/content/${content.id}` as Route}
      aria-label={t('See more about {{title}}', { title: content.title })}
      className="-mx-2 -my-1 block rounded-md px-2 py-1 transition-colors hover:bg-(--mantine-color-default-hover)"
    >
      <Group gap="sm" wrap="nowrap">
        {image ? (
          <Image src={image.url} alt="" w={56} h={56} radius="md" className="shrink-0" />
        ) : (
          <ThemeIcon size={56} radius="md" variant="light" color="teal" className="shrink-0">
            <BookOpen size={22} aria-hidden />
          </ThemeIcon>
        )}
        <Stack gap={6} miw={0} className="flex-1">
          <Text fw={600} size="sm" lineClamp={2}>
            {content.title}
          </Text>
          <Group gap={6}>
            <DifficultyBadge difficulty={content.difficulty} size="xs" variant="light">
              {difficultyLabel}
            </DifficultyBadge>
            {content.durationSeconds != null && (
              <DurationBadge
                seconds={content.durationSeconds}
                lng={lng}
                size="xs"
                variant="light"
                color="gray"
              />
            )}
            {/* Shared with navigation search and nearby suggestions. */}
            {locked && <LockedPriceBadge price={content.price ?? 0} size="xs" />}
          </Group>
        </Stack>
        <ChevronRight size={18} className="shrink-0 text-(--mantine-color-dimmed)" aria-hidden />
      </Group>
    </UnstyledButton>
  )
}
