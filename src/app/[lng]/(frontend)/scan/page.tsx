import { QrScanPage } from '@/app/[lng]/(frontend)/tour/[id]/navigation/[stepId]/scan/QrScanPage'

/**
 * The navigator home's "Scan a tour QR code": the same scanner as inside a
 * navigation, with no position to keep. A scanned tour, museum, object,
 * content or group link opens as its own page; closing returns home.
 */
export default function Scan() {
  return <QrScanPage />
}
