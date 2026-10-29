import config from '@/payload.config'
import { ObjectsSearchResults } from '@/components/mantine/ObjectsSearchResults'
import { SearchShell } from '@/components/mantine/SearchShell'
import { getT } from '@/i18n.server'
import { activeFiltersToWhere, parseFilterSearchParams } from '@/lib/searchFilters'
import { Container, Stack, Title } from '@mantine/core'
import type { FilterDefinition } from 'mantine-composite-filters'
import { getPayload } from 'payload'
import { museumScope } from '@/lib/museum-mode'
import { LinkButton } from '@/components/editing/LinkButton'
import { createObjectHref, museumPickerParams, parseMuseumPicker } from '@/lib/museum-picker'
import { can } from '@/lib/session'
import { Group, Text } from '@mantine/core'
import { ArrowLeft, Sparkles } from 'lucide-react'
import type { Route } from 'next'

const PAGE_SIZE = 12

/**
 * Objects search. Two modes:
 * - plain search (museum mode limits it to the locked museum's objects);
 * - museum picker (`?pick=museum&museum=…`, from the map editor's "Browse the
 *   catalog"): the whole catalog, objects already on the map marked "On
 *   show", the others placed on the map in one click. Only for people who may
 *   edit that map; anyone else gets the plain search. See
 *   `src/lib/museum-picker.ts`.
 */
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

  const result = await payload.find({
    collection: 'objects',
    // Museum mode: only the locked museum's objects. The picker browses the
    // whole catalog: any object can be placed on any map.
    where:
      scope && !picker
        ? {
            and: [
              activeFiltersToWhere(initialFilters, definitions),
              { id: { in: scope.objectIds } },
            ],
          }
        : activeFiltersToWhere(initialFilters, definitions),
    page,
    limit: PAGE_SIZE,
    depth: 1,
  })

  return (
    // Desktop (≥ md): the page sits in the shared `lg` container (≤ 1140px,
    // centered) so title, filter and the 3-column grid stop stretching across
    // wide screens. Below md the padding equals the old side margins: no change.
    <Container size="lg" px={{ base: 'md', sm: 'xl' }} mt="sm">
      <Stack>
        {picker && museum ? (
          <Stack gap="xs">
            <Title order={2}>{t('Add an object')}</Title>
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
          <Title order={2}>{t('Search objects')}</Title>
        )}
        <SearchShell
          definitions={definitions}
          initialFilters={initialFilters}
          page={result.page ?? page}
          totalPages={result.totalPages ?? 1}
          basePath={`/${lng}/search/objects`}
          storageKeyPrefix="search-objects"
          placeholder={t('Filter objects...')}
          keepParams={picker ? museumPickerParams(picker) : undefined}
        >
          <ObjectsSearchResults objects={result.docs} lng={lng} picker={picker} onShow={onShow} />
        </SearchShell>
      </Stack>
    </Container>
  )
}
