'use client'

import { ClearSearchButton } from '@/components/mantine/ClearSearchButton'
import { Stack, Text, TextInput } from '@mantine/core'
import { Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'

/**
 * The "Your museums" list, with a search field once it is long enough to
 * need one (more than `threshold` museums): with a handful the field would
 * be one more thing to read for nothing. The rows are rendered on the server
 * and passed in as elements; this only leaves out the ones whose `keys[i]`
 * (name and city) don't match the query.
 */
export function MuseumSearch({
  rows,
  keys,
  threshold = 6,
  label,
  noMatch,
  className,
}: {
  /** The list's `li` elements, in order. */
  rows: ReactNode[]
  /** Per row, in the same order: the text it is found by. */
  keys: string[]
  threshold?: number
  /** The field's label and placeholder ("Find a museum"). */
  label: string
  /** Said when nothing matches. */
  noMatch: string
  /** The list's classes (its grid). */
  className: string
}) {
  const [query, setQuery] = useState('')
  const searchable = rows.length > threshold
  const needle = query.trim().toLocaleLowerCase()
  const shown =
    searchable && needle
      ? rows.filter((_, index) => keys[index].toLocaleLowerCase().includes(needle))
      : rows

  return (
    <Stack gap="md">
      {searchable && (
        <TextInput
          type="search"
          aria-label={label}
          placeholder={label}
          leftSection={<Search size={16} aria-hidden />}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          rightSection={query && <ClearSearchButton onClear={() => setQuery('')} />}
          rightSectionPointerEvents="all"
        />
      )}
      <ul className={className}>{shown}</ul>
      {shown.length === 0 && (
        <Text c="dimmed" ta="center" py="lg" role="status">
          {noMatch}
        </Text>
      )}
    </Stack>
  )
}
