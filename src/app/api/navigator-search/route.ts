import config from '@/payload.config'
import { museumSearchRestriction } from '@/lib/museum-mode'
import type { SearchDocKind } from '@/lib/search-index'
import { NAVIGATOR_SEARCH_KINDS, querySearchIndex, type SearchHit } from '@/lib/search-query'
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
}

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 }

/** How many index rows are ranked before keeping `limit` (see GET). */
const RANK_POOL = 40

/** Museum mode: what the selected museum holds, without the museum itself. */
const MUSEUM_MODE_KINDS: SearchDocKind[] = ['tour', 'content', 'object']

function joinParts(...parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ')
}

const idOf = (value: unknown) =>
  typeof value === 'string' ? value : (value as { id?: string } | null)?.id

/**
 * The search index is English-only so matching stays stable. Hydrate the
 * result page with the visitor's locale before returning it: titles read like
 * the rest of the localized site, and the details come from the documents.
 */
async function hydrateNavigatorHits({
  payload,
  locale,
  hits,
}: {
  payload: Payload
  locale: TypedLocale
  hits: SearchHit[]
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
          overrideAccess: true,
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
          select: { name: true, artist: true },
          locale,
          depth: 0,
          pagination: false,
          overrideAccess: true,
        })
      : null,
  ])

  // Tours' details come from their contents and museum: one read each.
  const tourDocs = (tours?.docs ?? []) as Tour[]
  const stopIds = [...new Set(tourDocs.flatMap((tour) => tour.contents.map(idOf)))].filter(
    (id): id is string => Boolean(id),
  )
  const tourMuseumIds = [...new Set(tourDocs.map((tour) => idOf(tour.museum)))].filter(
    (id): id is string => Boolean(id),
  )
  const [stops, tourMuseums] = await Promise.all([
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
  ])
  const stopById = new Map((stops?.docs ?? []).map((stop) => [String(stop.id), stop]))
  const museumById = new Map(
    (tourMuseums?.docs ?? []).map((museum) => [String(museum.id), museum as Museum]),
  )

  const items = new Map<string, NavigatorSearchItem>()
  for (const tour of tourDocs) {
    const own = tour.contents.map((content) => stopById.get(idOf(content) ?? '')).filter(Boolean)
    const length = own.reduce((sum, stop) => sum + (stop?.durationSeconds ?? 0), 0)
    const hardest = own.reduce<Difficulty | undefined>((top, stop) => {
      const difficulty = stop?.difficulty
      return difficulty && (!top || DIFFICULTY_RANK[difficulty] > DIFFICULTY_RANK[top])
        ? difficulty
        : top
    }, undefined)
    const museum = museumById.get(idOf(tour.museum) ?? '')
    items.set(`tours:${tour.id}`, {
      kind: 'tour',
      key: `tour:${tour.id}`,
      title: tour.title,
      href: `/${locale}/tour/${tour.id}`,
      subtitle: joinParts(museum?.name, museum?.location?.city) || undefined,
      seconds: tour.durationMinutes ? tour.durationMinutes * 60 : length || undefined,
      difficulty: hardest,
      stops: tour.contents.length,
    })
  }
  for (const content of (contents?.docs ?? []) as Content[]) {
    items.set(`contents:${content.id}`, {
      kind: 'content',
      key: `content:${content.id}`,
      title: content.title,
      href: `/${locale}/content/${content.id}`,
      seconds: content.durationSeconds ?? undefined,
      difficulty: content.difficulty,
      priceCents: content.price && content.price > 0 ? content.price : undefined,
    })
  }
  for (const museum of (museums?.docs ?? []) as Museum[]) {
    items.set(`museums:${museum.id}`, {
      kind: 'museum',
      key: `museum:${museum.id}`,
      title: museum.name,
      href: `/${locale}/museum/${museum.id}`,
      subtitle: museum.shortDescription ?? undefined,
      city: museum.location?.city ?? undefined,
    })
  }
  for (const object of objects?.docs ?? []) {
    items.set(`objects:${object.id}`, {
      kind: 'object',
      key: `object:${object.id}`,
      title: object.name,
      // The work's page, which leads to it on the map.
      href: `/${locale}/object/${object.id}`,
      subtitle: object.artist ?? undefined,
    })
  }

  return hits.flatMap((hit) => {
    const item = items.get(`${hit.collection}:${hit.sourceId}`)
    return item ? [item] : []
  })
}

/**
 * Browser-facing search for the home dropdown (`NavigatorSearch`).
 *
 * Marketplace search is server-rendered and reads the same `search` collection
 * directly. The home needs an endpoint because its combobox queries as the
 * visitor types; this route keeps Payload access on the server and returns only
 * display fields. In museum mode only the locked museum, its tours and the
 * contents on its map are returned.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = (url.searchParams.get('q') ?? '').trim()
  const locale = (url.searchParams.get('locale') || 'en') as TypedLocale
  const limitParam = Number(url.searchParams.get('limit') || 8)
  const limit = Math.min(20, Math.max(1, Number.isFinite(limitParam) ? limitParam : 8))

  try {
    // The museum-mode restriction (cookie + reads) does not need the search:
    // resolve it together with Payload.
    const [payload, restrictTo] = await Promise.all([
      getPayload({ config }),
      museumSearchRestriction(),
    ])
    const { hits } = await querySearchIndex({
      payload,
      query,
      // Museum mode searches inside the selected museum: its tours, contents and
      // works, never the museum itself (already chosen, one tap away in the
      // switch). Works are results only there, where the visitor is in (or
      // headed to) that museum and looks for a work to find; globally a work
      // finds the tours and contents that show it (docs/search.md).
      kinds: restrictTo ? MUSEUM_MODE_KINDS : NAVIGATOR_SEARCH_KINDS,
      page: 1,
      // Rank a larger pool, then keep `limit`: taking `limit` rows by priority
      // first could drop an exact title match that ranks below them.
      limit: Math.max(limit, RANK_POOL),
      sort: ['-priority', '-sourceCreatedAt'],
      locale,
      restrictTo,
    })

    // Payload has no relevance score. When the visitor types, exact city
    // matches come first, then title matches, then everything else; within
    // each band the index priority (tours first) is kept (Array#sort is stable).
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
    const rankedHits = [...hits].sort((a, b) => score(b) - score(a)).slice(0, limit)

    const items = await hydrateNavigatorHits({ payload, locale, hits: rankedHits })
    return Response.json({ items })
  } catch (error) {
    console.error('[search] navigator search failed', error)
    return Response.json({ error: 'Search is unavailable.' }, { status: 500 })
  }
}
