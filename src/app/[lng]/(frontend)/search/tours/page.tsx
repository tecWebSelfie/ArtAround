import type { Metadata } from 'next'
import config from '@/payload.config'
import { EntitySearch } from '@/components/mantine/EntitySearch'
import { SearchHeading } from '@/components/mantine/SearchHeading'
import { SearchUnavailableAlert } from '@/components/mantine/SearchUnavailableAlert'
import { ToursSearchResults } from '@/components/mantine/ToursSearchResults'
import { getT } from '@/i18n.server'
import { museumSearchMuseumId } from '@/lib/museum-mode'
import { scopeParams, resolveSearchScopes } from '@/lib/search-scope'
import { docsInHitOrder } from '@/lib/search/hydrate'
import { searchItems } from '@/lib/search/query'
import type { SearchHit } from '@/lib/search/types'
import type { Tour } from '@/payload-types'
import { Container, Stack } from '@mantine/core'
import { getPayload, type TypedLocale } from 'payload'

const PAGE_SIZE = 12

/** The tab names the search. */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('search')
  return { title: t('Search visits') }
}

export default async function SearchToursPage(props: {
  params: Promise<{ lng: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { lng } = await props.params
  const searchParams = await props.searchParams
  const basePath = `/${lng}/search/tours`
  // Independent setup reads: started together, and the URL scopes (`?at=`,
  // `?author=`, `?subject=`: a "See all" link's list) as soon as Payload is up.
  const payloadReady = getPayload({ config })
  const setup = Promise.all([payloadReady, museumSearchMuseumId()])
  const scoping = payloadReady.then((payload) =>
    resolveSearchScopes(payload, 'tours', searchParams, lng),
  )
  // `t` on its own statement, so `i18next-cli extract` sees its namespace;
  // the reads above were started first and keep loading meanwhile.
  const { t } = await getT('search')
  const [payload, museumId] = await setup

  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value
  const query = (firstValue(searchParams.q) ?? '').trim()
  const page = Math.max(1, Number(firstValue(searchParams.page)) || 1)
  const { filters, scopes } = await scoping

  // Tours only: this page's own bar. Museum mode scopes it through `museum_id`,
  // a "See all" link through the URL scopes (`filters`).
  // No Payload fallback: an outage is shown, not replaced by other results.
  let hits: SearchHit[] = []
  let total = 0
  let searchFailed = false
  try {
    ;({ hits, total } = await searchItems({
      q: query,
      kinds: ['tour'],
      museumId,
      page,
      limit: PAGE_SIZE,
      queryBy: ['title', 'description', 'excerpt'],
      queryByWeights: '5,3,2',
      filterBy: filters,
    }))
  } catch (error) {
    console.error('[search] Typesense tours search failed', error)
    searchFailed = true
  }
  const tours = await docsInHitOrder<Tour>({
    payload,
    collection: 'tours',
    hits,
    locale: lng as TypedLocale,
  })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    // Desktop (≥ md): the page sits in the shared `lg` container (≤ 1140px,
    // centered) so title, search and the 3-column grid stop stretching across
    // wide screens. Below md the padding equals the old side margins: no change.
    <Container component="main" size="lg" px={{ base: 'md', sm: 'xl' }} mt="sm">
      <Stack>
        <SearchHeading
          title={t('Search visits')}
          total={total}
          scopes={scopes}
          // This page has no composite filters: only a scope narrows it.
          filtered={false}
          basePath={basePath}
          searchParams={searchParams}
        />
        <EntitySearch
          basePath={basePath}
          initialQuery={query}
          page={page}
          totalPages={searchFailed ? 1 : totalPages}
          placeholder={t('Search visits…')}
          labels={{ search: t('Search') }}
          // The search box and the pager keep the "See all" scope.
          keepParams={scopeParams(scopes)}
        />
        {searchFailed ? (
          <SearchUnavailableAlert message={t('Search is not reachable right now.')} />
        ) : (
          <ToursSearchResults tours={tours} lng={lng} />
        )}
      </Stack>
    </Container>
  )
}
