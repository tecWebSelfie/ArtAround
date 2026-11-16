'use client'

import { Button } from '@mantine/core'
import { ArrowLeft } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import i18nConfig from '@/../i18n.config'
import { LanguageSwitcher } from '@/components/mantine/LanguageSwitcher'

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
 *
 * `withLanguage` puts the language switcher at the other end of the same row
 * on phones, the place the GOV.UK/DWP language-toggle pattern uses (right,
 * level with Back, on every page). Visitor pages turn it on: a visitor who
 * lands on a work or a content from a QR code must be able to change
 * language right there, and below `md` these pages have no site header (it
 * carries the switcher from `md`, so the row's copy hides there). Editors
 * leave it off: switching language there would switch the edited locale.
 */
export function BackButton({
  href,
  label,
  withLanguage = false,
}: {
  href: Route
  label?: string
  withLanguage?: boolean
}) {
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

  const back = (
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
  if (!withLanguage) return back
  return (
    <div className="flex items-center justify-between gap-(--mantine-spacing-xs) self-stretch">
      {back}
      <div className="from-md:hidden">
        <LanguageSwitcher supportedLngs={i18nConfig.supportedLngs} />
      </div>
    </div>
  )
}
