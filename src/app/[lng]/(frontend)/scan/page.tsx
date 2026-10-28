import { Suspense } from 'react'

import { QrScanPage } from '@/app/[lng]/(frontend)/museum/[id]/navigation/scan/QrScanPage'

/**
 * The navigator home's "Scan a tour QR code": the same scanner as inside a
 * navigation, with no position to keep. A scanned tour, museum, object,
 * content or group link opens as its own page; closing returns home.
 *
 * This route is prerendered per language, and QrScanPage reads
 * useSearchParams(), so it must sit under a Suspense boundary or
 * `next build` fails with missing-suspense-with-csr-bailout.
 */
export default function Scan() {
  return (
    <Suspense>
      <QrScanPage />
    </Suspense>
  )
}
