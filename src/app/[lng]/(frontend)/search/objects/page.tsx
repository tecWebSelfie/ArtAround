import type { Metadata } from 'next'
import config from '@/payload.config'
import { ObjectsSearchResults } from '@/components/mantine/ObjectsSearchResults'
import { EntitySearch } from '@/components/mantine/EntitySearch'
import { SearchShell } from '@/components/mantine/SearchShell'
import { SearchUnavailableAlert } from '@/components/mantine/SearchUnavailableAlert'
import { getT } from '@/i18n.server'
import { activeFiltersToWhere, parseFilterSearchParams } from '@/lib/searchFilters'
import { Container, Group, Stack, Text, Title } from '@mantine/core'
import type { FilterDefinition } from 'mantine-composite-filters'
import { getPayload, type TypedLocale } from 'payload'
import { museumSearchMuseumId } from '@/lib/museum-mode'
import { LinkButton } from '@/components/editing/LinkButton'
import { createObjectHref, museumPickerParams, parseMuseumPicker } from '@/lib/museum-picker'
import { can } from '@/lib/session'
import { docsInHitOrder } from '@/lib/search/hydrate'
import { searchItems } from '@/lib/search/query'
import type { Object as ArtObject } from '@/payload-types'
import { ArrowLeft, Sparkles } from 'lucide-react'
import type { Route } from 'next'

const PAGE_SIZE = 12

/**
 * Objects search. Two modes:
 * - plain search, backed by Typesense (`search_items`, objects only; museum
 *   mode limits it to the locked museum);
 * - museum picker (`?pick=museum&museum=…`, from the map editor's "Browse the
 *   catalog"): the whole catalog, objects already on the map marked "On
 *   show", the others placed on the map in one click. It stays on Payload
 *   because it is a permission-scoped candidate list, not a site search. See
 *   `src/lib/museum-picker.ts`.
 */
/** The tab names the search. */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('search')
  return { title: t('Search objects') }
}

export default async function SearchObjectsPage(props: {
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

  const requested = parseMuseumPicker(lng, searchParams)
  const picker =
    requested && (await can('museums', requested.museumId, 'update', 'map')) ? requested : null
  const museum = picker
    ? await payload.findByID({
        collection: 'museums',
        id: picker.museumId,
        depth: 0,
        select: { name: true, objects: true },
      })
    : null
  const onShow = new Set(
    (museum?.objects ?? []).map((object) => (typeof object === 'string' ? object : object.id)),
  )

  // The picker keeps the old Payload read (permission-scoped candidates) and
  // its composite filters; the plain search is one full-text query on Typesense.
  const definitions: FilterDefinition[] = picker
    ? [
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
    : []
  const initialFilters = picker ? parseFilterSearchParams(searchParams, definitions) : []

  let objects: ArtObject[] = []
  let totalPages = 1
  let searchFailed = false
  if (picker) {
    const result = await payload.find({
      collection: 'objects',
      where: activeFiltersToWhere(initialFilters, definitions),
      page,
      limit: PAGE_SIZE,
      depth: 1,
    })
    objects = result.docs
    totalPages = result.totalPages ?? 1
  } else {
    // Objects only: this page's own bar. Museum mode scopes through `museum_id`.
    // No Payload fallback: an outage is shown, not replaced by other results.
    try {
      const { hits, total } = await searchItems({
        q: query,
        kinds: ['object'],
        museumId,
        page,
        limit: PAGE_SIZE,
        queryBy: ['title', 'artist', 'description'],
        queryByWeights: '5,3,2',
      })
      objects = await docsInHitOrder<ArtObject>({
        payload,
        collection: 'objects',
        hits,
        locale: lng as TypedLocale,
      })
      totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    } catch (error) {
      console.error('[search] Typesense objects search failed', error)
      searchFailed = true
    }
  }

  return (
    // Desktop (≥ md): the page sits in the shared `lg` container (≤ 1140px,
    // centered) so title, search and the 3-column grid stop stretching across
    // wide screens. Below md the padding equals the old side margins: no change.
    <Container component="main" size="lg" px={{ base: 'md', sm: 'xl' }} mt="sm">
      <Stack>
        {picker && museum ? (
          <Stack gap="xs">
            <Title order={1} size="h2">
              {t('Add an object')}
            </Title>
            <Text c="dimmed" size="sm">
              {t('Pick an object from the catalog to place it on the map of {{museum}}', {
                museum: museum.name,
              })}
            </Text>
            <Group gap="xs">
              <LinkButton
                href={picker.returnTo as Route}
                variant="default"
                leftSection={<ArrowLeft size={16} aria-hidden />}
              >
                {t('Back to the map')}
              </LinkButton>
              {/* Not in the catalog yet: create it (and its 3D model) in the editor. */}
              <LinkButton
                href={createObjectHref(picker) as Route}
                variant="light"
                leftSection={<Sparkles size={16} aria-hidden />}
              >
                {t('Create a new object')}
              </LinkButton>
            </Group>
          </Stack>
        ) : (
          <Title order={1} size="h2">
            {t('Search objects')}
          </Title>
        )}

        {picker ? (
          <SearchShell
            definitions={definitions}
            initialFilters={initialFilters}
            page={page}
            totalPages={totalPages}
            basePath={`/${lng}/search/objects`}
            storageKeyPrefix="search-objects"
            placeholder={t('Filter objects…')}
            keepParams={museumPickerParams(picker)}
          >
            <ObjectsSearchResults objects={objects} lng={lng} picker={picker} onShow={onShow} />
          </SearchShell>
        ) : (
          <>
            <EntitySearch
              basePath={`/${lng}/search/objects`}
              initialQuery={query}
              page={page}
              totalPages={searchFailed ? 1 : totalPages}
              placeholder={t('Search objects…')}
              labels={{ search: t('Search') }}
            />
            {searchFailed ? (
              <SearchUnavailableAlert message={t('Search is not reachable right now.')} />
            ) : (
              <ObjectsSearchResults objects={objects} lng={lng} picker={null} onShow={onShow} />
            )}
          </>
        )}
      </Stack>
    </Container>
  )
}
