'use client'

import { CloseButton } from '@mantine/core'
import { useTranslation } from 'react-i18next'

/**
 * The X at the right end of a search field: empties the query in one tap.
 * Shared by every visitor search (home, marketplace, map Spotlight, museum
 * switch) so they all clear the same way and carry the same translated label.
 *
 * Render it only while there is a query, in the input's `rightSection` with
 * `rightSectionPointerEvents="all"` (inputs ignore clicks there by default).
 * `preventDefault` on mouse down keeps focus in the input, so comboboxes that
 * close on blur stay open and the visitor can type again straight away.
 */
export function ClearSearchButton({ onClear }: { onClear: () => void }) {
  const { t } = useTranslation('common')
  return (
    <CloseButton
      aria-label={t('Clear search')}
      title={t('Clear search')}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClear}
    />
  )
}
