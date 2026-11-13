'use client'

import {
  ArtAroundGlobalSearch,
  type AutoCompleteItem,
  type SearchStatus,
} from '@/components/mantine/ArtAroundGlobalSearch'
import { Box, Text } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useDevicePosition } from '@/lib/use-device-position'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const EMPTY_ITEMS: AutoCompleteItem[] = []

/** The answer to one request, tagged with the text it answered. */
type SearchResult = { query: string; items: AutoCompleteItem[]; failed: boolean }

/**
 * Navigator search combobox.
 *
 * Results come from the Payload `search` collection through
 * `/api/navigator-search`, limited to the home scope (tours first, then
 * contents and museums; only the locked museum in museum mode). The server
 * also matches museum cities, so typing "Roma" surfaces what is in Rome.
 * Choosing a result opens its detail page. When the browser already shares
 * the visitor's position, results near them say so.
 */
export function NavigatorSearch({
  lng,
  initialItems = EMPTY_ITEMS,
  onNavigate,
}: {
  lng: string
  initialItems?: AutoCompleteItem[]
  /** Override for tests/stories; the real page uses a normal browser navigation. */
  onNavigate?: (href: string) => void
}) {
  const { t } = useTranslation('search')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  // Bumped by "Try again" to repeat the request for the same text.
  const [attempt, setAttempt] = useState(0)
  const [debouncedQuery] = useDebouncedValue(query, 180)
  // Only a position the visitor already shares (never asked from here): it
  // marks the results near them, computed in the browser.
  const { coords } = useDevicePosition()

  useEffect(() => {
    const controller = new AbortController()
    const trimmed = debouncedQuery.trim()
    const params = new URLSearchParams({ locale: lng, limit: '8' })
    if (trimmed) params.set('q', trimmed)

    fetch(`/api/navigator-search?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Search failed with ${response.status}`)
        return (await response.json()) as { items?: AutoCompleteItem[] }
      })
      .then((data) => setResult({ query: trimmed, items: data.items ?? [], failed: false }))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return
        setResult({ query: trimmed, items: [], failed: true })
      })

    return () => controller.abort()
  }, [debouncedQuery, lng, attempt])

  // Derived, not stored: the search is loading whenever the last answer is
  // not for the text in the field. A flag set on typing stayed stuck when the
  // text went back to an already-fetched value before the debounce fired.
  const trimmedQuery = query.trim()
  const status: SearchStatus =
    result === null || result.query !== trimmedQuery ? 'loading' : result.failed ? 'error' : 'idle'
  const items = result?.items ?? initialItems

  return (
    <>
      {/* The field floats: a close soft shadow plus a wide one pushed down
          under the pill give it the depth the former Reflection gave (its
          shadow sat at 0.2 opacity), attached to the field instead of a
          separate gray smudge below it, and without that component's hidden
          copy of the search. Mantine's lg shadow (0.05) was too faint to
          read. The radius matches the input's `xl` pill. */}
      <Box className="rounded-[2rem] shadow-[0_2px_6px_rgb(0_0_0/0.06),0_22px_30px_-14px_rgb(0_0_0/0.3)]">
        <ArtAroundGlobalSearch
          items={items}
          value={query}
          onChange={setQuery}
          status={status}
          onRetry={() => {
            setResult(null)
            setAttempt((count) => count + 1)
          }}
          browse={{ label: t('Browse all tours'), href: `/${lng}/marketplace` }}
          origin={coords}
          // Results are already filtered by Payload; do not apply the local
          // title-only filter or a city/excerpt match would disappear.
          filter={() => true}
          onOptionSubmit={(value) => {
            if (onNavigate) onNavigate(value)
            else window.location.assign(value)
          }}
        />
      </Box>
      {/* Always mounted, so screen readers hear the outcome even with the
          list closed. Visually hidden: the open list shows the same message
          with its hint and its way out. */}
      <Text className="sr-only" role="status" aria-live="polite">
        {status === 'error'
          ? t('Search is not reachable right now.')
          : status === 'idle' && trimmedQuery && items.length === 0
            ? t('Nothing matches “{{query}}”.', {
                query: trimmedQuery,
                interpolation: { escapeValue: false },
              })
            : ''}
      </Text>
    </>
  )
}
