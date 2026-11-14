import { LinkButton } from '@/components/editing/LinkButton'
import { getT } from '@/i18n.server'
import type { SearchScope } from '@/lib/search-scope'
import type { ScopeParam } from '@/lib/search-url'
import { Group } from '@mantine/core'
import { Landmark, Tag, UserRound, X } from 'lucide-react'
import type { Route } from 'next'

const ICON: Record<ScopeParam, typeof Landmark> = {
  at: Landmark,
  author: UserRound,
  subject: Tag,
}

/**
 * The URL scopes of a search page (`src/lib/search-scope.ts`) as removable
 * chips under its title: "At Brera ×", "By Chiara Moretti ×". A "See all"
 * link opens the search already narrowed, and these say so; each chip is a
 * link to the same search without that one scope (and back to page 1), so
 * the visitor can widen the list a step at a time. Server-rendered links:
 * removing a scope works without JavaScript.
 */
export async function SearchScopeChips({
  scopes,
  basePath,
  searchParams,
}: {
  scopes: SearchScope[]
  basePath: string
  searchParams: Record<string, string | string[] | undefined>
}) {
  const { t } = await getT('search')
  if (scopes.length === 0) return null

  const label = (scope: SearchScope) =>
    ({
      at: t('At {{name}}', { name: scope.name }),
      author: t('By {{name}}', { name: scope.name }),
      subject: t('About {{name}}', { name: scope.name }),
    })[scope.param]

  const hrefWithout = (param: ScopeParam) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === param || key === 'page' || value === undefined) continue
      for (const entry of Array.isArray(value) ? value : [value]) params.append(key, entry)
    }
    const query = params.toString()
    return (query ? `${basePath}?${query}` : basePath) as Route
  }

  return (
    <Group gap="xs">
      {scopes.map((scope) => {
        const Icon = ICON[scope.param]
        return (
          <LinkButton
            key={scope.param}
            href={hrefWithout(scope.param)}
            variant="light"
            radius="xl"
            size="compact-sm"
            // The name can be long (a museum, a full name): it wraps no
            // further than the chip and ends in an ellipsis.
            maw="100%"
            leftSection={<Icon size={14} aria-hidden />}
            rightSection={<X size={14} aria-hidden />}
            aria-label={t('Remove filter: {{filter}}', { filter: label(scope) })}
          >
            {label(scope)}
          </LinkButton>
        )
      })}
    </Group>
  )
}
