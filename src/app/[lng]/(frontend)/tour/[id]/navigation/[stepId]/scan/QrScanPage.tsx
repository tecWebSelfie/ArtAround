'use client'

import i18nConfig from '@/../i18n.config'
import { QrScanner } from '@/components/Scanner'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'

export function QrScanPage() {
  const router = useRouter()
  return (
    <QrScanner
      isAllowedPath={(pathname) => ALLOWED_QR_PATTERNS.some(({ match }) => match.test(pathname))}
      onScan={(url) => router.push(`${url.pathname}${url.search}` as Route)}
      onClose={() => router.back()}
    />
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
