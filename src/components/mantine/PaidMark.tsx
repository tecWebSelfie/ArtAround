import { ThemeIcon } from '@mantine/core'
import { Euro } from 'lucide-react'

/**
 * Small paid-orange currency mark: "this content is paid", readable at a glance
 * in a result row before the price badge says how much (DESIGN.md → Inputs).
 * Decorative: the `LockedPriceBadge` next to it carries the price in words.
 * The icon matches PRICE_CURRENCY (`src/lib/price.ts`, EUR).
 */
export function PaidMark() {
  return (
    <ThemeIcon
      color="orange"
      variant="light"
      radius="xl"
      size="sm"
      className="shrink-0"
      aria-hidden
    >
      <Euro size={12} />
    </ThemeIcon>
  )
}
