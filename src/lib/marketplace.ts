import { displayName } from '@/lib/display-name'
import type { MarketplaceItem } from '@/components/mantine/MarketplaceCard'
import type { MarketplaceKind, MarketplacePrice } from '@/components/mantine/MarketplaceControls'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import { PRICE_CURRENCY } from '@/lib/price'
import { withVisitableStops } from '@/lib/tour-summary'
import { searchItems } from '@/lib/search/query'
import type { SearchDocKind, SearchHit } from '@/lib/search/types'
import type {
  Content,
  ContentImage,
  Museum,
  Object as ArtObject,
  ObjectsThumbnail,
  Tour,
  ToursThumbnail,
  User,
  UsersPropic,
} from '@/payload-types'
import type { Payload, TypedLocale } from 'payload'

export const MARKETPLACE_PAGE_SIZE = 12

export type MarketplaceResults = {
  items: MarketplaceItem[]
  total: number
}

function mapTour(source: Tour): MarketplaceItem {
  // Only the stops a visitor can visit count towards the list price.
  const tour = withVisitableStops(source)
  const thumbnail = isPopulated<ToursThumbnail>(tour.thumbnail) ? tour.thumbnail : null
  // Context for choosing (DESIGN.md → Marketplace results): the card shows
  // where the tour runs and who made it. Both relationships are populated by
  // the hydrating read (depth 1), so no extra query is needed.
  const museum = isPopulated<Museum>(tour.museum) ? tour.museum : null
  const author = isPopulated<User>(tour.author) ? tour.author : null
  return {
    key: `tour:${tour.id}`,
    kind: 'tour',
    id: tour.id,
    title: tour.title,
    description: tour.description,
    imageUrl: thumbnail?.url,
    imageAlt: thumbnail?.alt,
    museumName: museum?.name,
    authorName: author ? displayName(author) : null,
    // List price: a tour costs its paid contents (src/lib/price.ts). What a
    // given visitor pays can be less; the tour page shows that amount.
    priceCents: filterPopulated<Content>(tour.contents).reduce(
      (sum, content) => sum + (content.price ?? 0),
      0,
    ),
    currency: PRICE_CURRENCY,
    createdAt: tour.createdAt,
    durationMinutes: tour.durationMinutes,
  }
}

function mapContent(content: Content): MarketplaceItem {
  const thumbnail = filterPopulated<ContentImage>(content.images)[0] ?? null
  // A content has no museum of its own (its objects do), and reaching it would
  // need a deeper read; the author is the context that costs nothing.
  const author = isPopulated<User>(content.author) ? content.author : null
  return {
    key: `content:${content.id}`,
    kind: 'content',
    id: content.id,
    title: content.title,
    imageUrl: thumbnail?.url,
    imageAlt: thumbnail?.alt,
    authorName: author ? displayName(author) : null,
    priceCents: content.price ?? 0,
    currency: PRICE_CURRENCY,
    createdAt: content.createdAt,
    difficulty: content.difficulty,
    durationSeconds: content.durationSeconds,
  }
}

function mapUser(user: User): MarketplaceItem {
  const avatar = isPopulated<UsersPropic>(user.avatar) ? user.avatar : null
  const fullName = displayName(user)
  return {
    key: `user:${user.id}`,
    kind: 'user',
    id: user.id,
    title: fullName,
    // `description` is the short public blurb; `bio` can contain the generic
    // onboarding placeholder, so prefer the blurb when both exist.
    description: user.description || user.bio || null,
    imageUrl: avatar?.url ?? null,
    imageAlt: avatar?.alt ?? fullName,
    createdAt: user.createdAt,
    username: user.username,
  }
}

function mapObject(object: ArtObject): MarketplaceItem {
  const thumbnail = isPopulated<ObjectsThumbnail>(object.thumbnail) ? object.thumbnail : null
  // Objects are shown in their museums; the join's first populated doc is the
  // museum (an object can be on show in more than one, the card shows one).
  const museum = filterPopulated<Museum>(object.museums?.docs)[0] ?? null
  return {
    key: `object:${object.id}`,
    kind: 'object',
    id: object.id,
    title: object.name,
    description: object.description,
    imageUrl: thumbnail?.url,
    imageAlt: thumbnail?.alt ?? object.name,
    museumName: museum?.name,
    createdAt: object.createdAt,
    artist: object.artist,
  }
}

/**
 * Which indexed kinds the marketplace searches for a given filter combination.
 *
 * Searchable things are tours, contents and objects; people join the default
 * catalog only when there is an actual text query, so browsing still reads as
 * a catalog of what to visit and read. Price filters apply only to tours and
 * contents, the sellable documents.
 */
export function marketplaceKindsFor(
  kind: MarketplaceKind,
  price: MarketplacePrice,
  hasQuery: boolean,
): SearchDocKind[] {
  if (kind === 'tours') return ['tour']
  if (kind === 'contents') return ['content']
  if (kind === 'objects') return ['object']
  if (kind === 'users') return ['user']
  if (price !== 'all') return ['tour', 'content']
  return hasQuery ? ['tour', 'content', 'object', 'user'] : ['tour', 'content', 'object']
}

/**
 * Hydrates search hits with localized Payload documents.
 *
 * Typesense owns which documents match, their order and the filters; Payload
 * is the presentation source for translated titles, prices, images and
 * profile data.
 */
async function hydrateSearchHits({
  payload,
  locale,
  hits,
}: {
  payload: Payload
  locale: TypedLocale
  hits: SearchHit[]
}) {
  const idsByCollection = {
    tours: [] as string[],
    contents: [] as string[],
    users: [] as string[],
    objects: [] as string[],
  }

  for (const hit of hits) {
    if (hit.collection in idsByCollection) {
      idsByCollection[hit.collection as keyof typeof idsByCollection].push(hit.sourceId)
    }
  }

  const [toursResult, contentsResult, usersResult, objectsResult] = await Promise.all([
    idsByCollection.tours.length > 0
      ? payload.find({
          collection: 'tours',
          where: { id: { in: idsByCollection.tours } },
          locale,
          depth: 1,
          limit: idsByCollection.tours.length,
        })
      : Promise.resolve(null),
    idsByCollection.contents.length > 0
      ? payload.find({
          collection: 'contents',
          where: { id: { in: idsByCollection.contents } },
          locale,
          depth: 1,
          limit: idsByCollection.contents.length,
        })
      : Promise.resolve(null),
    idsByCollection.users.length > 0
      ? payload.find({
          collection: 'users',
          where: { id: { in: idsByCollection.users } },
          locale,
          depth: 1,
          limit: idsByCollection.users.length,
          // Marketplace profiles are public directory entries. Read with
          // overrideAccess on the server and expose only mapped card fields.
          overrideAccess: true,
        })
      : Promise.resolve(null),
    idsByCollection.objects.length > 0
      ? payload.find({
          collection: 'objects',
          where: { id: { in: idsByCollection.objects } },
          locale,
          depth: 1,
          limit: idsByCollection.objects.length,
        })
      : Promise.resolve(null),
  ])

  const byKey = new Map<string, MarketplaceItem>()
  for (const tour of toursResult?.docs ?? []) {
    byKey.set(`tours:${tour.id}`, mapTour(tour))
  }
  for (const content of contentsResult?.docs ?? []) {
    byKey.set(`contents:${content.id}`, mapContent(content))
  }
  for (const user of usersResult?.docs ?? []) {
    byKey.set(`users:${user.id}`, mapUser(user))
  }
  for (const object of objectsResult?.docs ?? []) {
    byKey.set(`objects:${object.id}`, mapObject(object))
  }

  return hits
    .map((hit) => byKey.get(`${hit.collection}:${hit.sourceId}`))
    .filter((item): item is MarketplaceItem => item !== undefined)
}

/**
 * Marketplace listing is backed by the Typesense search collection.
 *
 * Empty-query browsing uses the same index (a wildcard query), so the displayed
 * set cannot diverge between browsing and searching. In museum mode every kind
 * is scoped to the locked museum through `museum_id`.
 *
 * A cluster failure is thrown to the page, which renders the "search not
 * reachable" state: there is no Payload fallback.
 */
export async function getMarketplaceResults(options: {
  payload: Payload
  locale: TypedLocale
  query: string
  kind: MarketplaceKind
  price: MarketplacePrice
  page: number
  /** Museum mode: only documents belonging to this museum. */
  museumId?: string | null
}): Promise<MarketplaceResults> {
  const { payload, locale, query, kind, price, page, museumId } = options
  const kinds = marketplaceKindsFor(kind, price, Boolean(query.trim()))
  const effectivePrice = kind === 'users' || kind === 'objects' ? 'all' : price

  const result = await searchItems({
    q: query,
    kinds,
    price: effectivePrice,
    page,
    limit: MARKETPLACE_PAGE_SIZE,
    museumId,
  })

  const items = await hydrateSearchHits({ payload, locale, hits: result.hits })
  return { items, total: result.total }
}
