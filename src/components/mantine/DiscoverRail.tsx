'use client'

/**
 * The navigator home's discover rails (surface brief:
 * `.impeccable/surfaces/frontend-tabs-navigator-navigatorpage-tsx-*.md`): a
 * titled section holding one row of square cover cards scrolled by hand,
 * never auto-advancing. Same card language as `ContentsCarousel` and
 * `ObjectsCarousel` (cover photo, bottom scrim, white title and figures),
 * with the outline naming the kind: grape for tours (DESIGN.md → Colors),
 * the museum's own color for museums.
 *
 * A client module taking serializable props, so the server rail
 * (`DiscoverSections`) and the client ones (`RotatingRail`, `MuseumsRail`)
 * render the same markup; it translates its own chrome (arrows, "See all",
 * stop counts), so callers pass only their data and title.
 */
import { formatUnit } from '@/lib/duration'
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'
import type { RailMuseum, RailTour } from '@/lib/discover'
import { Carousel, CarouselSlide } from '@mantine/carousel'
import { Anchor, AspectRatio, BackgroundImage, Group, Stack, Title } from '@mantine/core'
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
  /** `RailCard`s (each is its own carousel slide). */
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

/** One cover card: the whole card is one link, named by its title and figures. */
export function RailCard({
  href,
  imageUrl,
  title,
  facts,
  color,
}: {
  href: Route
  imageUrl: string | null
  title: string
  facts: ReactNode
  /** The outline's color (the kind's, or a museum's own); the default border without one. */
  color: string | null
}) {
  return (
    <CarouselSlide>
      <Link
        href={href}
        className="block rounded-xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--mantine-primary-color-filled)"
      >
        <AspectRatio ratio={1 / 1}>
          <BackgroundImage
            src={imageUrl ?? PLACEHOLDER_IMAGE}
            className="overflow-hidden rounded-xl border-2 border-solid border-(--mantine-color-default-border) transition-transform duration-300 hover:scale-[1.02]"
            // A museum's color is data, not a token: the one inline value.
            style={color ? { borderColor: color } : undefined}
          >
            {/* Bottom scrim: white type stays readable on any photograph. */}
            <Stack
              justify="flex-end"
              gap={6}
              className="h-full bg-linear-to-t from-black/75 via-black/15 to-transparent"
              p="sm"
            >
              <Title order={3} size="h6" c="white" lineClamp={2}>
                {title}
              </Title>
              <Group gap="sm" c="white" fz="xs" fw={500}>
                {facts}
              </Group>
            </Stack>
          </BackgroundImage>
        </AspectRatio>
      </Link>
    </CarouselSlide>
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
        <RailCard
          key={tour.id}
          href={`/${lng}/tour/${tour.id}` as Route}
          imageUrl={tour.imageUrl}
          title={tour.title}
          color={TOUR_OUTLINE}
          facts={
            <>
              <RailFact icon={MapPin}>{t('{{count}} stops', { count: tour.stops })}</RailFact>
              {tour.minutes != null && (
                <RailFact icon={Clock}>{formatUnit(tour.minutes, 'minute', lng)}</RailFact>
              )}
            </>
          }
        />
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
    <RailCard
      href={`/${lng}/museum/${museum.id}` as Route}
      imageUrl={museum.imageUrl}
      title={museum.name}
      color={museum.color}
      facts={
        <>
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
        </>
      }
    />
  )
}
