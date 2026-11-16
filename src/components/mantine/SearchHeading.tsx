import { BackButton } from '@/components/navigation/BackButton'
import { LinkButton } from '@/components/editing/LinkButton'
import { getT } from '@/i18n.server'
import type { SearchScope } from '@/lib/search-scope'
import { Group, Stack, Text, Title } from '@mantine/core'
import { FilterX } from 'lucide-react'
import type { Route } from 'next'
import { SearchScopeChips } from './SearchScopeChips'

/**
 * The head of a plain search page (tours, contents, objects): the `h1` names
 * the kind, a dimmed line counts what the current filters match, and the
 * URL scopes follow as removable chips. Read top to bottom it answers "what
 * am I looking at, how much of it, narrowed by what" before the filter field
 * and the results. Picker modes keep their own heading.
 *
 * Nothing matches while something narrows the list (a filter or a scope):
 * one "Clear all filters" link back to the whole search, so an empty page
 * always has a way forward.
 */
export async function SearchHeading({
  title,
  total,
  scopes,
  filtered,
  basePath,
  searchParams,
}: {
  title: string
  total: number
  /** Whether the composite filters hold anything (scopes count on their own). */
  filtered: boolean
  scopes: SearchScope[]
  basePath: string
  searchParams: Record<string, string | string[] | undefined>
}) {
  const { t, lng } = await getT('search')
  return (
    <Stack gap="xs">
      {/* Up a level: back where the visitor came from (a "See all"), else
          the navigator, the search's home. */}
      <BackButton href={`/${lng}/navigator` as Route} />
      <Stack gap={2}>
        <Title order={1} size="h2">
          {title}
        </Title>
        {/* Polite live region: the count follows the filters as they change. */}
        <Group gap="sm">
          <Text size="sm" c="dimmed" className="tabular-nums" role="status">
            {t('{{count}} results', { count: total })}
          </Text>
          {total === 0 && (filtered || scopes.length > 0) && (
            <LinkButton
              href={basePath as Route}
              variant="subtle"
              size="compact-sm"
              leftSection={<FilterX size={14} aria-hidden />}
            >
              {t('Clear all filters')}
            </LinkButton>
          )}
        </Group>
      </Stack>
      <SearchScopeChips scopes={scopes} basePath={basePath} searchParams={searchParams} />
    </Stack>
  )
}
