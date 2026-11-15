import config from '@/payload.config'
import { museumSearchMuseumId } from '@/lib/museum-mode'
import { fallbackSearchItems, searchItems } from '@/lib/search/query'
import type { SearchHit } from '@/lib/search/types'
import type { Content, Difficulty, Museum, Object as ArtObject, Tour } from '@/payload-types'
import { getPayload, type Payload, type TypedLocale } from 'payload'

/**
 * One home-search result, with only what the dropdown shows. Tours and
 * contents carry the essentials for choosing one at a glance: time and
 * difficulty (and, for a tour, its stops; for a paid content, its price).
 * Objects appear when the app is locked to a museum.
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

/** How many index hits are ranked before keeping `limit` (see GET). */
const RANK_POOL = 40

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
  const find = <T extends 'tours' | 'contents' | 'museums' | 'objects'>(
    collection: T,
    ids: string[],
  ) =>
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

  const [tours, contents, museums, objects] = await Promise.all([
    find('tours', idsOf('tours')),
    find('contents', idsOf('contents')),
    find('museums', idsOf('museums')),
    find('objects', idsOf('objects')),
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
  for (const object of (objects?.docs ?? []) as ArtObject[]) {
    items.set(`objects:${object.id}`, {
      kind: 'object',
      key: `object:${object.id}`,
      title: object.name,
      href: `/${locale}/object/${object.id}`,
      subtitle: object.artist ?? undefined,
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
 * Typesense (`search_items`). The marketplace is server-rendered and reads the
 * same collection directly. The home needs an endpoint because its combobox
 * queries as the visitor types; this route keeps every search key on the
 * server and returns only display fields.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = (url.searchParams.get('q') ?? '').trim()
  const locale = (url.searchParams.get('locale') || 'en') as TypedLocale
  const limitParam = Number(url.searchParams.get('limit') || 8)
  const limit = Math.min(20, Math.max(1, Number.isFinite(limitParam) ? limitParam : 8))

  try {
    // The museum-mode cookie does not need the search: resolve it together
    // with Payload.
    const [payload, museumId] = await Promise.all([getPayload({ config }), museumSearchMuseumId()])

    let hits: SearchHit[]
    try {
      const result = await searchItems({
        q: query,
        kinds: navigatorKinds(museumId),
        museumId,
        page: 1,
        // Rank a larger pool, then keep `limit`: an exact city match may rank
        // below the priority-ordered rows.
        limit: Math.max(limit, RANK_POOL),
      })
      hits = result.hits
    } catch (error) {
      // Typesense unreachable: keep the dropdown working with a degraded read.
      console.error('[search] Typesense navigator search failed, falling back', error)
      const result = await fallbackSearchItems({
        payload,
        q: query,
        kinds: navigatorKinds(museumId),
        museumId,
        limit: Math.max(limit, RANK_POOL),
      })
      hits = result.hits
    }

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
    const rankedHits = [...hits].sort((a, b) => score(b) - score(a)).slice(0, limit)

    const items = await hydrateNavigatorHits({ payload, locale, hits: rankedHits })
    return Response.json({ items })
  } catch (error) {
    console.error('[search] navigator search failed', error)
    return Response.json({ error: 'Search is unavailable.' }, { status: 500 })
  }
}
