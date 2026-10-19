'use client'

import type { Route } from 'next'
import { Group, Pagination, Stack } from '@mantine/core'
import {
  CompositeFiltersInput,
  useCompositeFilters,
  type ActiveFilter,
  type FilterDefinition,
} from 'mantine-composite-filters'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

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
  children,
}: {
  definitions: FilterDefinition[]
  initialFilters: ActiveFilter[]
  page: number
  totalPages: number
  basePath: string
  storageKeyPrefix: string
  placeholder: string
  children: ReactNode
}) {
  const router = useRouter()
  const { activeFilters, setActiveFilters, toQueryString } = useCompositeFilters({
    filterDefinitions: definitions,
    initialFilters,
  })
  const skipFirstRender = useRef(true)

  useEffect(() => {
    if (skipFirstRender.current) {
      skipFirstRender.current = false
      return
    }
    const handle = setTimeout(() => {
      const qs = toQueryString()
      // Changing filters resets to the first page.
      router.replace((qs ? `${basePath}?${qs}` : basePath) as Route, { scroll: false })
    }, 400)
    return () => clearTimeout(handle)
  }, [activeFilters, basePath, router, toQueryString])

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(toQueryString())
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
          <Pagination value={page} total={totalPages} onChange={goToPage} />
        </Group>
      )}
    </Stack>
  )
}
