'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useTransition } from 'react'
import { useNavigationPending } from '@/lib/navigation-progress'

/**
 * `useRouter()` whose `push`/`replace` drive the global navigation bar, for
 * code-triggered page changes (a search result, the language switch, a
 * planned tour, a scanned QR). Next runs every navigation in a transition, so
 * wrapping the call in ours keeps `isPending` true until the new page
 * commits.
 *
 * Only for real page changes: URL-state replaces (tour steps, search
 * filters, group following) and `refresh()` keep the plain router.
 */
export function useProgressRouter() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  useNavigationPending(isPending)

  return useMemo(
    () => ({
      ...router,
      push: ((...args) => startTransition(() => router.push(...args))) as typeof router.push,
      replace: ((...args) =>
        startTransition(() => router.replace(...args))) as typeof router.replace,
    }),
    // Stable while the router is: callers list `router` in effect deps, and a
    // new object per pending flip would re-run (and re-navigate) those effects.
    [router],
  )
}
