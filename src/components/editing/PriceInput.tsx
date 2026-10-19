'use client'

import { NumberInput } from '@mantine/core'
import { useTranslation } from 'react-i18next'

/**
 * Price editor in euros for a value stored as integer euro cents
 * (`contents.price`); empty or 0 means free. The server decides whether the
 * author may sell (verified creator, curator or director of the museum).
 */
export function PriceInput({
  cents,
  onChange,
  error,
}: {
  cents: number | null | undefined
  onChange: (cents: number | null) => void
  error?: string
}) {
  const { t } = useTranslation('editing')
  return (
    <NumberInput
      label={t('Price')}
      description={t(
        'Leave empty for a free content. Selling needs the verified badge of the object’s museum.',
      )}
      prefix="€ "
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      min={0}
      value={cents ? cents / 100 : ''}
      onChange={(value) =>
        onChange(typeof value === 'number' && value > 0 ? Math.round(value * 100) : null)
      }
      error={error}
    />
  )
}
