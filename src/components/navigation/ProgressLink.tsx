'use client'

import Link, { useLinkStatus, type LinkProps } from 'next/link'
import { useNavigationPending } from '@/lib/navigation-progress'

/**
 * `next/link` that drives the global navigation bar while its navigation
 * waits on the server. Use it (directly or as Mantine `component={…}`) for
 * links that change page; keep plain `Link` for URL-state links whose page
 * stays (tour steps and modals, filters), which must never light the bar.
 *
 * `useLinkStatus` is pending only for a navigation that actually waits: a
 * prefetched route, an external or new-tab link, a modifier click or a
 * download never report, so they never start the bar.
 */
export function ProgressLink<RouteType>({ children, ...props }: LinkProps<RouteType>) {
  return (
    <Link {...props}>
      {children}
      <LinkPendingReporter />
    </Link>
  )
}

function LinkPendingReporter() {
  useNavigationPending(useLinkStatus().pending)
  return null
}
