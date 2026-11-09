'use client'

import { Pagination, type PaginationProps } from '@mantine/core'
import { useTranslation } from 'react-i18next'

/**
 * Mantine's `Pagination` with names on every control: its page buttons carry
 * only a number and its arrows only an icon, which screen readers announced
 * as unnamed buttons. Wrapped in a `nav` landmark named by `label`. Used by
 * the search pages (`SearchShell`).
 */
export function LabeledPagination({
  label,
  ...props
}: Omit<PaginationProps, 'getItemProps' | 'getControlProps'> & {
  /** The landmark's name; "Result pages" when omitted. */
  label?: string
}) {
  const { t } = useTranslation('common')
  return (
    <nav aria-label={label ?? t('Result pages')}>
      <Pagination
        {...props}
        getItemProps={(page) => ({ 'aria-label': t('Page {{page}}', { page }) })}
        getControlProps={(control) => ({
          'aria-label': {
            first: t('First page'),
            previous: t('Previous page'),
            next: t('Next page'),
            last: t('Last page'),
          }[control],
        })}
      />
    </nav>
  )
}
