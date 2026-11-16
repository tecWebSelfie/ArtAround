import { MarketplaceCard } from '@/components/mantine/MarketplaceCard'
import { SearchUnavailableAlert } from '@/components/mantine/SearchUnavailableAlert'
import {
  MarketplacePagination,
  MarketplaceSearch,
  type MarketplaceKind,
  type MarketplaceLabels,
  type MarketplacePrice,
} from '@/components/mantine/MarketplaceControls'
import { getT } from '@/i18n.server'
import { getMarketplaceResults, MARKETPLACE_PAGE_SIZE } from '@/lib/marketplace'
import { museumSearchMuseumId } from '@/lib/museum-mode'
import config from '@/payload.config'
import { Button, Container, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { SearchX } from 'lucide-react'
import { getPayload, type TypedLocale } from 'payload'
import type { Route } from 'next'
import {
  MarketplaceResultsHeader,
  type MarketplaceActiveFilter,
} from '@/components/mantine/MarketplaceResultsHeader'
import type { ReactNode } from 'react'

type SearchParams = Record<string, string | string[] | undefined>

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parseKind(value: string | undefined): MarketplaceKind {
  return value === 'tours' || value === 'contents' || value === 'objects' || value === 'users'
    ? value
    : 'all'
}

function parsePrice(value: string | undefined): MarketplacePrice {
  return value === 'free' || value === 'paid' ? value : 'all'
}

/** Removing a marketplace filter preserves the other URL state and resets pagination. */
function marketplaceHref(
  basePath: string,
  query: string,
  kind: MarketplaceKind,
  price: MarketplacePrice,
): Route {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (kind !== 'all') params.set('kind', kind)
  if (price !== 'all') params.set('price', price)
  const search = params.toString()
  return (search ? `${basePath}?${search}` : basePath) as Route
}

/** Active kind and price chips remove one URL filter while keeping the other. */
function buildMarketplaceActiveFilters({
  basePath,
  query,
  kind,
  price,
  labels,
  removeLabel,
}: {
  basePath: string
  query: string
  kind: MarketplaceKind
  price: MarketplacePrice
  labels: MarketplaceLabels
  removeLabel: (filter: string) => string
}) {
  const filters: MarketplaceActiveFilter[] = []
  if (kind !== 'all') {
    const label = labels[kind]
    filters.push({
      id: 'kind',
      label,
      removeLabel: removeLabel(label),
      href: marketplaceHref(basePath, query, 'all', price),
    })
  }
  if (price !== 'all') {
    const label = price === 'free' ? labels.free : labels.paid
    filters.push({
      id: 'price',
      label,
      removeLabel: removeLabel(label),
      href: marketplaceHref(basePath, query, kind, 'all'),
    })
  }
  return filters
}

export default async function Marketplace(props: {
  params: Promise<{ lng: string }>
  searchParams: Promise<SearchParams>
}) {
  const { lng } = await props.params
  const searchParams = await props.searchParams
  // Payload and the museum-mode cookie are independent: started together.
  const setup = Promise.all([getPayload({ config }), museumSearchMuseumId()])
  // `t` on its own statement, so `i18next-cli extract` sees its namespace;
  // the reads above were started first and keep loading meanwhile.
  // Difficulty names are shared with search (search.json), not duplicated here.
  const { t } = await getT('marketplace')
  const { t: ts } = await getT('search')
  const [payload, museumId] = await setup

  const query = (firstValue(searchParams.q) ?? '').trim()
  const kind = parseKind(firstValue(searchParams.kind))
  // Profiles and catalog objects do not carry a price. Normalise the URL state
  // so `?kind=users&price=free` behaves the same as the Users tab in the UI.
  const price =
    kind === 'users' || kind === 'objects' ? 'all' : parsePrice(firstValue(searchParams.price))
  const page = Math.max(1, Number(firstValue(searchParams.page)) || 1)

  const basePath = `/${lng}/marketplace`

  // The Typesense `search_items` collection owns the result set for both text
  // searches and empty-query browsing. The matched IDs are hydrated into
  // localized cards from their source collections below.
  // Museum mode: browsing and searching both list only the locked museum's
  // tours, contents, objects and their authors.
  // There is no Payload fallback: a Typesense failure is shown as such.
  let results: Awaited<ReturnType<typeof getMarketplaceResults>> | null = null
  let searchFailed = false
  try {
    results = await getMarketplaceResults({
      payload,
      locale: lng as TypedLocale,
      query,
      kind,
      price,
      page,
      museumId,
    })
  } catch (error) {
    console.error('[marketplace] Typesense search failed', error)
    searchFailed = true
  }
  const items = results?.items ?? []
  const total = results?.total ?? 0

  const totalPages = Math.max(1, Math.ceil(total / MARKETPLACE_PAGE_SIZE))
  const hasFilters = Boolean(query) || kind !== 'all' || price !== 'all'
  const labels = {
    searchPlaceholder: t('Search tours, contents, objects and people'),
    search: t('search'),
    filters: t('filters'),
    clearFilters: t('clearFilters'),
    type: t('type'),
    all: t('all'),
    tours: t('tours'),
    contents: t('contents'),
    objects: t('objects'),
    users: t('users'),
    usersNoPrice: t('usersNoPrice'),
    price: t('price'),
    anyPrice: t('anyPrice'),
    free: t('free'),
    paid: t('paid'),
  }
  const activeFilters = buildMarketplaceActiveFilters({
    basePath,
    query,
    kind,
    price,
    labels,
    removeLabel: (filter) => ts('Remove filter: {{filter}}', { filter }),
  })
  let resultContent: ReactNode = null
  if (!searchFailed && items.length > 0) {
    resultContent = (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {items.map((item) => (
          <MarketplaceCard
            key={item.key}
            item={item}
            locale={lng}
            labels={{
              free: t('free'),
              tour: t('tour'),
              content: t('content'),
              user: t('user'),
              object: t('object'),
              viewProfile: t('viewProfile'),
              viewObject: t('viewObject'),
              min: t('min'),
              difficulty: { easy: ts('Easy'), medium: ts('Medium'), hard: ts('Hard') },
            }}
          />
        ))}
      </SimpleGrid>
    )
  } else if (!searchFailed) {
    // The empty state follows the same result heading and active filter chips.
    resultContent = (
      <Paper withBorder radius="lg" p="xl">
        <Stack align="center" gap="xs">
          <ThemeIcon size={48} radius="xl" variant="light" color="gray">
            <SearchX size={24} aria-hidden />
          </ThemeIcon>
          <Title order={2} size="h4">
            {t('noResults')}
          </Title>
          <Text c="dimmed" ta="center">
            {t('noResultsHint')}
          </Text>
          {hasFilters && (
            <Button component="a" href={basePath} variant="light" mt="xs">
              {t('clearFilters')}
            </Button>
          )}
        </Stack>
      </Paper>
    )
  }

  return (
    // In the tabs' flex stack, w-full fills the available width before Container
    // caps it at the same centered lg measure used by other catalog search pages.
    <Container component="main" size="lg" px={{ base: 'md', sm: 'xl' }} mt="sm" className="w-full">
      <Stack gap="lg">
        <Title order={1} size="h2">
          {t('Marketplace')}
        </Title>

        <MarketplaceSearch
          basePath={basePath}
          initialQuery={query}
          initialKind={kind}
          initialPrice={price}
          labels={labels}
        />

        {searchFailed ? (
          <SearchUnavailableAlert message={ts('Search is not reachable right now.')} />
        ) : (
          <MarketplaceResultsHeader
            resultsLabel={t('results', { count: total })}
            filters={activeFilters}
            clearHref={hasFilters && items.length > 0 ? (basePath as Route) : undefined}
            clearLabel={t('clearFilters')}
          />
        )}

        {resultContent}

        <MarketplacePagination
          basePath={basePath}
          query={query}
          kind={kind}
          price={price}
          page={page}
          totalPages={searchFailed ? 1 : totalPages}
        />
      </Stack>
    </Container>
  )
}
