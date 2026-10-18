'use client'

import i18nConfig from '@/../i18n.config'
import { QrScanner } from '@/components/Scanner'
import { CloseButton, Stack } from '@mantine/core'
import type { Route } from 'next'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { withNavigationPosition, tourNavigationPath } from '@/lib/tour-navigation'

/** Scans canonical museum links and routes them into this tour with `at`/`to` intact. */
export function QrScanPage() {
  const router = useRouter()
  const search = useSearchParams()
  const { lng, id: tourId, stepId } = useParams<{ lng: string; id: string; stepId: string }>()
  const close = () =>
    router.replace(
      withNavigationPosition(tourNavigationPath(lng, tourId, Number(stepId)), search.toString()),
    )
  return (
    <QrScanner
      isAllowedPath={(pathname) => ALLOWED_QR_PATTERNS.some(({ match }) => match.test(pathname))}
      onScan={(url) =>
        router.replace(withNavigationPosition(url.pathname, search.toString()) as Route)
      }
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
  scannable('/[lng]/tour/[id]', new RegExp(`^/(${lng})/tour/([^/]+)$`)),
  scannable('/[lng]/object/[id]', new RegExp(`^/(${lng})/object/([^/]+)$`)),
  scannable('/[lng]/content/[id]', new RegExp(`^/(${lng})/content/([^/]+)$`)),
  scannable('/[lng]/museum/[id]', new RegExp(`^/(${lng})/museum/([^/]+)$`)),
]
