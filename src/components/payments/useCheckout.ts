'use client'

import { useState } from 'react'

/**
 * Starts a sandbox Stripe Checkout Session through `POST /api/checkout` and
 * sends the browser to Stripe's hosted page. The server prices the purchase
 * for the signed-in visitor (`src/lib/checkout-quote.ts`), so callers only say
 * *what* is being bought. Used by `BuyButton` and the tour page's unlock modal.
 */
export function useCheckout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startCheckout(input: {
    collection: 'contents' | 'tours'
    id: string
    locale: string
  }) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (res.ok && data.url) {
        // Leaves the app: keep the loading state until the page unloads.
        window.location.href = data.url
        return
      }
      setError(data.error ?? 'Checkout failed. Please try again.')
    } catch {
      setError('Checkout failed. Please try again.')
    }
    setLoading(false)
  }

  return { startCheckout, loading, error }
}
