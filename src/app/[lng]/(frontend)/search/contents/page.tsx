import { ContentsSearchResults } from '@/components/mantine/ContentsSearchResults'
import { SearchShell } from '@/components/mantine/SearchShell'
import { getT } from '@/i18n.server'
import { activeFiltersToWhere, parseFilterSearchParams } from '@/lib/searchFilters'
import config from '@/payload.config'
import { Stack, Title } from '@mantine/core'
import type { FilterDefinition } from 'mantine-composite-filters'
import { getPayload } from 'payload'
import { museumScope } from '@/lib/museum-mode'
import { LinkButton } from '@/components/editing/LinkButton'
import { getTourEditorData } from '../../tour/tour-editing'
import { backToTourHref, newStopHref, parseTourPicker, tourPickerParams } from '@/lib/tour-picker'
import type { Where } from 'payload'
import { Group, Text } from '@mantine/core'
import { ArrowLeft, PenLine } from 'lucide-react'
import type { Route } from 'next'

const PAGE_SIZE = 12

/**
 * Contents search. Two modes:
 * - plain search (museum mode limits it to the locked museum);
 * - tour picker (`?pick=tour&museum=…&returnTo=…`, from the tour editor's
 *   "Browse contents"): only the contents a tour of that museum can include
 *   (`getTourEditorData`), each card adding itself to the tour, plus "Write a
 *   new content" for a stop that doesn't exist yet. See `src/lib/tour-picker.ts`.
 */
export default async function SearchContentsPage(props: {
  params: Promise<{ lng: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { lng } = await props.params
  const searchParams = await props.searchParams
  const { t } = await getT('search')
  const { t: tCard } = await getT('contents-carousel-card')
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

  const picker = parseTourPicker(lng, searchParams)
  const editor = picker ? await getTourEditorData(picker.museumId) : null
  const filtersWhere = activeFiltersToWhere(initialFilters, definitions)
  // Picker: the museum's tour candidates; else museum mode's locked museum.
  const allowedIds = editor
    ? editor.candidates.map((candidate) => candidate.id)
    : (scope?.contentIds ?? null)
  const where: Where = allowedIds
    ? { and: [filtersWhere, { id: { in: allowedIds } }] }
    : filtersWhere

  const result =
    allowedIds?.length === 0
      ? { docs: [], page: 1, totalPages: 1 }
      : await payload.find({
          collection: 'contents',
          where,
          page,
          limit: PAGE_SIZE,
          depth: 1,
        })
  const lockedPrices = editor
    ? new Map(
        editor.candidates
          .filter((candidate) => candidate.locked)
          .map((candidate) => [candidate.id, candidate.price]),
      )
    : undefined

  return (
    <Stack mx={{ base: 'md', sm: 'xl' }} mt="sm">
      {picker && editor ? (
        <Stack gap="xs">
          <Title order={2}>{t('Add a stop')}</Title>
          <Text c="dimmed" size="sm">
            {t('Contents about the objects on show at {{museum}}', {
              museum: editor.museum.name,
            })}
          </Text>
          <Group gap="xs">
            <LinkButton
              href={backToTourHref(picker.returnTo) as Route}
              variant="default"
              leftSection={<ArrowLeft size={16} aria-hidden />}
            >
              {t('Back to the tour')}
            </LinkButton>
            {/* A stop that doesn't exist yet: write it, then it joins the tour. */}
            <LinkButton
              href={newStopHref(lng, picker) as Route}
              variant="light"
              color="teal"
              autoContrast
              leftSection={<PenLine size={16} aria-hidden />}
            >
              {t('Write a new content')}
            </LinkButton>
          </Group>
        </Stack>
      ) : (
        <Title order={2}>{t('Search contents')}</Title>
      )}
      <SearchShell
        definitions={definitions}
        initialFilters={initialFilters}
        page={result.page ?? page}
        totalPages={result.totalPages ?? 1}
        basePath={`/${lng}/search/contents`}
        storageKeyPrefix="search-contents"
        placeholder={t('Filter contents...')}
        keepParams={picker ? tourPickerParams(picker) : undefined}
      >
        <ContentsSearchResults contents={result.docs} picker={picker} lockedPrices={lockedPrices} />
      </SearchShell>
    </Stack>
  )
}
