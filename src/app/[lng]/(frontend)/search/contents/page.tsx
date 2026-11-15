import type { Metadata } from 'next'
import { ContentsSearchResults } from '@/components/mantine/ContentsSearchResults'
import { EntitySearch } from '@/components/mantine/EntitySearch'
import { SearchShell } from '@/components/mantine/SearchShell'
import { getT } from '@/i18n.server'
import { activeFiltersToWhere, parseFilterSearchParams } from '@/lib/searchFilters'
import config from '@/payload.config'
import { Container, Group, Stack, Text, Title } from '@mantine/core'
import type { FilterDefinition } from 'mantine-composite-filters'
import { getPayload, type TypedLocale } from 'payload'
import type { Where } from 'payload'
import { museumSearchMuseumId } from '@/lib/museum-mode'
import { LinkButton } from '@/components/editing/LinkButton'
import { getTourEditorData } from '../../tour/tour-editing'
import { backToTourHref, newStopHref, parseTourPicker, tourPickerParams } from '@/lib/tour-picker'
import { docsInHitOrder } from '@/lib/search/hydrate'
import { searchItemsWithFallback } from '@/lib/search/query'
import type { Content } from '@/payload-types'
import { ArrowLeft, PenLine } from 'lucide-react'
import type { Route } from 'next'

const PAGE_SIZE = 12

/**
 * Contents search. Two modes:
 * - plain search, backed by Typesense (`search_items`, contents only; museum
 *   mode limits it to the locked museum). The index holds titles and metadata,
 *   never a content body, so a paid text stays unsearchable;
 * - tour picker (`?pick=tour&museum=…&returnTo=…`, from the tour editor's
 *   "Browse contents"): only the contents a tour of that museum can include
 *   (`getTourEditorData`), each card adding itself to the tour, plus "Write a
 *   new content" for a stop that doesn't exist yet. It stays on Payload because
 *   it is a permission-scoped candidate list, not a site search. See
 *   `src/lib/tour-picker.ts`.
 */
/** The tab names the search. */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('search')
  return { title: t('Search contents') }
}

export default async function SearchContentsPage(props: {
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
  const { t: tCard } = await getT('contents-carousel-card')
  const [payload, museumId] = await setup

  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value
  const query = (firstValue(searchParams.q) ?? '').trim()
  const page = Math.max(1, Number(firstValue(searchParams.page)) || 1)

  const picker = parseTourPicker(lng, searchParams)
  const editor = picker ? await getTourEditorData(picker.museumId) : null

  const definitions: FilterDefinition[] = picker
    ? [
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
          // Exact length in seconds (`src/lib/duration.ts`).
          key: 'durationSeconds',
          label: t('Length in seconds'),
          type: 'number',
          operators: ['=', '!=', '>', '<', '>=', '<='],
        },
      ]
    : []
  const initialFilters = picker ? parseFilterSearchParams(searchParams, definitions) : []

  let contents: Content[] = []
  let totalPages = 1
  let lockedPrices: ReadonlyMap<string, number> | undefined

  if (editor) {
    // Picker: the museum's tour candidates (permission-scoped, on Payload).
    const allowedIds = editor.candidates.map((candidate) => candidate.id)
    const where: Where = {
      and: [activeFiltersToWhere(initialFilters, definitions), { id: { in: allowedIds } }],
    }
    const result =
      allowedIds.length === 0
        ? { docs: [] as Content[], totalPages: 1 }
        : await payload.find({ collection: 'contents', where, page, limit: PAGE_SIZE, depth: 1 })
    contents = result.docs
    totalPages = result.totalPages ?? 1
    lockedPrices = new Map(
      editor.candidates
        .filter((candidate) => candidate.locked)
        .map((candidate) => [candidate.id, candidate.price]),
    )
  } else {
    // Contents only: this page's own bar. Museum mode scopes through `museum_id`.
    const { hits, total } = await searchItemsWithFallback({
      payload,
      q: query,
      kinds: ['content'],
      museumId,
      page,
      limit: PAGE_SIZE,
      queryBy: ['title', 'excerpt'],
      queryByWeights: '5,2',
    })
    contents = await docsInHitOrder<Content>({
      payload,
      collection: 'contents',
      hits,
      locale: lng as TypedLocale,
    })
    totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  }

  return (
    // Desktop (≥ md): the page sits in the shared `lg` container (≤ 1140px,
    // centered) so title, search and the 3-column grid stop stretching across
    // wide screens. Below md the padding equals the old side margins: no change.
    <Container component="main" size="lg" px={{ base: 'md', sm: 'xl' }} mt="sm">
      <Stack>
        {picker && editor ? (
          <Stack gap="xs">
            <Title order={1} size="h2">
              {t('Add a stop')}
            </Title>
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
          <Title order={1} size="h2">
            {t('Search contents')}
          </Title>
        )}

        {editor && picker ? (
          <SearchShell
            definitions={definitions}
            initialFilters={initialFilters}
            page={page}
            totalPages={totalPages}
            basePath={`/${lng}/search/contents`}
            storageKeyPrefix="search-contents"
            placeholder={t('Filter contents…')}
            keepParams={tourPickerParams(picker)}
          >
            <ContentsSearchResults
              contents={contents}
              // Cards open the content's page, except while picking a stop for
              // the tour editor: there a stray click would leave the round trip.
              picker={picker}
              lockedPrices={lockedPrices}
            />
          </SearchShell>
        ) : (
          <>
            <EntitySearch
              basePath={`/${lng}/search/contents`}
              initialQuery={query}
              page={page}
              totalPages={totalPages}
              placeholder={t('Search contents…')}
              labels={{ search: t('Search') }}
            />
            <ContentsSearchResults contents={contents} lng={lng} picker={null} />
          </>
        )}
      </Stack>
    </Container>
  )
}
