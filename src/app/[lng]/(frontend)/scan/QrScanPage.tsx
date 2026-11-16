'use client'

import i18nConfig from '@/../i18n.config'
import { QrScanner } from '@/components/Scanner'
import { CloseButton, Stack } from '@mantine/core'
import type { Route } from 'next'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { inLanguage } from '@/lib/app-url'
import { parseNavigationPathname, withNavigationPosition } from '@/lib/tour-navigation'

/**
 * The QR scanner, always on its own page (`/[lng]/scan`): the camera never
 * shares the screen with the map, whose controls and directions made it
 * confusing. A museum navigation opens it with `?from=` set to the map URL it
 * left (tour cursor, `at`, `to`, … included, see `navigationScanPath`):
 * - a canonical object/content code opens over that same map as its
 *   contextual modal, with the position intact (the tour's next stop as
 *   `/open`, which the content modal itself redirects to);
 * - any other code opens as its own page; closing returns to the map.
 * Without `from` (the navigator home's "Scan"), a scanned link opens as an
 * ordinary page and closing returns to the navigator.
 */
export function QrScanPage() {
  const router = useRouter()
  const { t } = useTranslation('tour-navigation')
  const { lng: currentLng } = useParams<{ lng: string }>()
  const navigation = returnNavigation(useSearchParams().get('from'))
  const close = () => {
    router.replace(navigation?.href ?? (`/${currentLng}/navigator` as Route))
  }
  return (
    <QrScanner
      // Codes may be language-free (`/tour/42`): match and open them in the
      // app's current language (inLanguage).
      isAllowedPath={(pathname) =>
        ALLOWED_QR_PATTERNS.some(({ match }) => match.test(inLanguage(pathname, currentLng)))
      }
      onScan={(url) => {
        const pathname = inLanguage(url.pathname, currentLng)
        // From a navigation, a canonical object/content code opens straight
        // in that map's modal. Not through the canonical URL: from this page
        // no navigation interceptor applies, so it would open as a full page.
        const canonical = CANONICAL_DETAIL.exec(pathname)
        if (navigation && canonical) {
          router.replace(
            withNavigationPosition(
              `${navigation.pathname}/${canonical[2]}/${canonical[3]}`,
              navigation.search,
            ),
          )
          return
        }
        // A group's QR code opens its join page as is; other museum links
        // keep the position the visitor came with.
        router.replace(
          (GROUP_ROOM.test(pathname) || !navigation
            ? pathname
            : withNavigationPosition(pathname, navigation.search)) as Route,
        )
      }}
      onClose={close}
      onInvalid={(rawValue) => console.error('Unsupported QR code:', rawValue)}
      styles={{
        container: {
          position: 'fixed',
          inset: '0',
        },
      }}
      components={{
        zoom: true,
        torch: true,
      }}
    >
      <Stack p="md" align="end">
        <CloseButton
          aria-label={t('Close the scanner')}
          onClick={close}
          size={'lg'}
          className="border solid rounded-full bg-(--mantine-color-white)"
        />
      </Stack>
    </QrScanner>
  )
}

/**
 * Dichiara un pattern scansionabile. `Route<T>` risolve al pattern stesso solo
 * se corrisponde a una pagina esistente, a `never` altrimenti: una pagina
 * rinominata o cancellata rompe la build qui invece di fallire in silenzio.
 */
function scannable<T extends string>(pattern: T & Route<T>, match: RegExp) {
  return { pattern, match }
}

const lng = i18nConfig.supportedLngs.join('|')

const ALLOWED_QR_PATTERNS = [
  scannable(
    '/[lng]/museum/[id]/navigation/tour/[tourId]/[stepId]',
    new RegExp(`^/(${lng})/museum/([^/]+)/navigation/tour/([^/]+)/([^/]+)$`),
  ),
  scannable('/[lng]/museum/[id]/navigation', new RegExp(`^/(${lng})/museum/([^/]+)/navigation$`)),
  // Codes printed before tours moved under their museum: the route handler at
  // `tour/[id]/navigation/[[...rest]]` redirects them (308) to the URL above.
  {
    pattern: '/[lng]/tour/[id]/navigation/[[...rest]]',
    match: new RegExp(`^/(${lng})/tour/([^/]+)/navigation/([^/]+)$`),
  },
  scannable('/[lng]/tour/[id]', new RegExp(`^/(${lng})/tour/([^/]+)$`)),
  scannable('/[lng]/object/[id]', new RegExp(`^/(${lng})/object/([^/]+)$`)),
  scannable('/[lng]/content/[id]', new RegExp(`^/(${lng})/content/([^/]+)$`)),
  scannable('/[lng]/museum/[id]', new RegExp(`^/(${lng})/museum/([^/]+)$`)),
  // Group tours: the host's "Show QR code" (ShareGroup).
  scannable('/[lng]/room/[code]', new RegExp(`^/(${lng})/room/([^/]+)$`)),
]

const GROUP_ROOM = new RegExp(`^/(${lng})/room/`)

/** A canonical object/content page: `[, lng, kind, id]`. */
const CANONICAL_DETAIL = new RegExp(`^/(${lng})/(object|content)/([^/]+)$`)

/**
 * The navigation map named by `?from=`, split for building URLs on it: only
 * a same-site path of a museum navigation counts (`parseNavigationPathname`),
 * so a crafted link can't send the visitor elsewhere after a scan.
 */
function returnNavigation(from: string | null) {
  if (!from?.startsWith('/') || from.startsWith('//')) return null
  const url = new URL(from, 'https://app.invalid')
  if (!parseNavigationPathname(url.pathname)) return null
  const pathname = url.pathname.replace(/\/$/, '')
  const search = url.searchParams.toString()
  return { pathname, search, href: withNavigationPosition(pathname, search) }
}
