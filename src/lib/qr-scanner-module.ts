/**
 * The QR scanner's code, loaded on demand and shared by its two users:
 * `QrScanner` (src/components/Scanner.tsx), which renders it, and the tour
 * navigation, which warms it up while the visitor looks at the map.
 *
 * Opening the scanner cold spent seconds loading its JS chunk
 * (`@yudiel/react-qr-scanner` + `barcode-detector`) before it even asked for
 * the camera: measured in the tour-qr e2e, tap → camera request went from
 * ~5.8 s to ~3.1 s once `prewarmQrScanner()` loads it in idle time.
 *
 * ZXing's ~1 MB WebAssembly reader (Chrome on Windows/Linux has no native
 * BarcodeDetector) is deliberately NOT prefetched: it downloads while the
 * camera starts, off the critical path (decode took ~1.1 s after the first
 * frame either way), and prefetching it would cost every tour visitor 1 MB
 * of mobile data whether or not they ever scan.
 *
 * Kept apart from Scanner.tsx so the tour page imports only this loader, not
 * the scanner's UI and its `qrcode` dependency.
 */

/**
 * Serve ZXing's WebAssembly from our origin (public/zxing, copied on
 * postinstall by scripts/copy-zxing-assets.mjs) instead of its default public
 * CDN. One shared object: zxing-wasm compares overrides shallowly and would
 * build a second module for a new `locateFile` function.
 */
const ZXING_OVERRIDES = {
  locateFile: (path: string, prefix: string) =>
    path.endsWith('.wasm') ? `/zxing/${path}` : prefix + path,
}

let scannerModule: Promise<typeof import('@yudiel/react-qr-scanner')> | undefined

/**
 * Loads the scanner library once, with the overrides set before any scan.
 * A failed load is forgotten, so the next caller (the scanner opening after
 * a failed prewarm, say) tries again.
 */
export function loadQrScannerModule() {
  scannerModule ??= import('@yudiel/react-qr-scanner').then(
    (m) => {
      m.prepareZXingModule({ overrides: ZXING_OVERRIDES })
      return m
    },
    (error: unknown) => {
      scannerModule = undefined
      throw error
    },
  )
  return scannerModule
}

/**
 * Loads the scanner's code when the browser is idle. Calling it again only
 * reuses the loaded module; a failure means the scanner loads on open.
 */
export function prewarmQrScanner() {
  const run = () => void loadQrScannerModule().catch(() => {})
  // Safari has no requestIdleCallback; a short timeout keeps it off the
  // page's first paint there too.
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 5_000 })
  else setTimeout(run, 2_000)
}
