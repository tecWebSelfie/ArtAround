'use client'

import { Overlay, useComputedColorScheme } from '@mantine/core'
import type { IScannerProps } from '@yudiel/react-qr-scanner'
import dynamic from 'next/dynamic'
import { create, type BitMatrix } from 'qrcode'
import { useRef, useState } from 'react'
import { parseAppUrl } from '@/lib/app-url'

export { parseAppUrl } from '@/lib/app-url'

export const Scanner = dynamic(
  () =>
    import('@yudiel/react-qr-scanner').then((m) => {
      // Without a native BarcodeDetector (Chrome on Windows/Linux) the scanner
      // decodes with ZXing's WebAssembly reader, by default fetched from a public
      // CDN on first use. Serve it from our origin instead (public/zxing, copied
      // on postinstall by scripts/copy-zxing-assets.mjs). Set before the first
      // scan, since the module is prepared once.
      m.setZXingModuleOverrides({
        locateFile: (path: string, prefix: string) =>
          path.endsWith('.wasm') ? `/zxing/${path}` : prefix + path,
      })
      return m.Scanner
    }),
  { ssr: false },
)

/** Client-only scanner that accepts app URLs and turns them into safe URL objects. */
export function QrScanner({
  isAllowedPath = () => true,
  onInvalid,
  children,
  ...props
}: {
  onScan: (url: URL) => void
  isAllowedPath?: (pathname: string) => boolean
  onInvalid?: (rawValue: string | undefined) => void
  onClose?: () => void
} & Omit<IScannerProps, 'onScan' | 'formats' | 'tracker'>) {
  const [locked, setLocked] = useState(false)
  const handledRef = useRef(false)
  const qrCacheRef = useRef<{ value: string; matrix: BitMatrix } | null>(null)
  const colorScheme = useComputedColorScheme('light')

  return (
    <Scanner
      {...props}
      formats={['qr_code']}
      onScan={(codes) => {
        if (handledRef.current) return
        const rawValue = codes[0]?.rawValue
        const url = parseAppUrl(rawValue)
        if (url === null || !isAllowedPath(url.pathname)) {
          onInvalid?.(rawValue)
          return // resta in ascolto
        }
        handledRef.current = true
        setLocked(true)
        props.onScan(url)
      }}

      tracker={(codes, ctx) => {
        const {
          rawValue,
          boundingBox: { x, y, width, height },
        } = codes[0]

        let cached = qrCacheRef.current
        if (!cached || cached.value !== rawValue) {
          cached = { value: rawValue, matrix: create(rawValue).modules }
          qrCacheRef.current = cached
        }

        const { size: n, data } = cached.matrix

        const isDark = colorScheme === 'dark'
        const backgroundColor = isDark ? '#000000' : '#FFFFFF'
        const foregroundColor = isDark ? '#FFFFFF' : '#000000'
        const radius = Math.min(width, height) * 0.1
        const pad = width * 0.15
        const innerX = x + pad
        const innerY = y + pad
        const cell = (Math.min(width, height) - pad * 2) / n

        // Sfondo stondato
        ctx.fillStyle = backgroundColor
        ctx.beginPath()
        ctx.roundRect(x, y, width, height, radius)
        ctx.fill()

        // Moduli dentro i bordi stondati
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(x, y, width, height, radius)
        ctx.clip()
        ctx.fillStyle = foregroundColor
        data.forEach((dark, i) => {
          if (!dark) return
          ctx.fillRect(innerX + (i % n) * cell, innerY + Math.floor(i / n) * cell, cell, cell)
        })
        ctx.restore()
      }}

      paused={locked || props.paused}
    >
      <Overlay backgroundOpacity={0}>{children}</Overlay>
    </Scanner>
  )
}
