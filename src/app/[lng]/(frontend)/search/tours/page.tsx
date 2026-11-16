import type { Metadata } from 'next'
import config from '@/payload.config'
import { EntitySearch } from '@/components/mantine/EntitySearch'
import { SearchUnavailableAlert } from '@/components/mantine/SearchUnavailableAlert'
import { ToursSearchResults } from '@/components/mantine/ToursSearchResults'
import { getT } from '@/i18n.server'
import { docsInHitOrder } from '@/lib/search/hydrate'
import { authorSourceFilter } from '@/lib/search/author-filter'
import { searchItems } from '@/lib/search/query'
import type { SearchHit } from '@/lib/search/types'
import type { Tour } from '@/payload-types'
import { Container, Stack, Title } from '@mantine/core'
import { getPayload, type TypedLocale } from 'payload'
import { museumSearchMuseumId } from '@/lib/museum-mode'

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
  // Independent setup reads: started together.
  const setup = Promise.all([getPayload({ config }), museumSearchMuseumId()])
  // `t` on its own statement, so `i18next-cli extract` sees its namespace;
  // the reads above were started first and keep loading meanwhile.
  const { t } = await getT('search')
  const [payload, museumId] = await setup

  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value
  const query = (firstValue(searchParams.q) ?? '').trim()
  const page = Math.max(1, Number(firstValue(searchParams.page)) || 1)
  const authorId = firstValue(searchParams.author)

  // Tours only: museum mode scopes through `museum_id`, while profile links
  // additionally narrow to their author. No Payload results fallback on outage.
  let hits: SearchHit[] = []
  let total = 0
  let searchFailed = false
  try {
    const authorFilter = await authorSourceFilter(payload, 'tours', authorId)
    if (authorFilter.kind !== 'empty') {
      ;({ hits, total } = await searchItems({
        q: query,
        kinds: ['tour'],
        museumId,
        page,
        limit: PAGE_SIZE,
        queryBy: ['title', 'description', 'excerpt'],
        queryByWeights: '5,3,2',
        filterBy: authorFilter.kind === 'filter' ? [authorFilter.value] : undefined,
      }))
    }
  } catch (error) {
    console.error('[search] Tours search failed', error)
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
        <Title order={1} size="h2">
          {t('Search visits')}
        </Title>
        <EntitySearch
          basePath={`/${lng}/search/tours`}
          initialQuery={query}
          page={page}
          totalPages={searchFailed ? 1 : totalPages}
          placeholder={t('Search visits…')}
          labels={{ search: t('Search') }}
          keepParams={authorId ? { author: authorId } : undefined}
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
