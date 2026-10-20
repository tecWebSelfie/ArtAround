'use client'

import {
  ActionIcon,
  Button,
  Collapse,
  Group,
  Indicator,
  Pagination,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { Search, SlidersHorizontal } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

/** Values accepted by the marketplace URL. Kept in one place so the server
 *  page and the client controls cannot drift apart. */
export type MarketplaceKind = 'all' | 'tours' | 'contents' | 'users'
export type MarketplacePrice = 'all' | 'free' | 'paid'

export type MarketplaceLabels = {
  searchPlaceholder: string
  search: string
  filters: string
  clearFilters: string
  type: string
  all: string
  tours: string
  contents: string
  users: string
  usersNoPrice: string
  price: string
  anyPrice: string
  free: string
  paid: string
}

type SearchState = {
  query: string
  kind: MarketplaceKind
  price: MarketplacePrice
}

function buildHref(basePath: string, state: SearchState, page?: number) {
  const params = new URLSearchParams()
  const query = state.query.trim()
  if (query) params.set('q', query)
  if (state.kind !== 'all') params.set('kind', state.kind)
  if (state.price !== 'all') params.set('price', state.price)
  if (page && page > 1) params.set('page', String(page))
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

const FILTERS_ID = 'marketplace-filters'

/**
 * Search + filters for the marketplace. The URL is the source of truth: every
 * change pushes a new URL and the server page refetches, so the result is
 * shareable and survives a reload.
 *
 * Filters expand inline instead of in a floating popover. The results grid sits
 * directly below this block: an overlay would cover the very cards the user is
 * trying to narrow down, while an inline panel simply pushes them down.
 */
export function MarketplaceSearch({
  basePath,
  initialQuery,
  initialKind,
  initialPrice,
  labels,
}: {
  basePath: string
  initialQuery: string
  initialKind: MarketplaceKind
  initialPrice: MarketplacePrice
  labels: MarketplaceLabels
}) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [kind, setKind] = useState<MarketplaceKind>(initialKind)
  const [price, setPrice] = useState<MarketplacePrice>(initialPrice)
  const [filtersOpen, setFiltersOpen] = useState(initialKind !== 'all' || initialPrice !== 'all')

  // Browser back/forward changes the URL without remounting this component.
  // Adjust state during render (React's recommended prop-sync pattern) so a
  // navigation cannot leave the input showing stale filters.
  const initialKey = `${initialQuery}|${initialKind}|${initialPrice}`
  const [syncedKey, setSyncedKey] = useState(initialKey)
  if (syncedKey !== initialKey) {
    setSyncedKey(initialKey)
    setQuery(initialQuery)
    setKind(initialKind)
    setPrice(initialPrice)
  }

  const activeFilterCount = (kind !== 'all' ? 1 : 0) + (kind !== 'users' && price !== 'all' ? 1 : 0)

  const navigate = (next: SearchState) => {
    // Any filter/search change starts again from page 1.
    router.push(buildHref(basePath, next) as Route)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate({ query, kind, price })
  }

  const clearFilters = () => {
    setQuery('')
    setKind('all')
    setPrice('all')
    setFiltersOpen(false)
    navigate({ query: '', kind: 'all', price: 'all' })
  }

  return (
    <Paper component="form" onSubmit={submit} withBorder radius="lg" p={{ base: 'sm', sm: 'md' }}>
      <Stack gap="sm">
        <Group gap="xs" wrap="nowrap">
          <TextInput
            flex={1}
            size="md"
            radius="md"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.searchPlaceholder}
            leftSection={<Search size={18} aria-hidden />}
            rightSectionWidth={48}
            rightSectionPointerEvents="all"
            rightSection={
              <Indicator
                inline
                label={activeFilterCount}
                size={16}
                color="red"
                autoContrast
                disabled={activeFilterCount === 0}
              >
                <ActionIcon
                  type="button"
                  variant={filtersOpen || activeFilterCount > 0 ? 'light' : 'subtle'}
                  color="red"
                  size="sm"
                  aria-label={labels.filters}
                  aria-expanded={filtersOpen}
                  aria-controls={FILTERS_ID}
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  <SlidersHorizontal size={16} aria-hidden />
                </ActionIcon>
              </Indicator>
            }
          />
          <Button type="submit" size="md" color="red" px={{ base: 'md', sm: 'xl' }}>
            {labels.search}
          </Button>
        </Group>

        <Collapse expanded={filtersOpen} id={FILTERS_ID}>
          <Paper withBorder radius="md" p="sm" bg="var(--mantine-color-default-hover)">
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  {labels.filters}
                </Text>
                {activeFilterCount > 0 && (
                  <Button
                    type="button"
                    variant="subtle"
                    size="compact-xs"
                    color="red"
                    onClick={clearFilters}
                  >
                    {labels.clearFilters}
                  </Button>
                )}
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <Stack gap={6}>
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                    {labels.type}
                  </Text>
                  <SegmentedControl
                    fullWidth
                    size="xs"
                    value={kind}
                    aria-label={labels.type}
                    onChange={(value) => {
                      const next = value as MarketplaceKind
                      // Profiles are free-form directory entries, not sellable
                      // documents, so a price filter must not survive this switch.
                      const nextPrice = next === 'users' ? 'all' : price
                      setKind(next)
                      setPrice(nextPrice)
                      navigate({ query, kind: next, price: nextPrice })
                    }}
                    data={[
                      { value: 'all', label: labels.all },
                      { value: 'tours', label: labels.tours },
                      { value: 'contents', label: labels.contents },
                      { value: 'users', label: labels.users },
                    ]}
                  />
                </Stack>

                <Stack gap={6}>
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                    {labels.price}
                  </Text>
                  <SegmentedControl
                    fullWidth
                    size="xs"
                    value={kind === 'users' ? 'all' : price}
                    disabled={kind === 'users'}
                    aria-label={labels.price}
                    onChange={(value) => {
                      const next = value as MarketplacePrice
                      setPrice(next)
                      navigate({ query, kind, price: next })
                    }}
                    data={[
                      { value: 'all', label: labels.anyPrice },
                      { value: 'free', label: labels.free },
                      { value: 'paid', label: labels.paid },
                    ]}
                  />
                  {kind === 'users' ? (
                    <Text size="xs" c="dimmed">
                      {labels.usersNoPrice}
                    </Text>
                  ) : null}
                </Stack>
              </SimpleGrid>
            </Stack>
          </Paper>
        </Collapse>
      </Stack>
    </Paper>
  )
}

/** Pagination keeps the active search/filter state in the URL. */
export function MarketplacePagination({
  basePath,
  query,
  kind,
  price,
  page,
  totalPages,
}: {
  basePath: string
  query: string
  kind: MarketplaceKind
  price: MarketplacePrice
  page: number
  totalPages: number
}) {
  const router = useRouter()

  if (totalPages <= 1) return null

  return (
    <Group justify="center" mt="xl">
      <Pagination
        value={page}
        total={totalPages}
        onChange={(nextPage) =>
          router.push(buildHref(basePath, { query, kind, price }, nextPage) as Route)
        }
      />
    </Group>
  )
}
