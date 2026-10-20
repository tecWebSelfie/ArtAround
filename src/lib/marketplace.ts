import type { MarketplaceItem } from '@/components/mantine/MarketplaceCard'
import type { MarketplaceKind, MarketplacePrice } from '@/components/mantine/MarketplaceControls'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import { PRICE_CURRENCY } from '@/lib/price'
import { querySearchIndex, type SearchHit } from '@/lib/search-query'
import type { SearchDocKind } from '@/lib/search-index'
import type {
  Content,
  ContentImage,
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

function mapTour(tour: Tour): MarketplaceItem {
  const thumbnail = isPopulated<ToursThumbnail>(tour.thumbnail) ? tour.thumbnail : null
  return {
    key: `tour:${tour.id}`,
    kind: 'tour',
    id: tour.id,
    title: tour.title,
    description: tour.description,
    imageUrl: thumbnail?.url,
    imageAlt: thumbnail?.alt,
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
  return {
    key: `content:${content.id}`,
    kind: 'content',
    id: content.id,
    title: content.title,
    imageUrl: thumbnail?.url,
    imageAlt: thumbnail?.alt,
    priceCents: content.price ?? 0,
    currency: PRICE_CURRENCY,
    createdAt: content.createdAt,
    difficulty: content.difficulty,
    readingTimeMins: content.readingTimeMins,
  }
}

function mapUser(user: User): MarketplaceItem {
  const avatar = isPopulated<UsersPropic>(user.avatar) ? user.avatar : null
  const fullName =
    user.name?.fullName ||
    [user.name?.firstName, user.name?.lastName].filter(Boolean).join(' ').trim() ||
    user.username
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

/**
 * Which indexed kinds the marketplace searches for a given filter combination.
 *
 * Users are only included in "all" when there is an actual text query, so the
 * default marketplace still reads as a catalog of things to visit/read. Price
 * filters apply only to tours and contents, which are the sellable documents.
 */
export function marketplaceKindsFor(
  kind: MarketplaceKind,
  price: MarketplacePrice,
  hasQuery: boolean,
): SearchDocKind[] {
  if (kind === 'tours') return ['tour']
  if (kind === 'contents') return ['content']
  if (kind === 'users') return ['user']
  if (price !== 'all') return ['tour', 'content']
  return hasQuery ? ['tour', 'content', 'user'] : ['tour', 'content']
}

/**
 * Hydrates search rows with localized Payload documents.
 *
 * The search collection owns which documents match, their order and the
 * marketplace filters. Payload is the presentation source for translated
 * titles, prices, images and profile data.
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
  }

  for (const hit of hits) {
    if (hit.collection === 'tours' || hit.collection === 'contents' || hit.collection === 'users') {
      idsByCollection[hit.collection].push(hit.sourceId)
    }
  }

  const [toursResult, contentsResult, usersResult] = await Promise.all([
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

  return hits
    .map((hit) => byKey.get(`${hit.collection}:${hit.sourceId}`))
    .filter((item): item is MarketplaceItem => item !== undefined)
}

/**
 * Marketplace listing is backed by the Payload search collection.
 *
 * Empty-query browsing uses the same index (`where` without a text condition),
 * so the displayed set cannot diverge between browsing and searching.
 */
export async function getMarketplaceResults(options: {
  payload: Payload
  locale: TypedLocale
  query: string
  kind: MarketplaceKind
  price: MarketplacePrice
  page: number
}): Promise<MarketplaceResults> {
  const { payload, locale, query, kind, price, page } = options

  const result = await querySearchIndex({
    payload,
    query,
    kinds: marketplaceKindsFor(kind, price, Boolean(query.trim())),
    price: kind === 'users' ? 'all' : price,
    page,
    limit: MARKETPLACE_PAGE_SIZE,
    sort: '-sourceCreatedAt',
    locale,
  })

  const items = await hydrateSearchHits({ payload, locale, hits: result.hits })
  return { items, total: result.total }
}
