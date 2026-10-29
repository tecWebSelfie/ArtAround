'use client'

import { Button, Stack, Text } from '@mantine/core'
import { ShoppingBag } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useCheckout } from './useCheckout'

/**
 * Paid-orange purchase button for one content (DESIGN.md → Buttons,
 * Acquisition): always with `ShoppingBag` and the price in the label. The
 * server prices the checkout (`src/lib/checkout-quote.ts`).
 */
export function UnlockContentButton({
  contentId,
  label,
  fullWidth = false,
}: {
  contentId: string
  label: string
  /** See `ContentUnlock`'s `fullWidth`. */
  fullWidth?: boolean
}) {
  const { lng } = useParams<{ lng: string }>()
  const { startCheckout, loading, error } = useCheckout()
  return (
    <Stack gap={4}>
      <Button
        color="orange"
        autoContrast
        rightSection={<ShoppingBag size={16} aria-hidden />}
        loading={loading}
        w={fullWidth ? '100%' : { base: '100%', sm: 'auto' }}
        onClick={() => void startCheckout({ collection: 'contents', id: contentId, locale: lng })}
      >
        {label}
      </Button>
      {error && (
        <Text size="sm" c="red" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  )
}
