import type { Metadata } from 'next'
import config from '@/payload.config'
import { SearchShell } from '@/components/mantine/SearchShell'
import { ToursSearchResults } from '@/components/mantine/ToursSearchResults'
import { getT } from '@/i18n.server'
import { activeFiltersToWhere, parseFilterSearchParams } from '@/lib/searchFilters'
import { SearchHeading } from '@/components/mantine/SearchHeading'
import { resolveSearchScopes, scopeParams } from '@/lib/search-scope'
import { Container, Stack } from '@mantine/core'
import type { FilterDefinition } from 'mantine-composite-filters'
import { getPayload } from 'payload'
import { museumScope } from '@/lib/museum-mode'
import { findListedTours } from '@/lib/listed-tours'

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
  // Independent setup reads: started together; the URL scopes (`?at=`,
  // `?author=`, `?subject=`, a "See all" link's list) as soon as Payload is up.
  const payloadReady = getPayload({ config })
  const setup = Promise.all([payloadReady, museumScope()])
  const scoping = payloadReady.then((payload) =>
    resolveSearchScopes(payload, 'tours', searchParams, lng),
  )
  // `t` on its own statement, so `i18next-cli extract` sees its namespace;
  // the reads above were started first and keep loading meanwhile.
  const { t } = await getT('search')
  const [payload, scope] = await setup

  const definitions: FilterDefinition[] = [
    {
      key: 'title',
      label: t('Title'),
      type: 'text',
      operators: ['contains', 'starts_with', 'ends_with', '='],
    },
    {
      key: 'description',
      label: t('Description'),
      type: 'text',
      operators: ['contains', 'starts_with', 'ends_with', '='],
    },
  ]
  const initialFilters = parseFilterSearchParams(searchParams, definitions)
  const pageParam = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page
  const page = Math.max(1, Number(pageParam) || 1)

  const { where: scopeWhere, scopes } = await scoping
  // As the visitor and without one visitor's own tours (`findListedTours`).
  const result = await findListedTours(payload, {
    where: {
      and: [
        activeFiltersToWhere(initialFilters, definitions),
        // Museum mode: only the locked museum's tours.
        ...(scope ? [{ museum: { equals: scope.museumId } }] : []),
        ...(scopeWhere ? [scopeWhere] : []),
      ],
    },
    page,
    limit: PAGE_SIZE,
    depth: 1,
  })

  return (
    // Desktop (≥ md): the page sits in the shared `lg` container (≤ 1140px,
    // centered) so title, filter and the 3-column grid stop stretching across
    // wide screens. Below md the padding equals the old side margins: no change.
    <Container component="main" size="lg" px={{ base: 'md', sm: 'xl' }} mt="sm">
      <Stack>
        <SearchHeading
          title={t('Search visits')}
          total={result.totalDocs}
          scopes={scopes}
          filtered={initialFilters.length > 0}
          basePath={basePath}
          searchParams={searchParams}
        />
        <SearchShell
          definitions={definitions}
          initialFilters={initialFilters}
          page={result.page ?? page}
          totalPages={result.totalPages ?? 1}
          basePath={basePath}
          storageKeyPrefix="search-tours"
          placeholder={t('Filter visits…')}
          keepParams={scopeParams(scopes)}
        >
          <ToursSearchResults tours={result.docs} lng={lng} />
        </SearchShell>
      </Stack>
    </Container>
  )
}
