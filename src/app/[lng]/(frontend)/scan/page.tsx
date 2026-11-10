import { Suspense } from 'react'

import { QrScanPage } from '@/app/[lng]/(frontend)/museum/[id]/navigation/scan/QrScanPage'
import classes from './scan.module.css'

/**
 * The navigator home's "Scan a tour QR code": the same scanner as inside a
 * navigation, with no position to keep. A scanned tour, museum, object,
 * content or group link opens as its own page; closing returns home.
 *
 * This route is prerendered per language, and QrScanPage reads
 * useSearchParams(), so it must sit under a Suspense boundary or
 * `next build` fails with missing-suspense-with-csr-bailout.
 *
 * The two wrappers only style at ≥ md (see `scan.module.css`): a desktop
 * webcam view is bounded and centred instead of stretched edge to edge; on
 * phones they are plain blocks and the scanner stays full-screen.
 */
export default function Scan() {
  return (
    <main className={classes.stage}>
      <div className={classes.frame}>
        <Suspense>
          <QrScanPage />
        </Suspense>
      </div>
    </main>
  )
}
