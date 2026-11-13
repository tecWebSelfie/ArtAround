'use client'

import { Button } from '@mantine/core'
import { ArrowLeft } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Whether the tab's previous history entry is a page of this app. The
 * Navigation API only lists same-origin entries, so `canGoBack` is false when
 * the visitor arrived from a QR code, a shared link or another site: there
 * the browser's Back would leave the app. Without the API (older browsers)
 * the answer is "no", and the button follows its link instead.
 */
function previousEntryIsInApp() {
  const navigation = (window as { navigation?: { canGoBack?: boolean } }).navigation
  return navigation?.canGoBack === true
}

/**
 * Back for a deep page (a tour, a work, a profile, an editor): returns where
 * the visitor came from when that was a page of the app, keeping its scroll
 * and state; otherwise it opens `href`, the page's parent (the tour's museum,
 * a search page), so a visitor landing from outside still has a way up.
 *
 * It is a real link to `href` (open in a new tab, crawlers, no JavaScript);
 * only a plain click is turned into a history step.
 */
export function BackButton({ href, label }: { href: Route; label?: string }) {
  const { t } = useTranslation('common')
  const router = useRouter()

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Modified clicks keep the link's own behavior (new tab, new window).
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
      return
    if (!previousEntryIsInApp()) return
    event.preventDefault()
    router.back()
  }

  return (
    <Button
      component={Link}
      href={href}
      onClick={onClick}
      variant="subtle"
      size="md"
      px="xs"
      className="self-start"
      leftSection={<ArrowLeft size={18} aria-hidden />}
    >
      {label ?? t('Back')}
    </Button>
  )
}
