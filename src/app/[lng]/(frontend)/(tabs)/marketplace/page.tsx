import { MarketplaceCard } from '@/components/mantine/MarketplaceCard'
import {
  MarketplacePagination,
  MarketplaceSearch,
  type MarketplaceKind,
  type MarketplacePrice,
} from '@/components/mantine/MarketplaceControls'
import { getT } from '@/i18n.server'
import { getMarketplaceResults, MARKETPLACE_PAGE_SIZE } from '@/lib/marketplace'
import { museumSearchRestriction } from '@/lib/museum-mode'
import config from '@/payload.config'
import { Button, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { SearchX } from 'lucide-react'
import { getPayload, type TypedLocale } from 'payload'

type SearchParams = Record<string, string | string[] | undefined>

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parseKind(value: string | undefined): MarketplaceKind {
  return value === 'tours' || value === 'contents' || value === 'users' ? value : 'all'
}

function parsePrice(value: string | undefined): MarketplacePrice {
  return value === 'free' || value === 'paid' ? value : 'all'
}

export default async function Marketplace(props: {
  params: Promise<{ lng: string }>
  searchParams: Promise<SearchParams>
}) {
  const { lng } = await props.params
  const searchParams = await props.searchParams
  const { t } = await getT('marketplace')
  // Difficulty names are shared with search (search.json), not duplicated here.
  const { t: ts } = await getT('search')

  const query = (firstValue(searchParams.q) ?? '').trim()
  const kind = parseKind(firstValue(searchParams.kind))
  // Profiles do not carry a price. Normalise the URL state so `?kind=users&price=free`
  // behaves the same as the Users tab in the UI.
  const price = kind === 'users' ? 'all' : parsePrice(firstValue(searchParams.price))
  const page = Math.max(1, Number(firstValue(searchParams.page)) || 1)

  const payload = await getPayload({ config })
  const basePath = `/${lng}/marketplace`

  // The Payload search collection owns the result set for both text searches
  // and empty-query browsing. The matched IDs are hydrated into localized cards
  // from their source collections below.
  // Museum mode: browsing and searching both list only the locked museum's
  // tours, contents and their authors.
  const { items, total } = await getMarketplaceResults({
    payload,
    locale: lng as TypedLocale,
    query,
    kind,
    price,
    page,
    restrictTo: await museumSearchRestriction(),
  })

  const totalPages = Math.max(1, Math.ceil(total / MARKETPLACE_PAGE_SIZE))
  const hasFilters = Boolean(query) || kind !== 'all' || price !== 'all'

  return (
    <Stack mx={{ base: 'md', sm: 'xl' }} my="md" gap="lg">
      <Title order={1} size="h2">
        {t('Marketplace')}
      </Title>

      <MarketplaceSearch
        basePath={basePath}
        initialQuery={query}
        initialKind={kind}
        initialPrice={price}
        labels={{
          searchPlaceholder: t('searchPlaceholder'),
          search: t('search'),
          filters: t('filters'),
          clearFilters: t('clearFilters'),
          type: t('type'),
          all: t('all'),
          tours: t('tours'),
          contents: t('contents'),
          users: t('users'),
          usersNoPrice: t('usersNoPrice'),
          price: t('price'),
          anyPrice: t('anyPrice'),
          free: t('free'),
          paid: t('paid'),
        }}
      />

      <Group justify="space-between" align="center">
        <Text fw={600}>{t('results', { count: total })}</Text>
        {hasFilters && items.length > 0 && (
          <Button component="a" href={basePath} variant="subtle" size="xs">
            {t('clearFilters')}
          </Button>
        )}
      </Group>

      {items.length > 0 ? (
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
                viewProfile: t('viewProfile'),
                min: t('min'),
                minRead: t('minRead'),
                difficulty: { easy: ts('Easy'), medium: ts('Medium'), hard: ts('Hard') },
              }}
            />
          ))}
        </SimpleGrid>
      ) : (
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
      )}

      <MarketplacePagination
        basePath={basePath}
        query={query}
        kind={kind}
        price={price}
        page={page}
        totalPages={totalPages}
      />
    </Stack>
  )
}
