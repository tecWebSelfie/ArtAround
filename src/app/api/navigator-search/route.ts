import config from '@/payload.config'
import { NAVIGATOR_SEARCH_KINDS, querySearchIndex, type SearchHit } from '@/lib/search-query'
import type { Museum, Object as ArtObject, Tour, User } from '@/payload-types'
import { getPayload, type Payload, type TypedLocale } from 'payload'

export type NavigatorSearchItem = {
  kind: 'museum' | 'object' | 'tour' | 'user'
  key: string
  title: string
  href: string
  subtitle?: string
  city?: string
}

function joinParts(...parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ')
}

/**
 * The search index is English-only so matching stays stable. Hydrate the small
 * result page with the visitor's locale before returning it to the combobox;
 * the dropdown should read like the rest of the localized site.
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
  const ids = {
    museums: [] as string[],
    objects: [] as string[],
    tours: [] as string[],
    users: [] as string[],
  }

  for (const hit of hits) {
    if (hit.kind === 'content') continue
    if (hit.collection === 'museums') ids.museums.push(hit.sourceId)
    else if (hit.collection === 'objects') ids.objects.push(hit.sourceId)
    else if (hit.collection === 'tours') ids.tours.push(hit.sourceId)
    else ids.users.push(hit.sourceId)
  }

  const [museums, objects, tours, users] = await Promise.all([
    ids.museums.length > 0
      ? payload.find({
          collection: 'museums',
          where: { id: { in: ids.museums } },
          locale,
          depth: 0,
          limit: ids.museums.length,
          overrideAccess: true,
        })
      : null,
    ids.objects.length > 0
      ? payload.find({
          collection: 'objects',
          where: { id: { in: ids.objects } },
          locale,
          depth: 0,
          limit: ids.objects.length,
          overrideAccess: true,
        })
      : null,
    ids.tours.length > 0
      ? payload.find({
          collection: 'tours',
          where: { id: { in: ids.tours } },
          locale,
          depth: 0,
          limit: ids.tours.length,
          overrideAccess: true,
        })
      : null,
    ids.users.length > 0
      ? payload.find({
          collection: 'users',
          where: { id: { in: ids.users } },
          locale,
          depth: 0,
          limit: ids.users.length,
          overrideAccess: true,
        })
      : null,
  ])

  const localized = new Map<string, { title: string; subtitle?: string; city?: string }>()
  for (const museum of (museums?.docs ?? []) as Museum[]) {
    const city = museum.location?.city ?? ''
    localized.set(`museums:${museum.id}`, {
      title: museum.name,
      subtitle: museum.shortDescription ?? undefined,
      city,
    })
  }
  for (const object of (objects?.docs ?? []) as ArtObject[]) {
    localized.set(`objects:${object.id}`, {
      title: object.name,
      subtitle: joinParts(object.artist, object.description),
    })
  }
  for (const tour of (tours?.docs ?? []) as Tour[]) {
    localized.set(`tours:${tour.id}`, {
      title: tour.title,
      subtitle: joinParts(tour.description),
    })
  }
  for (const user of (users?.docs ?? []) as User[]) {
    const name =
      user.name?.fullName ||
      [user.name?.firstName, user.name?.lastName].filter(Boolean).join(' ').trim() ||
      user.username
    localized.set(`users:${user.id}`, {
      title: name,
      subtitle: joinParts(user.username ? `@${user.username}` : undefined, user.description),
    })
  }

  return hits.flatMap((hit) => {
    if (hit.kind === 'content') return []
    const display = localized.get(`${hit.collection}:${hit.sourceId}`)
    const city = display?.city ?? hit.city
    return [
      {
        kind: hit.kind,
        key: `${hit.kind}:${hit.sourceId}`,
        title: display?.title || hit.title,
        href: `/${locale}/${hit.kind}/${hit.sourceId}`,
        subtitle: display?.subtitle || hit.excerpt || undefined,
        city: city || undefined,
      },
    ]
  })
}

/**
 * Browser-facing search for the navigator dropdown.
 *
 * Marketplace search is server-rendered and reads the same `search` collection
 * directly. The navigator needs an endpoint because its combobox queries as the
 * visitor types; this route keeps Payload access on the server (users are
 * otherwise RBAC-protected) and returns only the display fields the combobox
 * needs.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = (url.searchParams.get('q') ?? '').trim()
  const locale = (url.searchParams.get('locale') || 'en') as TypedLocale
  const limitParam = Number(url.searchParams.get('limit') || 8)
  const limit = Math.min(20, Math.max(1, Number.isFinite(limitParam) ? limitParam : 8))

  try {
    const payload = await getPayload({ config })
    const { hits } = await querySearchIndex({
      payload,
      query,
      kinds: NAVIGATOR_SEARCH_KINDS,
      page: 1,
      limit,
      // Higher-priority kinds (museums, then objects, tours, users) lead the
      // suggestions; newest documents break ties within a kind.
      sort: ['-priority', '-sourceCreatedAt'],
      locale,
    })

    // Payload has no relevance score. When the visitor types a city, put exact
    // city matches first, then title matches, while preserving the priority
    // order for everything else (Array#sort is stable).
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
    const rankedHits = [...hits].sort((a, b) => score(b) - score(a))

    const items = await hydrateNavigatorHits({ payload, locale, hits: rankedHits })
    return Response.json({ items })
  } catch (error) {
    console.error('[search] navigator search failed', error)
    return Response.json({ error: 'Search is unavailable.' }, { status: 500 })
  }
}
