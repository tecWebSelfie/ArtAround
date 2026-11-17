import type { Metadata } from 'next'
import { ContentsSearchResults } from '@/components/mantine/ContentsSearchResults'
import { EntitySearch } from '@/components/mantine/EntitySearch'
import { SearchHeading } from '@/components/mantine/SearchHeading'
import { SearchShell } from '@/components/mantine/SearchShell'
import { SearchUnavailableAlert } from '@/components/mantine/SearchUnavailableAlert'
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
import { searchItems } from '@/lib/search/query'
import { resolveSearchScopes, scopeParams } from '@/lib/search-scope'
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
  const basePath = `/${lng}/search/contents`
  // Independent setup reads: started together, and the URL scopes (`?at=`,
  // `?author=`, `?subject=`: a "See all" link's list) as soon as Payload is up.
  const payloadReady = getPayload({ config })
  const setup = Promise.all([payloadReady, museumSearchMuseumId()])
  const scoping = payloadReady.then((payload) =>
    resolveSearchScopes(payload, 'contents', searchParams, lng),
  )
  // `t` on its own statement, so `i18next-cli extract` sees its namespace;
  // the reads above were started first and keep loading meanwhile.
  const { t } = await getT('search')
  const { t: tCard } = await getT('contents-carousel-card')
  const [payload, museumId] = await setup

  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value
  const query = (firstValue(searchParams.q) ?? '').trim()
  const page = Math.max(1, Number(firstValue(searchParams.page)) || 1)
  const { filters, scopes } = await scoping

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
  let total = 0
  let totalPages = 1
  let lockedPrices: ReadonlyMap<string, number> | undefined
  let searchFailed = false

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
    total = 'totalDocs' in result ? result.totalDocs : result.docs.length
    totalPages = result.totalPages ?? 1
    lockedPrices = new Map(
      editor.candidates
        .filter((candidate) => candidate.locked)
        .map((candidate) => [candidate.id, candidate.price]),
    )
  } else {
    // Contents only: this page's own bar. Museum mode scopes it through
    // `museum_id`, a "See all" link through the URL scopes (`filters`).
    // No Payload fallback: an outage is shown, not replaced by other results.
    try {
      const { hits, total: found } = await searchItems({
        q: query,
        kinds: ['content'],
        museumId,
        page,
        limit: PAGE_SIZE,
        queryBy: ['title', 'excerpt'],
        queryByWeights: '5,2',
        filterBy: filters,
      })
      total = found
      contents = await docsInHitOrder<Content>({
        payload,
        collection: 'contents',
        hits,
        locale: lng as TypedLocale,
      })
      totalPages = Math.max(1, Math.ceil(found / PAGE_SIZE))
    } catch (error) {
      console.error('[search] Typesense contents search failed', error)
      searchFailed = true
    }
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
          <SearchHeading
            title={t('Search contents')}
            total={total}
            scopes={scopes}
            // This page has no composite filters: only a scope narrows it.
            filtered={false}
            basePath={basePath}
            searchParams={searchParams}
          />
        )}

        {editor && picker ? (
          <SearchShell
            definitions={definitions}
            initialFilters={initialFilters}
            page={page}
            totalPages={totalPages}
            basePath={basePath}
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
              basePath={basePath}
              initialQuery={query}
              page={page}
              totalPages={searchFailed ? 1 : totalPages}
              placeholder={t('Search contents…')}
              labels={{ search: t('Search') }}
              // The search box and the pager keep the "See all" scope.
              keepParams={scopeParams(scopes)}
            />
            {searchFailed ? (
              <SearchUnavailableAlert message={t('Search is not reachable right now.')} />
            ) : (
              <ContentsSearchResults contents={contents} lng={lng} picker={null} />
            )}
          </>
        )}
      </Stack>
    </Container>
  )
}
