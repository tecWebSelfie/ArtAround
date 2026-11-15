'use client'

import { ClearSearchButton } from '@/components/mantine/ClearSearchButton'
import { Button, Group, Stack, Text, TextInput } from '@mantine/core'
import { Search } from 'lucide-react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The "Your museums" list, with a search field once it is long enough to
 * need one (more than `threshold` museums): with a handful the field would
 * be one more thing to read for nothing. The rows are rendered on the server
 * and passed in as elements; this only leaves out the ones whose `keys[i]`
 * (name and city) don't match the query.
 *
 * The query lives in the URL (`?q=`, replaced, not pushed), so going to a
 * museum's map and coming back finds the list as it was left, and a link
 * keeps its filter. How many museums match is always said, in a polite live
 * region, so a screen reader hears it as the list narrows.
 */
export function MuseumSearch({
  rows,
  keys,
  threshold = 6,
  className,
}: {
  /** The list's `li` elements, in order. */
  rows: ReactNode[]
  /** Per row, in the same order: the text it is found by. */
  keys: string[]
  threshold?: number
  /** The list's classes. */
  className: string
}) {
  const { t } = useTranslation('user-page')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const searchable = rows.length > threshold
  const needle = query.trim().toLocaleLowerCase()
  const shown =
    searchable && needle
      ? rows.filter((_, index) => keys[index].toLocaleLowerCase().includes(needle))
      : rows

  const search = (next: string) => {
    setQuery(next)
    const params = new URLSearchParams(searchParams)
    if (next.trim()) params.set('q', next)
    else params.delete('q')
    const queryString = params.toString()
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}` as Route, {
      scroll: false,
    })
  }

  return (
    <Stack gap="md">
      {searchable && (
        <Stack gap={4}>
          <TextInput
            type="search"
            aria-label={t('Find a museum')}
            placeholder={t('Find a museum')}
            leftSection={<Search size={16} aria-hidden />}
            value={query}
            onChange={(event) => search(event.currentTarget.value)}
            rightSection={query && <ClearSearchButton onClear={() => search('')} />}
            rightSectionPointerEvents="all"
          />
          {/* Always mounted, so the change is announced, not an insertion. */}
          <Text size="sm" c="dimmed" aria-live="polite" className="tabular-nums">
            {needle && t('{{shown}} of {{total}}', { shown: shown.length, total: rows.length })}
          </Text>
        </Stack>
      )}
      {shown.length > 0 ? (
        <ul className={className}>{shown}</ul>
      ) : (
        <Group justify="center" gap="xs" py="lg">
          <Text c="dimmed">{t('No museum matches')}</Text>
          <Button variant="subtle" size="compact-sm" onClick={() => search('')}>
            {t('Clear the search')}
          </Button>
        </Group>
      )}
    </Stack>
  )
}
