'use client'

import type { Route } from 'next'
import { useParams, useSearchParams } from 'next/navigation'

/**
 * Where the auth forms send the visitor once signed in. Pages that need a
 * session (`requireUser`) and the NavBar's "Sign in" link pass the page they
 * came from as `?next=`; the forms forward it on their cross-links so it
 * survives a detour from sign-in to sign-up.
 *
 * Only same-site relative paths are honoured, so `?next=` can't be used as an
 * open redirect; anything else falls back to the navigator.
 */
export function useReturnTo() {
  const { lng } = useParams<{ lng: string }>()
  const next = useSearchParams().get('next') ?? ''
  const safe = next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
  return {
    /** Destination after a successful sign-in or sign-up. */
    returnTo: (safe ? next : `/${lng}/navigator`) as Route,
    /** Query string to append to the other auth page, keeping the destination. */
    nextQuery: safe ? `?next=${encodeURIComponent(next)}` : '',
  }
}
