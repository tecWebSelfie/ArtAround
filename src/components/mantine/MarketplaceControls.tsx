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
import { ClearSearchButton } from './ClearSearchButton'
import type { Route } from 'next'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useProgressRouter } from '@/lib/use-progress-router'

/** Values accepted by the marketplace URL. Kept in one place so the server
 *  page and the client controls cannot drift apart. */
export type MarketplaceKind = 'all' | 'tours' | 'contents' | 'objects' | 'users'
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
  objects: string
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
 * Filters expand inline instead of in a floating popover. The result summary
 * and grid follow this block, so the filter surface shares the search panel's
 * border rather than adding a second frame around nested controls.
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
  const router = useProgressRouter()
  const { query, setQuery, kind, setKind, price, setPrice } = useSearchState({
    query: initialQuery,
    kind: initialKind,
    price: initialPrice,
  })
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

  const activeFilterCount =
    (kind !== 'all' ? 1 : 0) + (kind !== 'users' && kind !== 'objects' && price !== 'all' ? 1 : 0)

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
            rightSectionWidth={query ? 76 : 48}
            rightSectionPointerEvents="all"
            rightSection={
              <Group gap={4} wrap="nowrap">
                {query && (
                  <ClearSearchButton
                    onClear={() => {
                      setQuery('')
                      // A submitted query is in the URL: drop it there too,
                      // keeping the filters. An unsent draft just empties.
                      if (initialQuery) navigate({ query: '', kind, price })
                    }}
                  />
                )}
                <FiltersToggle
                  count={activeFilterCount}
                  open={filtersOpen}
                  label={labels.filters}
                  onToggle={() => setFiltersOpen((open) => !open)}
                />
              </Group>
            }
          />
          {/* Red.8, not red.6: a white label on Mantine's red.6 reads at 3.3:1,
              below AA; the deeper step keeps a white label at 4.5:1. */}
          <Button type="submit" size="md" color="red.8" px={{ base: 'md', sm: 'xl' }}>
            {labels.search}
          </Button>
        </Group>

        <MarketplaceFilterPanel
          expanded={filtersOpen}
          activeFilterCount={activeFilterCount}
          kind={kind}
          price={price}
          labels={labels}
          onClear={clearFilters}
          onKindChange={(next) => {
            // Profiles and catalog objects are not sellable, so changing type
            // to either one also removes a stale price constraint.
            const nextPrice = next === 'users' || next === 'objects' ? 'all' : price
            setKind(next)
            setPrice(nextPrice)
            navigate({ query, kind: next, price: nextPrice })
          }}
          onPriceChange={(next) => {
            setPrice(next)
            navigate({ query, kind, price: next })
          }}
        />
      </Stack>
    </Paper>
  )
}

/**
 * The inline panel keeps filter choices beside their search context. Its
 * tonal surface is nested without another border so the form reads as one unit.
 */
function MarketplaceFilterPanel({
  expanded,
  activeFilterCount,
  kind,
  price,
  labels,
  onClear,
  onKindChange,
  onPriceChange,
}: {
  expanded: boolean
  activeFilterCount: number
  kind: MarketplaceKind
  price: MarketplacePrice
  labels: MarketplaceLabels
  onClear: () => void
  onKindChange: (kind: MarketplaceKind) => void
  onPriceChange: (price: MarketplacePrice) => void
}) {
  return (
    <Collapse expanded={expanded} id={FILTERS_ID}>
      <Paper radius="md" p="sm" bg="var(--mantine-color-default-hover)">
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
                onClick={onClear}
              >
                {labels.clearFilters}
              </Button>
            )}
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <FilterField label={labels.type}>
              <SegmentedControl
                fullWidth
                size="xs"
                value={kind}
                aria-label={labels.type}
                onChange={(value) => onKindChange(value as MarketplaceKind)}
                data={[
                  { value: 'all', label: labels.all },
                  { value: 'tours', label: labels.tours },
                  { value: 'contents', label: labels.contents },
                  { value: 'objects', label: labels.objects },
                  { value: 'users', label: labels.users },
                ]}
              />
            </FilterField>

            <FilterField label={labels.price}>
              <SegmentedControl
                fullWidth
                size="xs"
                value={kind === 'users' || kind === 'objects' ? 'all' : price}
                disabled={kind === 'users' || kind === 'objects'}
                aria-label={labels.price}
                onChange={(value) => onPriceChange(value as MarketplacePrice)}
                data={[
                  { value: 'all', label: labels.anyPrice },
                  { value: 'free', label: labels.free },
                  { value: 'paid', label: labels.paid },
                ]}
              />
              {(kind === 'users' || kind === 'objects') && (
                <Text size="xs" c="dimmed">
                  {labels.usersNoPrice}
                </Text>
              )}
            </FilterField>
          </SimpleGrid>
        </Stack>
      </Paper>
    </Collapse>
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
  const router = useProgressRouter()

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

/** Opens the filter panel; its badge counts the filters in force. */
function FiltersToggle({
  count,
  open,
  label,
  onToggle,
}: {
  count: number
  open: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <Indicator inline label={count} size={16} color="red" autoContrast disabled={count === 0}>
      <ActionIcon
        type="button"
        variant={open || count > 0 ? 'light' : 'subtle'}
        color="red"
        size="sm"
        aria-label={label}
        aria-expanded={open}
        aria-controls={FILTERS_ID}
        onClick={onToggle}
      >
        <SlidersHorizontal size={16} aria-hidden />
      </ActionIcon>
    </Indicator>
  )
}

/** One filter in the panel: its small uppercase label over the control. */
function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={6}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        {label}
      </Text>
      {children}
    </Stack>
  )
}

/**
 * The search's draft state, following the URL. Browser back/forward changes
 * the URL without remounting the component: state is adjusted during render
 * (React's recommended prop-sync pattern), so a navigation cannot leave the
 * input showing stale filters.
 */
function useSearchState(initial: SearchState) {
  const [query, setQuery] = useState(initial.query)
  const [kind, setKind] = useState<MarketplaceKind>(initial.kind)
  const [price, setPrice] = useState<MarketplacePrice>(initial.price)
  const initialKey = `${initial.query}|${initial.kind}|${initial.price}`
  const [syncedKey, setSyncedKey] = useState(initialKey)
  if (syncedKey !== initialKey) {
    setSyncedKey(initialKey)
    setQuery(initial.query)
    setKind(initial.kind)
    setPrice(initial.price)
  }
  return { query, setQuery, kind, setKind, price, setPrice }
}
