'use client'

import { createNprogress } from '@mantine/nprogress'
import { useEffect, useRef } from 'react'

/**
 * Driver of the global navigation bar (`NavigationProgressBar`, a Mantine
 * `NavigationProgress` at the top edge of the viewport).
 *
 * Mantine's store only knows start/complete; this module adds the timing
 * rules from the research report (reports/Indicatore caricamento
 * navigazione.md):
 * - the bar appears only after `SHOW_DELAY_MS`, so prefetched or cached
 *   navigations never flash it;
 * - once shown it stays at least `MIN_VISIBLE_MS`, so a navigation that ends
 *   just after the delay doesn't blink;
 * - overlapping navigations share one bar (a counter of open tokens);
 * - `SAFETY_TIMEOUT_MS` closes a token nobody ended (a navigation that was
 *   cancelled or errored), resetting the bar instead of faking 100%.
 *
 * Callers never touch the store: they call `beginNavigation()` when a
 * user-initiated navigation starts waiting and call the returned `end` when it
 * settles (`ProgressLink`, `useProgressRouter`). Navigations that are not
 * page changes (tour steps, search filters, group following, refreshes) simply
 * don't call it: the bar is opt-in by design.
 */

export const SHOW_DELAY_MS = 200
export const MIN_VISIBLE_MS = 350
export const SAFETY_TIMEOUT_MS = 12_000

// An isolated store: nothing else in the app (or in a dependency) can move
// this bar through Mantine's shared default `nprogress`.
export const [navigationProgressStore, navigationProgressBar] = createNprogress()

const open = new Set<() => void>()
let showTimer: ReturnType<typeof setTimeout> | undefined
let hideTimer: ReturnType<typeof setTimeout> | undefined
let shownAt: number | null = null

function show() {
  showTimer = undefined
  shownAt = Date.now()
  // A finishing bar (100%, fading out) must start again from the beginning.
  navigationProgressBar.reset()
  navigationProgressBar.start()
}

function settle(timedOut: boolean) {
  if (showTimer !== undefined) {
    // Ended before the delay: the bar never appeared, nothing to hide.
    clearTimeout(showTimer)
    showTimer = undefined
    return
  }
  if (shownAt === null) return
  if (timedOut) {
    // Don't claim the page arrived: just take the bar away.
    shownAt = null
    navigationProgressBar.reset()
    return
  }
  const remaining = MIN_VISIBLE_MS - (Date.now() - shownAt)
  const finish = () => {
    hideTimer = undefined
    shownAt = null
    navigationProgressBar.complete()
  }
  if (remaining > 0) hideTimer = setTimeout(finish, remaining)
  else finish()
}

/** Starts a navigation; returns its idempotent `end`. */
export function beginNavigation(): () => void {
  if (hideTimer !== undefined) {
    // A new navigation while the previous one waits out its minimum: keep the
    // bar up and let this one finish it.
    clearTimeout(hideTimer)
    hideTimer = undefined
  } else if (open.size === 0 && shownAt === null) {
    showTimer = setTimeout(show, SHOW_DELAY_MS)
  }

  let ended = false
  const safety = setTimeout(() => end(true), SAFETY_TIMEOUT_MS)
  function end(timedOut = false) {
    if (ended) return
    ended = true
    clearTimeout(safety)
    open.delete(end)
    if (open.size === 0) settle(timedOut)
  }
  open.add(end)
  return end
}

/**
 * Ends every open navigation. Called when the URL commits: a token whose
 * reporter unmounted mid-navigation (a link in a closing drawer) would
 * otherwise wait for the safety timeout.
 */
export function endAllNavigations() {
  // Each `end` deletes itself; a Set iterator tolerates deleting the entry it
  // is on, so no copy is needed.
  for (const end of open) end()
}

/**
 * Reports a pending flag (a link's `useLinkStatus`, a router transition) as
 * one navigation. The token outlives an unmount on purpose: a link in a
 * closing menu unmounts while its page is still loading, and the URL-commit
 * fallback (or the safety timeout) ends it instead.
 */
export function useNavigationPending(pending: boolean) {
  const endRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (pending && !endRef.current) endRef.current = beginNavigation()
    if (!pending && endRef.current) {
      endRef.current()
      endRef.current = null
    }
  }, [pending])
}
