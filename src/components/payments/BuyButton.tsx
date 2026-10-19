'use client'

import { Button, Stack, Text } from '@mantine/core'
import { useState } from 'react'

type BuyButtonProps = {
  collection: 'contents' | 'tours'
  id: string
  /** Current app locale, so Stripe redirects back to the right translated page. */
  locale: string
  label?: string
  disabled?: boolean
}

/**
 * Starts a sandbox Stripe Checkout Session through `POST /api/checkout` and
 * redirects the browser to Stripe's hosted page. No card data ever touches this
 * app — Stripe Checkout is PCI-compliant out of the box.
 */
export function BuyButton({ collection, id, locale, label = 'Buy', disabled }: BuyButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startCheckout() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, id, locale }),
      })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }

      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error ?? 'Checkout failed. Please try again.')
    } catch {
      setError('Checkout failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack gap={4} align="flex-start">
      <Button onClick={startCheckout} loading={loading} disabled={disabled}>
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
