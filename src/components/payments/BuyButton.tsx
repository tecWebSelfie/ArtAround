'use client'

import { Button, Stack, Text } from '@mantine/core'

import { useCheckout } from './useCheckout'

type BuyButtonProps = {
  collection: 'contents' | 'tours'
  id: string
  /** Current app locale, so Stripe redirects back to the right translated page. */
  locale: string
  label?: string
  disabled?: boolean
}

/**
 * One-click purchase through Stripe Checkout (`useCheckout`). No card data ever
 * touches this app — Stripe Checkout is PCI-compliant out of the box.
 */
export function BuyButton({ collection, id, locale, label = 'Buy', disabled }: BuyButtonProps) {
  const { startCheckout, loading, error } = useCheckout()

  return (
    <Stack gap={4} align="flex-start">
      <Button
        onClick={() => void startCheckout({ collection, id, locale })}
        loading={loading}
        disabled={disabled}
      >
        {label}
      </Button>
      {error ? (
        <Text size="xs" c="red" role="alert">
          {error}
        </Text>
      ) : null}
    </Stack>
  )
}
