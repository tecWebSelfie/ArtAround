import { QrScanPage } from './QrScanPage'

/** Keeps scanner code in a small client component while the route stays server-rendered. */
export default function Scan() {
  return <QrScanPage />
}
