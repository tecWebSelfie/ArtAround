import type { Metadata } from 'next'
import config from '@/payload.config'
import { SearchShell } from '@/components/mantine/SearchShell'
import { ToursSearchResults } from '@/components/mantine/ToursSearchResults'
import { getT } from '@/i18n.server'
import { activeFiltersToWhere, parseFilterSearchParams } from '@/lib/searchFilters'
import { Container, Stack, Title } from '@mantine/core'
import type { FilterDefinition } from 'mantine-composite-filters'
import { getPayload } from 'payload'
import { museumScope } from '@/lib/museum-mode'
import { asViewer } from '@/lib/session'
import { LISTED_TOURS } from '@/lib/visibility'

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
  const setup = Promise.all([getPayload({ config }), museumScope(), asViewer()])
  // `t` on its own statement, so `i18next-cli extract` sees its namespace;
  // the reads above were started first and keep loading meanwhile.
  const { t } = await getT('search')
  const [payload, scope, viewer] = await setup

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

  const result = await payload.find({
    collection: 'tours',
    where: {
      and: [
        activeFiltersToWhere(initialFilters, definitions),
        // A list: never one visitor's own tours (planned visits, visit copies).
        LISTED_TOURS,
        // Museum mode: only the locked museum's tours.
        ...(scope ? [{ museum: { equals: scope.museumId } }] : []),
      ],
    },
    page,
    limit: PAGE_SIZE,
    depth: 1,
    // As the visitor: others' private tours stay out (`readTours`).
    ...viewer,
  })

  return (
    // Desktop (≥ md): the page sits in the shared `lg` container (≤ 1140px,
    // centered) so title, filter and the 3-column grid stop stretching across
    // wide screens. Below md the padding equals the old side margins: no change.
    <Container component="main" size="lg" px={{ base: 'md', sm: 'xl' }} mt="sm">
      <Stack>
        <Title order={1} size="h2">
          {t('Search visits')}
        </Title>
        <SearchShell
          definitions={definitions}
          initialFilters={initialFilters}
          page={result.page ?? page}
          totalPages={result.totalPages ?? 1}
          basePath={`/${lng}/search/tours`}
          storageKeyPrefix="search-tours"
          placeholder={t('Filter visits…')}
        >
          <ToursSearchResults tours={result.docs} lng={lng} />
        </SearchShell>
      </Stack>
    </Container>
  )
}
