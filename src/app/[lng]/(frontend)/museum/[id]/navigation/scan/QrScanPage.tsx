'use client'

import i18nConfig from '@/../i18n.config'
import { QrScanner } from '@/components/Scanner'
import { CloseButton, Stack } from '@mantine/core'
import type { Route } from 'next'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { inLanguage } from '@/lib/app-url'
import { navigationDetailPath, withNavigationPosition } from '@/lib/tour-navigation'
import { useNavigationScope } from '../TourNavigationShell'

/**
 * Scans canonical museum links and routes them into the current navigation (a
 * tour, or free navigation of the museum) with `at`/`to` intact: a canonical
 * object/content URL opens directly as that navigation's contextual modal.
 * Outside a navigation (the navigator home's `/scan`) a scanned link opens as
 * an ordinary page, and closing returns to the navigator.
 */
export function QrScanPage() {
  const router = useRouter()
  const { t } = useTranslation('tour-navigation')
  const { lng: currentLng } = useParams<{ lng: string }>()
  const search = useSearchParams()
  const navigation = useNavigationScope()
  const close = () => {
    router.replace(
      navigation
        ? withNavigationPosition(navigation.base, search.toString())
        : (`/${currentLng}/navigator` as Route),
    )
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
        // Inside a navigation, a canonical object/content code opens straight
        // in this map's modal (a tour's next stop as `/open`). Going through
        // the canonical URL would also work (one interceptor per route in the
        // museum navigation `@modal`), but the museum details page's
        // `@object` interceptor matches the same URLs from below
        // `/museum/[id]` and can win that race, remounting the map.
        const canonical = CANONICAL_DETAIL.exec(pathname)
        const target =
          navigation && canonical
            ? navigationDetailPath(
                currentLng,
                navigation.scope,
                canonical[2] as 'content' | 'object',
                canonical[3],
              )
            : pathname
        // A group's QR code opens its join page as is; museum links keep the position.
        router.replace(
          (GROUP_ROOM.test(pathname)
            ? pathname
            : withNavigationPosition(target, search.toString())) as Route,
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
        finder: true,
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
