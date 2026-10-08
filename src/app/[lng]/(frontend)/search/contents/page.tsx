import { ContentsSearchResults } from '@/components/mantine/ContentsSearchResults';
import { SearchShell } from '@/components/mantine/SearchShell';
import { getT } from '@/i18n.server';
import { activeFiltersToWhere, parseFilterSearchParams } from '@/lib/searchFilters';
import config from '@/payload.config';
import { Stack, Title } from '@mantine/core';
import type { FilterDefinition } from 'mantine-composite-filters';
import { getPayload } from 'payload';

const PAGE_SIZE = 12

export default async function SearchContentsPage(props: {
  params: Promise<{ lng: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { lng } = await props.params
  const searchParams = await props.searchParams
  const { t } = await getT('search')
  const { t: tCard } = await getT('contents-carousel-card')
  const payload = await getPayload({ config })

  const definitions: FilterDefinition[] = [
    {
      key: 'title',
      label: t('Title'),
      type: 'text',
      operators: ['contains', 'starts_with', 'ends_with', '='],
    },
    {
      key: 'difficulty',
      label: t('Difficulty'),
      type: 'select',
      operators: ['='],
      options: [
        { value: 'easy', label: tCard('Easy') },
        { value: 'medium', label: tCard('Medium') },
        { value: 'hard', label: tCard('Hard') },
      ],
    },
    {
      key: 'readingTimeMins',
      label: t('Reading time'),
      type: 'number',
      operators: ['=', '!=', '>', '<', '>=', '<='],
    },
  ]
  const initialFilters = parseFilterSearchParams(searchParams, definitions)
  const pageParam = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page
  const page = Math.max(1, Number(pageParam) || 1)

  const result = await payload.find({
    collection: 'contents',
    where: activeFiltersToWhere(initialFilters, definitions),
    page,
    limit: PAGE_SIZE,
    depth: 1,
  })

  return (
    <Stack mx={{ base: 'md', sm: 'xl' }} mt="sm">
      <Title order={2}>{t('Search contents')}</Title>
      <SearchShell
        definitions={definitions}
        initialFilters={initialFilters}
        page={result.page ?? page}
        totalPages={result.totalPages ?? 1}
        basePath={`/${lng}/search/contents`}
        storageKeyPrefix="search-contents"
        placeholder={t('Filter contents...')}
      >
        <ContentsSearchResults contents={result.docs} />
      </SearchShell>
    </Stack>
  )
}
