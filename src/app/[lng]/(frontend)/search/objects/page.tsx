import config from '@/payload.config'
import { ObjectsSearchResults } from '@/components/mantine/ObjectsSearchResults'
import { SearchShell } from '@/components/mantine/SearchShell'
import { getT } from '@/i18n.server'
import { activeFiltersToWhere, parseFilterSearchParams } from '@/lib/searchFilters'
import { Stack, Title } from '@mantine/core'
import type { FilterDefinition } from 'mantine-composite-filters'
import { getPayload } from 'payload'
import { museumScope } from '@/lib/museum-mode'

const PAGE_SIZE = 12

export default async function SearchObjectsPage(props: {
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
      key: 'name',
      label: t('Name'),
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
    collection: 'objects',
    // Museum mode: only the locked museum's objects.
    where: scope
      ? {
          and: [activeFiltersToWhere(initialFilters, definitions), { id: { in: scope.objectIds } }],
        }
      : activeFiltersToWhere(initialFilters, definitions),
    page,
    limit: PAGE_SIZE,
    depth: 1,
  })

  return (
    <Stack mx={{ base: 'md', sm: 'xl' }} mt="sm">
      <Title order={2}>{t('Search objects')}</Title>
      <SearchShell
        definitions={definitions}
        initialFilters={initialFilters}
        page={result.page ?? page}
        totalPages={result.totalPages ?? 1}
        basePath={`/${lng}/search/objects`}
        storageKeyPrefix="search-objects"
        placeholder={t('Filter objects...')}
      >
        <ObjectsSearchResults objects={result.docs} lng={lng} />
      </SearchShell>
    </Stack>
  )
}
