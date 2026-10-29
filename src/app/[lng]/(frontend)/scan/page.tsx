import { QrScanPage } from '@/app/[lng]/(frontend)/tour/[id]/navigation/[stepId]/scan/QrScanPage'
import classes from './scan.module.css'

/**
 * The navigator home's "Scan a tour QR code": the same scanner as inside a
 * navigation, with no position to keep. A scanned tour, museum, object,
 * content or group link opens as its own page; closing returns home.
 *
 * The two wrappers only style at ≥ md (see `scan.module.css`): a desktop
 * webcam view is bounded and centred instead of stretched edge to edge; on
 * phones they are plain blocks and the scanner stays full-screen.
 */
export default function Scan() {
  return (
    <div className={classes.stage}>
      <div className={classes.frame}>
        <QrScanPage />
      </div>
    </div>
  )
}
