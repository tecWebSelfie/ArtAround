'use client'

import { NavigationProgress, useNprogress } from '@mantine/nprogress'
import { usePathname, useSearchParams } from 'next/navigation'
import { useT } from 'next-i18next/client'
import { Suspense, useEffect } from 'react'
import { endAllNavigations, navigationProgressStore } from '@/lib/navigation-progress'

/**
 * The app's one navigation indicator: a 3px bar at the top edge of the
 * viewport, mounted once by the frontend layout. The top edge is the only
 * place present on every surface (phones have no fixed header, the desktop
 * header and the tab bar both disappear on immersive map/scan views).
 *
 * It only shows what `src/lib/navigation-progress.ts` decides (delay,
 * minimum time, opt-in callers). Colour: the theme primary, so the museum's
 * colour in museum mode; on dark surfaces the lighter shade DESIGN.md uses
 * for the primary there, so a dark museum colour stays visible.
 */
export function NavigationProgressBar() {
  const { t } = useT()
  const { mounted } = useNprogress(navigationProgressStore)
  return (
    <>
      <NavigationProgress
        store={navigationProgressStore}
        color="light-dark(var(--mantine-primary-color-filled), var(--mantine-primary-color-4))"
        className="navigation-progress"
        data-testid="navigation-progress"
        aria-label={t('Loading page')}
        // Mantine keeps the progressbar in the DOM at 0% while hidden: without
        // this, assistive tech would find a permanent, idle progress bar. Page
        // changes are announced by the router and focus, not by the bar.
        aria-hidden={!mounted}
      />
      {/* useSearchParams needs a Suspense boundary in a layout. */}
      <Suspense fallback={null}>
        <EndOnUrlCommit />
      </Suspense>
    </>
  )
}

/**
 * Fallback end signal: once the URL commits, every navigation is over, also
 * those whose reporter unmounted mid-way (a link in a closing menu) or whose
 * server redirect landed on another URL than the one clicked.
 */
function EndOnUrlCommit() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  useEffect(() => {
    endAllNavigations()
  }, [pathname, search])
  return null
}
