import { LinkButton } from '@/components/editing/LinkButton'
import { Group, Stack, Title } from '@mantine/core'
import { X } from 'lucide-react'
import type { Route } from 'next'

export type MarketplaceActiveFilter = {
  id: string
  label: string
  removeLabel: string
  href: Route
}

/**
 * Keeps the result count and removable URL filters together, before the grid:
 * visitors can see why the list is narrow and widen it one filter at a time.
 */
export function MarketplaceResultsHeader({
  resultsLabel,
  filters,
  clearHref,
  clearLabel,
}: {
  resultsLabel: string
  filters: MarketplaceActiveFilter[]
  clearHref?: Route
  clearLabel: string
}) {
  return (
    <Stack gap="xs">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Title order={2} size="h4" className="tabular-nums">
          {resultsLabel}
        </Title>
        {clearHref && (
          <LinkButton href={clearHref} variant="subtle" size="compact-sm">
            {clearLabel}
          </LinkButton>
        )}
      </Group>
      {filters.length > 0 && (
        <Group gap="xs" wrap="wrap">
          {filters.map((filter) => (
            <LinkButton
              key={filter.id}
              href={filter.href}
              variant="light"
              radius="xl"
              size="compact-sm"
              rightSection={<X size={14} aria-hidden />}
              aria-label={filter.removeLabel}
            >
              {filter.label}
            </LinkButton>
          ))}
        </Group>
      )}
    </Stack>
  )
}
