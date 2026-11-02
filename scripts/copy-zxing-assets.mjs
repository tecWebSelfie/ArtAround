// Copies the ZXing WebAssembly reader into public/zxing so the QR scanner
// loads it from our own origin. Chrome on Windows/Linux has no native
// BarcodeDetector, so @yudiel/react-qr-scanner falls back to barcode-detector's
// ZXing ponyfill, which otherwise fetches this file from a public CDN the first
// time a visitor scans: slow or unreachable on museum Wi-Fi, and in e2e runs.
// `QrScanner` (src/components/Scanner.tsx) points the ponyfill here. Runs on
// `postinstall`; the output is generated, so public/zxing is gitignored.
import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
// zxing-wasm is a dependency of barcode-detector, itself the scanner's own
// dependency: resolve each one from the package that depends on it.
const scanner = createRequire(require.resolve('@yudiel/react-qr-scanner'))
const detector = createRequire(scanner.resolve('barcode-detector/ponyfill'))
// The package exports the binary itself, so this survives layout changes.
const wasm = detector.resolve('zxing-wasm/reader/zxing_reader.wasm')

const target = join(process.cwd(), 'public', 'zxing')
mkdirSync(target, { recursive: true })
copyFileSync(wasm, join(target, 'zxing_reader.wasm'))
console.log(`ZXing reader copied to ${target}`)
