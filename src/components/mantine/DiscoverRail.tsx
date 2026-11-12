'use client'

/**
 * The navigator home's discover rails (surface brief:
 * `.impeccable/surfaces/frontend-tabs-navigator-navigatorpage-tsx-*.md`): a
 * titled section holding one row of square cover cards (`CoverCard`, as in
 * `ContentsCarousel` and `ObjectsCarousel`) scrolled by hand, never
 * auto-advancing. The outline names the kind: grape for tours (DESIGN.md →
 * Colors), the museum's own color for museums.
 *
 * A client module taking serializable props, so the server rail
 * (`DiscoverSections`) and the client ones (`RotatingRail`, `MuseumsRail`)
 * render the same markup; it translates its own chrome (arrows, "See all",
 * stop counts), so callers pass only their data and title.
 */
import { formatUnit } from '@/lib/duration'
import type { RailMuseum, RailTour } from '@/lib/discover'
import { Carousel } from '@mantine/carousel'
import { Anchor, Group, Stack, Title } from '@mantine/core'
import { CoverCard } from './CoverCard'
import { Clock, MapPin, Navigation } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** The tour outline (DESIGN.md → Colors: grape marks tour cards). */
const TOUR_OUTLINE = 'var(--mantine-color-grape-6)'

export function DiscoverRail({
  title,
  action,
  children,
}: {
  /** Already translated by the caller (it names the collection). */
  title: string
  /** The header's trailing control: `SeeAllLink` or "Use my location". */
  action?: ReactNode
  /** `CoverCard`s (each is its own carousel slide). */
  children: ReactNode
}) {
  const { t } = useTranslation('navigator-discover')
  return (
    <Stack component="section" gap="sm">
      <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
        {/* h2: each rail is a section of the home, right under its h1. */}
        <Title order={2} size="h5" textWrap="balance">
          {title}
        </Title>
        {action}
      </Group>
      {/* Below md the row runs to the screen's right edge (past the page's
          side gutter), so the next card visibly continues off-screen
          instead of being cut by the gutter, and is swiped. From md, where
          a mouse can't swipe, previous/next arrows sit over the row's ends;
          an arrow that can't move (`data-inactive`) is hidden, so a row
          that fits shows none. */}
      <Carousel
        className="-mr-(--mantine-spacing-md) from-sm:-mr-(--mantine-spacing-xl) from-md:mr-0"
        classNames={{ controls: 'below-md:hidden', control: 'data-inactive:invisible' }}
        emblaOptions={{ align: 'start', containScroll: 'trimSnaps' }}
        slideSize={{ base: '60%', sm: '33.3333%', md: '25%' }}
        slideGap="sm"
        previousControlProps={{ 'aria-label': t('Previous') }}
        nextControlProps={{ 'aria-label': t('Next') }}
      >
        {children}
      </Carousel>
    </Stack>
  )
}

/** The rail header's link to the whole collection ("See all"). */
export function SeeAllLink({ href }: { href: Route }) {
  const { t } = useTranslation('navigator-discover')
  return (
    <Anchor component={Link} href={href} size="sm" fw={600} className="shrink-0">
      {t('See all')}
    </Anchor>
  )
}

/** A card's figures: one line of icon-led facts in the scrim's white. */
function RailFacts({ children }: { children: ReactNode }) {
  return (
    <Group gap="sm" c="white" fz="xs" fw={500}>
      {children}
    </Group>
  )
}

function RailFact({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <Group gap={4} wrap="nowrap">
      <Icon size={14} aria-hidden />
      {children}
    </Group>
  )
}

/** A rail of tours: their stops and minutes, the figures to compare tours by. */
export function TourRail({
  title,
  tours,
  seeAllHref,
}: {
  title: string
  tours: RailTour[]
  seeAllHref: Route
}) {
  const { t } = useTranslation('tours-carousel')
  const { lng } = useParams<{ lng: string }>()
  return (
    <DiscoverRail title={title} action={<SeeAllLink href={seeAllHref} />}>
      {tours.map((tour) => (
        <CoverCard
          key={tour.id}
          href={`/${lng}/tour/${tour.id}` as Route}
          imageUrl={tour.imageUrl}
          title={tour.title}
          outline={TOUR_OUTLINE}
        >
          <RailFacts>
            <RailFact icon={MapPin}>{t('{{count}} stops', { count: tour.stops })}</RailFact>
            {tour.minutes != null && (
              <RailFact icon={Clock}>{formatUnit(tour.minutes, 'minute', lng)}</RailFact>
            )}
          </RailFacts>
        </CoverCard>
      ))}
    </DiscoverRail>
  )
}

/** A museum's card: its city, and how far it is once the visitor shared a position. */
export function MuseumRailCard({
  museum,
  distanceKm,
}: {
  museum: RailMuseum
  distanceKm?: number | null
}) {
  const { lng } = useParams<{ lng: string }>()
  return (
    <CoverCard
      href={`/${lng}/museum/${museum.id}` as Route}
      imageUrl={museum.imageUrl}
      title={museum.name}
      outline={museum.color}
    >
      <RailFacts>
        {museum.city && <RailFact icon={MapPin}>{museum.city}</RailFact>}
        {distanceKm != null && (
          <RailFact icon={Navigation}>
            {/* One decimal under 10 km, whole kilometres beyond. */}
            {formatUnit(
              distanceKm < 10 ? Math.round(distanceKm * 10) / 10 : Math.round(distanceKm),
              'kilometer',
              lng,
            )}
          </RailFact>
        )}
      </RailFacts>
    </CoverCard>
  )
}
