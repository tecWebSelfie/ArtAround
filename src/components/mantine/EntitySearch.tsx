import { Button, Group, Paper, Text, TextInput } from '@mantine/core'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'

/**
 * The search bar of an entity page (`/search/tours`, `/search/objects`,
 * `/search/contents`).
 *
 * A plain GET form, so it works without JavaScript and the query lives in the
 * URL (`?q=…&page=…`): the page is shareable and survives a reload. Results
 * come from the Typesense index; only the picker modes (tour editor, map
 * editor) still read Payload directly.
 */
function hrefFor(basePath: string, query: string, page: number, keep: Record<string, string>) {
  const params = new URLSearchParams(keep)
  if (query.trim()) params.set('q', query.trim())
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return (qs ? `${basePath}?${qs}` : basePath) as Route
}

export function EntitySearch({
  basePath,
  initialQuery,
  page,
  totalPages,
  placeholder,
  labels,
  keepParams,
}: {
  basePath: string
  initialQuery: string
  page: number
  totalPages: number
  placeholder: string
  labels: { search: string }
  /** Extra URL state to keep (search scopes and picker parameters). */
  keepParams?: Record<string, string>
}) {
  const keep = keepParams ?? {}

  return (
    <Group wrap="nowrap" gap="sm" align="flex-start" justify="space-between">
      <Paper
        component="form"
        action={basePath}
        method="get"
        withBorder
        radius="lg"
        p={{ base: 'sm', sm: 'md' }}
        style={{ flex: 1 }}
      >
        {Object.entries(keep).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Group gap="xs" wrap="nowrap">
          <TextInput
            name="q"
            flex={1}
            size="md"
            radius="md"
            defaultValue={initialQuery}
            placeholder={placeholder}
            aria-label={placeholder}
            leftSection={<Search size={18} aria-hidden />}
          />
          <Button type="submit" size="md">
            {labels.search}
          </Button>
        </Group>
      </Paper>

      {totalPages > 1 ? (
        // Prev/next only: an entity page's result set is rarely navigated deep,
        // and plain links keep this component server-rendered.
        <Group gap={4} wrap="nowrap">
          {page > 1 && (
            <Button
              component={Link}
              href={hrefFor(basePath, initialQuery, page - 1, keep)}
              variant="subtle"
              size="compact-sm"
              leftSection={<ChevronLeft size={16} aria-hidden />}
            >
              {page - 1}
            </Button>
          )}
          <Text size="sm" c="dimmed">
            {page} / {totalPages}
          </Text>
          {page < totalPages && (
            <Button
              component={Link}
              href={hrefFor(basePath, initialQuery, page + 1, keep)}
              variant="subtle"
              size="compact-sm"
              rightSection={<ChevronRight size={16} aria-hidden />}
            >
              {page + 1}
            </Button>
          )}
        </Group>
      ) : null}
    </Group>
  )
}
