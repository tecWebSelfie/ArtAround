import config from '@/payload.config'
import { isMuseumPoint, type MuseumPoint } from '@/lib/museum-location'
import { museumAccent } from '@/lib/museum-color'
import { museumSearchMuseumId } from '@/lib/museum-mode'
import { PICTURE_SELECT, pictureSrc, type Picture } from '@/lib/picture'
import { asViewer } from '@/lib/session'
import { searchItems } from '@/lib/search/query'
import type { SearchHit } from '@/lib/search/types'
import { isEmptyTour } from '@/lib/tour-stops'
import { withVisitableStops } from '@/lib/tour-summary'
import type { Content, Difficulty, Museum, Tour } from '@/payload-types'
import { getPayload, type Payload, type TypedLocale } from 'payload'

/**
 * One home-search result, with only what the dropdown shows. Tours and
 * contents carry the essentials for choosing one at a glance: time and
 * difficulty (and, for a tour, its stops; for a paid content, its price).
 */
export type NavigatorSearchItem = {
  kind: 'tour' | 'content' | 'museum' | 'object'
  key: string
  title: string
  href: string
  subtitle?: string
  city?: string
  /** Length in seconds. Tour: its visit length (`durationMinutes`, else its contents' lengths). Content: its own. */
  seconds?: number
  /** Tour: its hardest content's difficulty. Content: its own. */
  difficulty?: Difficulty
  /** Tour only: number of stops. */
  stops?: number
  /** Content only: list price in euro cents when paid. */
  priceCents?: number
  /**
   * Museum, or a tour's museum: where it is ([longitude, latitude]), so the
   * dropdown can mark what is near a visitor who shares their position. The
   * distance is computed in the browser; the position never comes here.
   */
  point?: MuseumPoint
  /**
   * The row's thumbnail (the `card` size of the document's first picture):
   * the tour's cover, a content's first image, a museum's first photo, a
   * work's thumbnail. Missing when the document has none.
   */
  imageUrl?: string
  /** Museum only: shade 6 of its palette, the ring around its thumbnail. */
  color?: string
}

/** The upload collection each kind draws its row thumbnail from. */
type ThumbnailCollection =
  'toursThumbnails' | 'contentImages' | 'museumThumbnails' | 'objectsThumbnails'

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 }

/** How many index hits are ranked before keeping `limit` (see GET). */
const RANK_POOL = 40

function joinParts(...parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ')
}

const pointOf = (museum: Pick<Museum, 'location'> | undefined) => {
  const point = museum?.location?.latlng
  return isMuseumPoint(point) ? point : undefined
}

const idOf = (value: unknown) =>
  typeof value === 'string' ? value : (value as { id?: string } | null)?.id

const pictureOf = (pictures: Map<string, string>, value: unknown) => pictures.get(idOf(value) ?? '')

/**
 * Row thumbnails of one upload collection, keyed by picture id: one read,
 * only the URL fields.
 */
async function findPictures(payload: Payload, collection: ThumbnailCollection, values: unknown[]) {
  const ids = [...new Set(values.map(idOf))].filter((id): id is string => Boolean(id))
  if (!ids.length) return new Map<string, string>()
  const { docs } = await payload.find({
    collection,
    where: { id: { in: ids } },
    select: PICTURE_SELECT,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return new Map(
    docs.flatMap((doc) => {
      const src = pictureSrc(doc as Picture, 'card')
      return src ? [[String(doc.id), src] as const] : []
    }),
  )
}

/**
 * A tour's row: its museum and city, its length (its own figure, else its
 * stops' reading time), its hardest stop's difficulty, its stop count.
 */
function tourItem(
  tour: Tour,
  stopById: Map<string, Pick<Content, 'difficulty' | 'durationSeconds'>>,
  museum: Museum | undefined,
  pictures: Map<string, string>,
  locale: TypedLocale,
): NavigatorSearchItem {
  const own = tour.contents.map((content) => stopById.get(idOf(content) ?? '')).filter(Boolean)
  const length = own.reduce((sum, stop) => sum + (stop?.durationSeconds ?? 0), 0)
  const hardest = own.reduce<Difficulty | undefined>((top, stop) => {
    const difficulty = stop?.difficulty
    return difficulty && (!top || DIFFICULTY_RANK[difficulty] > DIFFICULTY_RANK[top])
      ? difficulty
      : top
  }, undefined)
  return {
    kind: 'tour',
    key: `tour:${tour.id}`,
    title: tour.title,
    href: `/${locale}/tour/${tour.id}`,
    subtitle: joinParts(museum?.name, museum?.location?.city) || undefined,
    seconds: tour.durationMinutes ? tour.durationMinutes * 60 : length || undefined,
    difficulty: hardest,
    stops: tour.contents.length,
    point: pointOf(museum),
    imageUrl: pictureOf(pictures, tour.thumbnail),
  }
}

/**
 * The search index is English-only so matching stays stable. Hydrate the
 * result page with the visitor's locale before returning it: titles read like
 * the rest of the localized site, and the details come from the documents.
 */
async function hydrateNavigatorHits({
  payload,
  locale,
  hits,
  viewer,
}: {
  payload: Payload
  locale: TypedLocale
  hits: SearchHit[]
  viewer: Awaited<ReturnType<typeof asViewer>>
}): Promise<NavigatorSearchItem[]> {
  const idsOf = (collection: string) =>
    hits.filter((hit) => hit.collection === collection).map((hit) => hit.sourceId)
  const find = <T extends 'tours' | 'contents' | 'museums'>(collection: T, ids: string[]) =>
    ids.length
      ? payload.find({
          collection,
          where: { id: { in: ids } },
          locale,
          depth: 0,
          pagination: false,
          ...viewer,
        })
      : null

  const objectIds = idsOf('objects')
  const [tours, contents, museums, objects] = await Promise.all([
    find('tours', idsOf('tours')),
    find('contents', idsOf('contents')),
    find('museums', idsOf('museums')),
    // Museum mode only (see GET): global mode never asks for objects. The row
    // shows a work's name and artist only.
    objectIds.length
      ? payload.find({
          collection: 'objects',
          where: { id: { in: objectIds } },
          select: { name: true, artist: true, thumbnail: true },
          locale,
          depth: 0,
          pagination: false,
          ...viewer,
        })
      : null,
  ])

  // Tours' details come from their contents and museum: one read each.
  // Tours with nothing to visit are not offered (the index drops them too).
  const tourDocs = ((tours?.docs ?? []) as Tour[])
    .filter((tour) => !isEmptyTour(tour))
    .map(withVisitableStops)
  const contentDocs = (contents?.docs ?? []) as Content[]
  const museumDocs = (museums?.docs ?? []) as Museum[]
  const objectDocs = objects?.docs ?? []

  const stopIds = [...new Set(tourDocs.flatMap((tour) => tour.contents.map(idOf)))].filter(
    (id): id is string => Boolean(id),
  )
  const tourMuseumIds = [...new Set(tourDocs.map((tour) => idOf(tour.museum)))].filter(
    (id): id is string => Boolean(id),
  )
  // Row thumbnails (`findPictures`) in the same round as the tours' stops
  // and museums.
  const [stops, tourMuseums, tourPictures, contentPictures, museumPictures, objectPictures] =
    await Promise.all([
      stopIds.length
        ? payload.find({
            collection: 'contents',
            where: { id: { in: stopIds } },
            select: { difficulty: true, durationSeconds: true },
            depth: 0,
            pagination: false,
            overrideAccess: true,
          })
        : null,
      tourMuseumIds.length
        ? payload.find({
            collection: 'museums',
            where: { id: { in: tourMuseumIds } },
            select: { name: true, location: true },
            locale,
            depth: 0,
            pagination: false,
            overrideAccess: true,
          })
        : null,
      findPictures(
        payload,
        'toursThumbnails',
        tourDocs.map((tour) => tour.thumbnail),
      ),
      findPictures(
        payload,
        'contentImages',
        contentDocs.map((content) => content.images?.[0]),
      ),
      findPictures(
        payload,
        'museumThumbnails',
        museumDocs.map((museum) => museum.thumbnails?.[0]),
      ),
      findPictures(
        payload,
        'objectsThumbnails',
        objectDocs.map((object) => object.thumbnail),
      ),
    ])
  const stopById = new Map((stops?.docs ?? []).map((stop) => [String(stop.id), stop]))
  const museumById = new Map(
    (tourMuseums?.docs ?? []).map((museum) => [String(museum.id), museum as Museum]),
  )

  const items = new Map<string, NavigatorSearchItem>()
  for (const tour of tourDocs) {
    const museum = museumById.get(idOf(tour.museum) ?? '')
    items.set(`tours:${tour.id}`, tourItem(tour, stopById, museum, tourPictures, locale))
  }
  for (const content of contentDocs) {
    items.set(`contents:${content.id}`, {
      kind: 'content',
      key: `content:${content.id}`,
      title: content.title,
      href: `/${locale}/content/${content.id}`,
      seconds: content.durationSeconds ?? undefined,
      difficulty: content.difficulty,
      priceCents: content.price && content.price > 0 ? content.price : undefined,
      imageUrl: pictureOf(contentPictures, content.images?.[0]),
    })
  }
  for (const museum of museumDocs) {
    items.set(`museums:${museum.id}`, {
      kind: 'museum',
      key: `museum:${museum.id}`,
      title: museum.name,
      href: `/${locale}/museum/${museum.id}`,
      subtitle: museum.shortDescription ?? undefined,
      city: museum.location?.city ?? undefined,
      point: pointOf(museum),
      imageUrl: pictureOf(museumPictures, museum.thumbnails?.[0]),
      color: museumAccent(museum.palette) ?? undefined,
    })
  }
  for (const object of objectDocs) {
    items.set(`objects:${object.id}`, {
      kind: 'object',
      key: `object:${object.id}`,
      title: object.name,
      // The work's page, which leads to it on the map.
      href: `/${locale}/object/${object.id}`,
      subtitle: object.artist ?? undefined,
      imageUrl: pictureOf(objectPictures, object.thumbnail),
      // The index carries the work's city (its museum's): no extra read.
      city: hits.find((hit) => hit.collection === 'objects' && hit.sourceId === String(object.id))
        ?.city,
    })
  }

  return hits.flatMap((hit) => {
    const item = items.get(`${hit.collection}:${hit.sourceId}`)
    return item ? [item] : []
  })
}

/**
 * The navigator's search scope. In global mode a visitor can go and see tours
 * (the main way to use the app), contents and museums; objects stay reachable
 * from QR codes and museum pages. With a museum selected, only that museum's
 * tours, contents and objects are meaningful, so museums and people drop out.
 */
function navigatorKinds(museumId: string | null): SearchHit['kind'][] {
  return museumId ? ['tour', 'content', 'object'] : ['tour', 'content', 'museum']
}

/**
 * Browser-facing search for the home dropdown (`NavigatorSearch`), backed by
 * Typesense. The marketplace is server-rendered and reads the
 * same collection directly. The home needs an endpoint because its combobox
 * queries as the visitor types; this route keeps every search key on the
 * server and returns only display fields.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = (url.searchParams.get('q') ?? '').trim()
  // The client always sends a supported locale. The value is not validated
  // here: an unknown code would only produce hrefs pointing at a route that
  // does not exist, never a different document.
  const locale = (url.searchParams.get('locale') || 'en') as TypedLocale
  const limitParam = Number(url.searchParams.get('limit') || 8)
  const limit = Math.min(20, Math.max(1, Number.isFinite(limitParam) ? limitParam : 8))

  try {
    // The museum-mode cookie does not need the search: resolve it together
    // with Payload.
    const [payload, museumId, viewer] = await Promise.all([
      getPayload({ config }),
      museumSearchMuseumId(),
      asViewer(),
    ])

    // A Typesense failure is not hidden: it reaches the catch below, which
    // answers 500 and lets the dropdown show its error state (no Payload
    // fallback with a different, silently worse result set).
    const { hits } = await searchItems({
      q: query,
      kinds: navigatorKinds(museumId),
      museumId,
      page: 1,
      // Rank a larger pool, then keep `limit`: an exact city match may rank
      // below the priority-ordered rows.
      limit: Math.max(limit, RANK_POOL),
    })

    // Exact city matches come first, then title matches, then the rest;
    // within each band Typesense's relevance and priority order is kept
    // (Array#sort is stable).
    const needle = query.toLowerCase()
    const score = (hit: SearchHit) => {
      if (!needle) return 0
      const city = hit.city.toLowerCase()
      const title = hit.title.toLowerCase()
      if (city === needle) return 3
      if (title.includes(needle)) return 2
      if (city.includes(needle)) return 1
      return 0
    }
    const rankedHits = hits.toSorted((a, b) => score(b) - score(a)).slice(0, limit)

    const items = await hydrateNavigatorHits({ payload, locale, hits: rankedHits, viewer })
    return Response.json({ items })
  } catch (error) {
    console.error('[search] navigator search failed', error)
    return Response.json({ error: 'Search is unavailable.' }, { status: 500 })
  }
}
