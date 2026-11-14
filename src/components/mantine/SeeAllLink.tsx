'use client'

import { Button } from '@mantine/core'
import { ChevronRight } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

/**
 * "See all ›": the hairline pill at the end of a section heading (the tour
 * deck, the objects and contents rows, the home's discover rails, a
 * subject's works), the one way every list says "there is more", that opens the
 * whole list as a search page already narrowed to that section's museum,
 * person or subject (`scopedSearchHref`, `src/lib/search-scope.ts`).
 * A control at rest, secondary to the cards (DESIGN.md → Tour deck).
 */
export function SeeAllLink({ href }: { href: Route }) {
  const { t } = useTranslation('common')
  return (
    <Button
      component={Link}
      href={href}
      variant="default"
      radius="xl"
      size="compact-sm"
      className="shrink-0"
      rightSection={<ChevronRight size={16} aria-hidden />}
    >
      {t('See all')}
    </Button>
  )
}
