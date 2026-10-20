'use client'

import { DeleteDocumentButton } from '@/components/editing/DeleteDocumentButton'
import { DifficultyBadge } from '@/components/mantine/DifficultyBadge'
import { DurationBadge } from '@/components/mantine/DurationBadge'
import { LockedPriceBadge } from '@/components/mantine/LockedPriceBadge'
import { useCheckout } from '@/components/payments/useCheckout'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import { formatPrice } from '@/lib/price'
import { stopImage, summarizeTour } from '@/lib/tour-summary'
import type { Content, Difficulty, Tour } from '@/payload-types'
import {
  Anchor,
  AppShellFooter,
  AppShellMain,
  AspectRatio,
  Badge,
  Button,
  Container,
  Group,
  Image,
  Modal,
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
  ChevronRight,
  Clock,
  Footprints,
  Landmark,
  ListChecks,
  LogIn,
  MapPin,
  Pencil,
  Play,
  Replace,
  ShoppingBag,
  Star,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TourQrButton } from './TourQrButton'

type TourPageProps = {
  tour: Tour
  /** Sum (euro cents) of the contents the visitor cannot read yet; 0 = nothing to buy. */
  price: number
  lockedContentIds: string[]
  isSignedIn: boolean
  /** Payload's verdict on `tours.update` for this visitor (author or super admin). */
  canEdit: boolean
  /** `tours.delete`: the author, or the director of the tour's museum. */
  canDelete?: boolean
}

/** Localized measurements ("25 min", "320 m"): units follow the visitor's language. */
function formatUnit(value: number, unit: 'minute' | 'meter', lng: string) {
  return new Intl.NumberFormat(lng, { style: 'unit', unit, unitDisplay: 'short' }).format(value)
}

/**
 * Tour details, read before deciding to take the tour: what it is (cover,
 * museum, author, description), what it asks of the visitor (time, stops,
 * walking, access, reading difficulty, quiz) and the stops in their authored
 * order. Every figure comes from `summarizeTour`, so nothing shown here is
 * estimated by the page itself. The two exits sit in the footer, in thumb
 * reach: start navigating right away, or deal with the locked contents (buy
 * them, or swap them for others in the tour editor).
 */
export default function TourPage({
  tour,
  price,
  lockedContentIds,
  isSignedIn,
  canEdit,
  canDelete = false,
}: TourPageProps) {
  const { t } = useTranslation('tour-page')
  const { lng } = useParams<{ lng: string }>()
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const contents = filterPopulated<Content>(tour.contents)
  const locked = new Set(lockedContentIds)
  const summary = summarizeTour(tour)
  const museum = isPopulated(tour.museum) ? tour.museum : null
  const author = isPopulated(tour.author) ? tour.author.name?.fullName : null
  const cover = isPopulated(tour.thumbnail) && tour.thumbnail.url ? tour.thumbnail : null
  // Literal keys so i18next-cli keeps them (DIFFICULTY_LABEL_KEY is dynamic).
  const difficultyLabel: Record<Difficulty, string> = {
    easy: t('Easy'),
    medium: t('Medium'),
    hard: t('Hard'),
  }
  // Authors edit their tour; anyone else customizes a copy of it.
  const editHref = (
    canEdit ? `/${lng}/tour/${tour.id}/edit` : `/${lng}/tour/new?from=${tour.id}`
  ) as Route

  return (
    <>
      <AppShellMain>
        <Container size="sm" px="md" py="md">
          <Stack gap="lg">
            {cover && (
              <AspectRatio ratio={16 / 9}>
                <Image radius="lg" src={cover.url} alt={cover.alt ?? ''} />
              </AspectRatio>
            )}

            <Stack gap="xs">
              <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                <Title order={1} size="h2" textWrap="balance">
                  {tour.title}
                </Title>
                <Group gap="xs" wrap="nowrap">
                  <TourQrButton tourId={tour.id} title={tour.title} />
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
                      c="blue.8"
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
              {tour.description && <Text c="dimmed">{tour.description}</Text>}
            </Stack>

            {/* At a glance: what taking the tour asks of the visitor. Light
                badges, as in the Plan my visit preview; each one names its
                figure in words beside the icon (never color alone). */}
            <Group gap="xs">
              {summary.visitMinutes != null && (
                <Badge size="lg" variant="light" color="blue" leftSection={<Clock size={14} />}>
                  {t('About {{duration}}', {
                    duration: formatUnit(summary.visitMinutes, 'minute', lng),
                  })}
                </Badge>
              )}
              <Badge size="lg" variant="light" color="gray" leftSection={<MapPin size={14} />}>
                {t('{{count}} stops', { count: summary.stops })}
              </Badge>
              {summary.distanceMeters != null && (
                <Badge
                  size="lg"
                  variant="light"
                  color="gray"
                  leftSection={<Footprints size={14} />}
                >
                  {t('{{distance}} on foot', {
                    distance: formatUnit(summary.distanceMeters, 'meter', lng),
                  })}
                </Badge>
              )}
              {summary.wheelchairAccessible && (
                <Badge
                  size="lg"
                  variant="light"
                  color="blue"
                  leftSection={<Accessibility size={14} />}
                >
                  {t('Step-free route')}
                </Badge>
              )}
              {summary.quizQuestions > 0 && (
                <Badge
                  size="lg"
                  variant="light"
                  color="grape"
                  leftSection={<ListChecks size={14} />}
                >
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
                    rating: summary.rating.average.toFixed(1),
                  })}
                  className="tabular-nums"
                >
                  {`${summary.rating.average.toFixed(1)} (${summary.rating.count})`}
                </Badge>
              )}
            </Group>

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
              {/* The reading profile: how many stops ask for an easy, medium
                  or hard read, with the Triplet Rule's icon + label + color. */}
              {summary.difficulties.length > 0 && (
                <Group gap={6}>
                  {summary.difficulties.map(({ difficulty, count }) => (
                    <DifficultyBadge
                      key={difficulty}
                      difficulty={difficulty}
                      variant="light"
                      className="tabular-nums"
                    >
                      {`${count} · ${difficultyLabel[difficulty]}`}
                    </DifficultyBadge>
                  ))}
                </Group>
              )}

              <Timeline bulletSize={28} lineWidth={2} mt="xs">
                {contents.map((content, index) => (
                  // TimelineItem must stay a direct child of Timeline (it
                  // injects layout props into direct children only).
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
                  </TimelineItem>
                ))}
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
          </Stack>
        </Container>
      </AppShellMain>

      {/* The Thumb-Reach Rule: the way forward lives in the 64px footer. */}
      <AppShellFooter p="xs">
        <Container size="sm" px="md">
          {/* Two equal halves of a 390px phone leave ~170px per button: tighter
              padding and sm text keep "Customize tour" / "Unlock for €4.99"
              (and their longer translations) whole instead of "Customize to…". */}
          <Group grow gap="xs" wrap="nowrap">
            {price > 0 ? (
              <Button
                size="md"
                px="xs"
                fz="sm"
                color="orange"
                autoContrast
                rightSection={<ShoppingBag size={16} />}
                onClick={() => setPurchaseOpen(true)}
              >
                {t('Unlock for {{price}}', { price: formatPrice(price, lng) })}
              </Button>
            ) : (
              <Button
                size="md"
                px="xs"
                fz="sm"
                component={Link}
                href={editHref}
                color="orange"
                variant="light"
                leftSection={<Pencil size={16} />}
              >
                {canEdit ? t('Edit tour') : t('Customize tour')}
              </Button>
            )}
            {/* Always available: locked contents simply stay locked while navigating. */}
            <Button
              size="md"
              px="xs"
              fz="sm"
              component={Link}
              href={`/${lng}/tour/${tour.id}/navigation` as Route}
              // The tour gradient: starting a tour is the app's main way in
              // (DESIGN.md → Colors, tour identity); moving freely stays blue.
              variant="gradient"
              gradient={{ from: 'grape', to: 'orange' }}
              rightSection={<Play size={16} />}
            >
              {t('Start tour')}
            </Button>
          </Group>
        </Container>
      </AppShellFooter>

      <PurchaseModal
        opened={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        price={formatPrice(price, lng)}
        lockedCount={locked.size}
        isSignedIn={isSignedIn}
        editHref={editHref}
        loginHref={`/${lng}/login?next=/${lng}/tour/${tour.id}` as Route}
        tourId={tour.id}
      />
    </>
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
            {content.readingTimeMins != null && (
              <DurationBadge
                time={content.readingTimeMins}
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

/**
 * Buying a tour buys every locked content in it. The second option keeps the
 * tour free by sending the visitor to the tour editor to replace the locked
 * contents. Anonymous visitors can't buy, so they are offered sign-in instead.
 */
function PurchaseModal({
  opened,
  onClose,
  price,
  lockedCount,
  isSignedIn,
  editHref,
  loginHref,
  tourId,
}: {
  opened: boolean
  onClose: () => void
  price: string
  lockedCount: number
  isSignedIn: boolean
  editHref: Route
  loginHref: Route
  tourId: string
}) {
  const { t } = useTranslation('tour-page')
  const { lng } = useParams<{ lng: string }>()
  const { startCheckout, loading, error } = useCheckout()
  return (
    <Modal opened={opened} onClose={onClose} title={t('Unlock this tour')} centered>
      <Stack gap="md">
        <Text size="sm">
          {t('{{count}} contents in this tour are paid. Buying the tour unlocks all of them.', {
            count: lockedCount,
          })}
        </Text>
        {isSignedIn ? (
          <>
            {/* Stripe Checkout charges for, and unlocks, exactly the contents
                still locked for this visitor (src/lib/checkout-quote.ts). */}
            <Button
              fullWidth
              leftSection={<ShoppingBag size={16} />}
              loading={loading}
              onClick={() => void startCheckout({ collection: 'tours', id: tourId, locale: lng })}
            >
              {t('Buy all for {{price}}', { price })}
            </Button>
            {error && (
              <Text size="sm" c="red" role="alert">
                {error}
              </Text>
            )}
          </>
        ) : (
          <Button fullWidth component={Link} href={loginHref} leftSection={<LogIn size={16} />}>
            {t('Sign in to buy')}
          </Button>
        )}
        <Button
          fullWidth
          variant="default"
          component={Link}
          href={isSignedIn ? editHref : loginHref}
          leftSection={<Replace size={16} />}
        >
          {t('Replace the paid contents')}
        </Button>
      </Stack>
    </Modal>
  )
}
