import 'server-only'

import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import { isMuseumPoint, type MuseumPoint } from '@/lib/museum-location'
import { PRIMARY_SHADE } from '@/lib/museum-color'
import { PICTURE_SELECT, pictureSrc } from '@/lib/picture'
import { visitMinutes } from '@/lib/tour-summary'
import { findListedTours } from '@/lib/listed-tours'
import type { Museum, MuseumThumbnail, Tour } from '@/payload-types'
import type { Payload, TypedLocale, TypedUser, Where } from 'payload'

/**
 * Data for the navigator home's discover rails (surface brief:
 * `.impeccable/surfaces/frontend-tabs-navigator-navigatorpage-tsx-*.md`).
 * The home shows at most two rails under the ways in: one set by the context
 * (the locked museum's tours, or museums) and one that rotates per visit
 * among the candidate collections built here. Everything is mapped to plain
 * card data, so the client rails receive no Payload documents.
 */

/** A rail with fewer cards than this is not shown (and never rotates in). */
export const MIN_RAIL_ITEMS = 3
/** Cards per rail: enough to hint at the collection; the rest is in the marketplace. */
const RAIL_LIMIT = 10
/**
 * Tours read once for every rotating candidate (filtered in memory below):
 * the newest ones, enough to fill a few rails of `RAIL_LIMIT` without
 * populating the stops of a whole catalog on every home visit.
 */
const CANDIDATE_POOL = 40
/** "Quick visits": a tour that takes at most this long. */
const QUICK_VISIT_MINUTES = 30

export type RailTour = {
  id: string
  title: string
  imageUrl: string | null
  stops: number
  minutes: number | null
}

export type RailMuseum = {
  id: string
  name: string
  city: string | null
  imageUrl: string | null
  /** [longitude, latitude], for the distance shown once the visitor shares a position. */
  point: MuseumPoint | null
  /** Shade 6 of the museum's palette: the card's outline, as in the museum switch. */
  color: string | null
}

/** One collection the rotating rail can show; `title` is already translated. */
export type RotatingCandidate = { id: string; title: string; tours: RailTour[] }

type Viewer = { user: TypedUser | null; overrideAccess: false }

/**
 * Public tours only: discovery never shows a private class visit, not even
 * the visitor's own. `findListedTours` adds the list rule (no planned visits
 * or visit copies) and reads as the visitor.
 */
const PUBLIC_TOURS: Where = { visibility: { equals: 'public' } }

/**
 * What a rail card needs from a tour. Contents are populated with their length
 * only (the reading-time fallback of `visitMinutes`); quiz questions stay ids
 * (`maxDepth: 0` on the field).
 */
const TOUR_CARD_READ = {
  select: {
    title: true,
    thumbnail: true,
    contents: true,
    durationMinutes: true,
    wheelchairAccessible: true,
    categories: true,
    quiz: true,
  },
  populate: { toursThumbnails: PICTURE_SELECT, contents: { durationSeconds: true } },
  depth: 1,
} as const

/** A tour as `TOUR_CARD_READ` returns it. */
type CardTour = Pick<
  Tour,
  | 'id'
  | 'title'
  | 'thumbnail'
  | 'contents'
  | 'durationMinutes'
  | 'wheelchairAccessible'
  | 'categories'
  | 'quiz'
>

function toRailTour(tour: CardTour): RailTour {
  return {
    id: tour.id,
    title: tour.title,
    imageUrl: isPopulated(tour.thumbnail) ? pictureSrc(tour.thumbnail, 'card') : null,
    // Unpopulated relations still count as stops, as `summarizeTour` counts them.
    stops: tour.contents?.length ?? 0,
    minutes: visitMinutes(tour),
  }
}

/** The locked museum's tours, newest change first (the museum-mode context rail). */
export async function museumTours(options: {
  payload: Payload
  locale: TypedLocale
  museumId: string
}): Promise<RailTour[]> {
  const { payload, locale, museumId } = options
  const { docs } = await findListedTours(payload, {
    where: { museum: { equals: museumId }, ...PUBLIC_TOURS },
    ...TOUR_CARD_READ,
    sort: '-updatedAt',
    limit: RAIL_LIMIT,
    locale,
  })
  return docs.map(toRailTour)
}

/**
 * Every collection the rotating rail may show, each with at least
 * `MIN_RAIL_ITEMS` tours. One read of the newest tours (scoped to the locked
 * museum in museum mode) feeds them all, plus one read of the featured
 * categories for their names. A collection that adds no tour beyond
 * `shown` (the context rail's) is left out: it would repeat those cards
 * right below them.
 */
export async function rotatingCandidates(options: {
  payload: Payload
  locale: TypedLocale
  viewer: Viewer
  museumId: string | null
  /** The context rail's tours (still loading: read in parallel with this). */
  shown: Promise<RailTour[]>
  /** Translated rail titles; `category` receives the category's name. */
  titles: {
    quick: string
    stepFree: string
    quiz: string
    newest: string
    category: (name: string) => string
  }
}): Promise<RotatingCandidate[]> {
  const { payload, locale, viewer, museumId, shown, titles } = options
  const [tours, categories] = await Promise.all([
    findListedTours(payload, {
      where: { ...PUBLIC_TOURS, ...(museumId && { museum: { equals: museumId } }) },
      ...TOUR_CARD_READ,
      sort: '-createdAt',
      limit: CANDIDATE_POOL,
      locale,
    }),
    payload.find({
      collection: 'museumCategories',
      where: { featured: { equals: true } },
      select: { name: true, slug: true },
      depth: 0,
      pagination: false,
      locale,
      ...viewer,
    }),
  ])

  const pick = (keep: (tour: CardTour) => boolean) =>
    tours.docs.filter(keep).slice(0, RAIL_LIMIT).map(toRailTour)
  const categoryIds = (tour: CardTour) =>
    (tour.categories ?? []).map((category) =>
      typeof category === 'string' ? category : category.id,
    )

  const candidates: RotatingCandidate[] = [
    {
      id: 'quick',
      title: titles.quick,
      tours: pick((tour) => {
        const minutes = visitMinutes(tour)
        return minutes != null && minutes <= QUICK_VISIT_MINUTES
      }),
    },
    { id: 'step-free', title: titles.stepFree, tours: pick((tour) => !!tour.wheelchairAccessible) },
    {
      id: 'quiz',
      title: titles.quiz,
      tours: pick((tour) => (tour.quiz?.questions?.length ?? 0) > 0),
    },
    ...categories.docs.map((category) => ({
      id: `category-${category.slug}`,
      title: titles.category(category.name),
      tours: pick((tour) => categoryIds(tour).includes(category.id)),
    })),
    { id: 'newest', title: titles.newest, tours: pick(() => true) },
  ]
  const shownIds = new Set((await shown).map((tour) => tour.id))
  return candidates.filter(
    (candidate) =>
      candidate.tours.length >= MIN_RAIL_ITEMS &&
      candidate.tours.some((tour) => !shownIds.has(tour.id)),
  )
}

/** A museum as `railMuseums` reads it. */
type CardMuseum = Pick<Museum, 'id' | 'name' | 'location' | 'palette' | 'thumbnails'>

function toRailMuseum(museum: CardMuseum): RailMuseum {
  const [cover] = filterPopulated<MuseumThumbnail>(museum.thumbnails)
  const point = museum.location?.latlng
  return {
    id: museum.id,
    name: museum.name,
    city: museum.location?.city ?? null,
    imageUrl: pictureSrc(cover, 'card'),
    point: isMuseumPoint(point) ? point : null,
    color: museum.palette?.[PRIMARY_SHADE] ?? null,
  }
}

/**
 * Museums as rail cards: by name for the global-mode context rail, or
 * nearest first around a shared position (`near`, the navigator's
 * `museumsNear` action).
 */
export async function railMuseums(options: {
  payload: Payload
  locale: TypedLocale
  viewer: Viewer
  /** [longitude, latitude]: sort by distance from here instead of by name. */
  near?: MuseumPoint
}): Promise<RailMuseum[]> {
  const { payload, locale, viewer, near } = options
  const { docs } = await payload.find({
    collection: 'museums',
    select: { name: true, location: true, palette: true, thumbnails: true },
    populate: { museumThumbnails: PICTURE_SELECT },
    depth: 1,
    // `near` on the indexed point sorts by distance, nearest first:
    // [lng, lat, maxDistance, minDistance]. The adapter drops a `near` with
    // neither distance, so a minimum of 0 m keeps it with no radius.
    ...(near ? { where: { 'location.latlng': { near: [...near, null, 0] } } } : { sort: 'name' }),
    limit: RAIL_LIMIT,
    locale,
    ...viewer,
  })
  return docs.map(toRailMuseum)
}
