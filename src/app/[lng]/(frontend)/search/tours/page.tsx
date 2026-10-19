import config from '@/payload.config'
import { SearchShell } from '@/components/mantine/SearchShell'
import { ToursSearchResults } from '@/components/mantine/ToursSearchResults'
import { getT } from '@/i18n.server'
import { activeFiltersToWhere, parseFilterSearchParams } from '@/lib/searchFilters'
import { Stack, Title } from '@mantine/core'
import type { FilterDefinition } from 'mantine-composite-filters'
import { getPayload } from 'payload'
import { museumScope } from '@/lib/museum-mode'

const PAGE_SIZE = 12

export default async function SearchToursPage(props: {
  params: Promise<{ lng: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { lng } = await props.params
  const searchParams = await props.searchParams
  const { t } = await getT('search')
  const payload = await getPayload({ config })
  const scope = await museumScope()

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
    // Museum mode: only the locked museum's tours.
    where: scope
      ? {
          and: [
            activeFiltersToWhere(initialFilters, definitions),
            { museum: { equals: scope.museumId } },
          ],
        }
      : activeFiltersToWhere(initialFilters, definitions),
    page,
    limit: PAGE_SIZE,
    depth: 1,
  })

  return (
    <Stack mx={{ base: 'md', sm: 'xl' }} mt="sm">
      <Title order={2}>{t('Search visits')}</Title>
      <SearchShell
        definitions={definitions}
        initialFilters={initialFilters}
        page={result.page ?? page}
        totalPages={result.totalPages ?? 1}
        basePath={`/${lng}/search/tours`}
        storageKeyPrefix="search-tours"
        placeholder={t('Filter visits...')}
      >
        <ToursSearchResults tours={result.docs} />
      </SearchShell>
    </Stack>
  )
}
