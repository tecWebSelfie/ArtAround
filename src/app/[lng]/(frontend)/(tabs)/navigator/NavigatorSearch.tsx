'use client'

import {
  ArtAroundGlobalSearch,
  type AutoCompleteItem,
} from '@/components/mantine/ArtAroundGlobalSearch'
import { TypeWriterText } from '@/components/mantine/TypeWriterText'
import { Reflection } from '@gfazioli/mantine-reflection'
import { Box, Group, Stack, Text } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useEffect, useState } from 'react'

const EMPTY_ITEMS: AutoCompleteItem[] = []

/**
 * Navigator search combobox.
 *
 * Results come from the Payload `search` collection through
 * `/api/navigator-search`, limited to the navigator scope (museums, objects,
 * tours, users). The server also matches museum cities, so typing "Roma"
 * surfaces museums/tours/objects in that city; the city is shown as result
 * metadata.
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
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<AutoCompleteItem[]>(initialItems)
  const [loading, setLoading] = useState(false)
  const [debouncedQuery] = useDebouncedValue(query, 180)

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
      .then((data) => {
        setItems(data.items ?? [])
        setLoading(false)
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return
        setItems(initialItems)
        setLoading(false)
      })

    return () => controller.abort()
  }, [debouncedQuery, initialItems, lng])

  return (
    <Stack>
      <Group ta="center" gap="xs" display="inline-block">
        <Text span>Tours made by&nbsp;</Text>
        <Box miw="9ch" display="inline-block" ta="left">
          <TypeWriterText
            fw="bolder"
            loopColors={{ creators: 'red.8', curators: 'green.8', museums: 'blue.8' }}
            value={['creators', 'curators', 'museums']}
            fallbackColor="gray"
          />
        </Box>
      </Group>
      <Reflection
        rippleStrength={30}
        rippleFrequency={0.025}
        reflectionDistance={-10}
        reflectionOpacity={0}
        reflectionStretch={0.33}
        shadowOffset={-50}
        shadowOpacity={0.2}
        shadowBlur={5.51}
        shadowSize={29}
        shadowScaleX={1}
        shadowScaleY={1.24}
      >
        <ArtAroundGlobalSearch
          items={items}
          value={query}
          onChange={(value) => {
            setQuery(value)
            // Loading is an event-driven state (not an effect state) so the
            // empty-state message does not flash while the request is in flight.
            setLoading(true)
          }}
          // Results are already filtered by Payload; do not apply the local
          // title-only filter or a city/excerpt match would disappear.
          filter={() => true}
          onOptionSubmit={(value) => {
            if (onNavigate) onNavigate(value)
            else window.location.assign(value)
          }}
        />
      </Reflection>
      {!loading && query.trim().length >= 2 && items.length === 0 ? (
        <Text size="xs" c="dimmed" ta="center">
          No matching museums, objects, tours or people.
        </Text>
      ) : null}
    </Stack>
  )
}
