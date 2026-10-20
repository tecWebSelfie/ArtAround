'use client'

import i18nConfig from '@/../i18n.config'
import { QrScanner } from '@/components/Scanner'
import { CloseButton, Stack } from '@mantine/core'
import type { Route } from 'next'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { inLanguage } from '@/lib/app-url'
import { withNavigationPosition } from '@/lib/tour-navigation'
import { useNavigationScope } from '../../TourNavigationShell'

/**
 * Scans canonical museum links and routes them into the current navigation (a
 * tour, or free navigation of the museum) with `at`/`to` intact: the canonical
 * object/content URL is intercepted by that navigation's modal slot.
 */
export function QrScanPage() {
  const router = useRouter()
  const { lng: currentLng } = useParams<{ lng: string }>()
  const search = useSearchParams()
  const navigation = useNavigationScope()
  const close = () => {
    if (navigation) router.replace(withNavigationPosition(navigation.base, search.toString()))
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
        // A group's QR code opens its join page as is; museum links keep the position.
        router.replace(
          (GROUP_ROOM.test(pathname)
            ? pathname
            : withNavigationPosition(pathname, search.toString())) as Route,
        )
      }}
      onClose={close}
      onInvalid={(rawValue) => console.error('QR code non valido:', rawValue)}
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
          aria-label="Chiudi scanner"
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
    '/[lng]/tour/[id]/navigation/[stepId]',
    new RegExp(`^/(${lng})/tour/([^/]+)/navigation/([^/]+)$`),
  ),
  scannable('/[lng]/museum/[id]/navigation', new RegExp(`^/(${lng})/museum/([^/]+)/navigation$`)),
  scannable('/[lng]/tour/[id]', new RegExp(`^/(${lng})/tour/([^/]+)$`)),
  scannable('/[lng]/object/[id]', new RegExp(`^/(${lng})/object/([^/]+)$`)),
  scannable('/[lng]/content/[id]', new RegExp(`^/(${lng})/content/([^/]+)$`)),
  scannable('/[lng]/museum/[id]', new RegExp(`^/(${lng})/museum/([^/]+)$`)),
  // Group tours: the host's "Show QR code" (ShareGroup).
  scannable('/[lng]/room/[code]', new RegExp(`^/(${lng})/room/([^/]+)$`)),
]

const GROUP_ROOM = new RegExp(`^/(${lng})/room/`)
