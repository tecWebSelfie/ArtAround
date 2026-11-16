'use client'

import type { Route } from 'next'
import { Group, Stack } from '@mantine/core'
import { LabeledPagination } from './LabeledPagination'
import {
  CompositeFiltersInput,
  useCompositeFilters,
  type ActiveFilter,
  type FilterDefinition,
} from 'mantine-composite-filters'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

/**
 * Client shell shared by the search pages. Owns the filter state after
 * mount (initialized from the URL by the server) and writes it back to the
 * URL debounced, so the server page refetches and the query is shareable.
 * Results are rendered by the server and passed as children.
 */
export function SearchShell({
  definitions,
  initialFilters,
  page,
  totalPages,
  basePath,
  storageKeyPrefix,
  placeholder,
  keepParams,
  children,
}: {
  definitions: FilterDefinition[]
  initialFilters: ActiveFilter[]
  page: number
  totalPages: number
  basePath: string
  storageKeyPrefix: string
  placeholder: string
  /** Non-filter query parameters to keep on every URL (e.g. the tour picker's). */
  keepParams?: Record<string, string>
  children: ReactNode
}) {
  const router = useRouter()
  const { activeFilters, setActiveFilters, toQueryString } = useCompositeFilters({
    filterDefinitions: definitions,
    initialFilters,
  })
  const skipFirstRender = useRef(true)
  // Stable across renders unless the page changes mode (the effect below
  // must not re-run, and reset the page, on every render).
  const keep = JSON.stringify(keepParams ?? {})

  const currentParams = useSearchParams()

  // The hook reads `initialFilters` on mount only. A link to this same page
  // (a scope chip, "Clear all filters") re-renders it with other filters
  // while this component stays mounted: take the URL's filters then
  // (during render, so the write-back below already sees them and finds
  // the URL up to date), or the old filters would return to the URL.
  const initialKey = JSON.stringify(initialFilters)
  const [syncedKey, setSyncedKey] = useState(initialKey)
  if (syncedKey !== initialKey) {
    setSyncedKey(initialKey)
    if (initialKey !== JSON.stringify(activeFilters)) setActiveFilters(initialFilters)
  }

  useEffect(() => {
    if (skipFirstRender.current) {
      skipFirstRender.current = false
      return
    }
    const handle = setTimeout(() => {
      const params = new URLSearchParams(toQueryString())
      for (const [key, value] of Object.entries(JSON.parse(keep))) params.set(key, String(value))
      // Already the URL (the filters came from it): nothing to write.
      if (sortedQuery(params) === sortedQuery(currentParams)) return
      const qs = params.toString()
      // Changing filters resets to the first page.
      router.replace((qs ? `${basePath}?${qs}` : basePath) as Route, { scroll: false })
    }, 400)
    return () => clearTimeout(handle)
  }, [activeFilters, basePath, router, toQueryString, keep, currentParams])

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(toQueryString())
    for (const [key, value] of Object.entries(keepParams ?? {})) params.set(key, value)
    params.set('page', String(nextPage))
    router.replace(`${basePath}?${params.toString()}` as Route, { scroll: false })
  }

  return (
    <Stack>
      <CompositeFiltersInput
        filters={definitions}
        value={activeFilters}
        onChange={setActiveFilters}
        placeholder={placeholder}
        storageKeyPrefix={storageKeyPrefix}
      />
      {children}
      {totalPages > 1 && (
        <Group justify="center">
          <LabeledPagination value={page} total={totalPages} onChange={goToPage} />
        </Group>
      )}
    </Stack>
  )
}

/** A query compared regardless of order, without the page (filters reset it). */
function sortedQuery(params: URLSearchParams) {
  return [...params.entries()]
    .filter(([key]) => key !== 'page')
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('&')
}
