'use client'

import { Overlay, useComputedColorScheme } from '@mantine/core'
import type { IScannerProps } from '@yudiel/react-qr-scanner'
import dynamic from 'next/dynamic'
import { create, type BitMatrix } from 'qrcode'
import { useRef, useState } from 'react'
import { parseAppUrl } from '@/lib/app-url'
import { loadQrScannerModule } from '@/lib/qr-scanner-module'

export { parseAppUrl } from '@/lib/app-url'

// Shared loader (src/lib/qr-scanner-module.ts): it serves ZXing's WebAssembly
// from our origin, and the tour page may already have loaded and compiled it.
export const Scanner = dynamic(() => loadQrScannerModule().then((m) => m.Scanner), { ssr: false })

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
      // The library gives `video.play()` 3 s, then reports the camera as
      // failed and never starts scanning, even though the video then plays:
      // the visitor sees a live camera that never reads a code. A busy page
      // (the 3D museum map behind the scanner) on a slow phone can exceed 3 s.
      // The timeout only exists to catch a wedged play(), so give it room.
      // Before `{...props}`, so a caller can still set its own.
      startTimeoutMs={15_000}
      {...props}
      // The viewfinder is `ScanFrame` below, never the library's red one:
      // set here so no caller can end up with both.
      components={{ ...props.components, finder: false }}
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
      {/* A size container, so the frame can follow the window's height (`cqh`). */}
      <Overlay backgroundOpacity={0} className="[container-type:size]">
        <ScanFrame />
        {children}
      </Overlay>
    </Scanner>
  )
}

/** One corner of the viewfinder: two primary-colour strokes meeting at it. */
const CORNERS = [
  'top-0 left-0 border-t-4 border-l-4 rounded-tl-xl',
  'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl',
  'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl',
  'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl',
]

/**
 * The viewfinder over the camera, in place of the library's red finder
 * (`components.finder: false`): four rounded corners in the app's primary
 * colour (the museum's own in museum mode) around a square that shows where
 * to hold the code. No dimming around it: the library's zoom and torch
 * controls sit under this overlay and must keep their own look. Pure CSS:
 * no canvas, nothing to draw per frame. Sized to the camera window (`min`
 * of its width and height), so it fits the full-screen phone scanner and
 * the desktop 4:3 frame alike. Decorative: `aria-hidden`.
 */
function ScanFrame() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[min(70%,70cqh,320px)] -translate-x-1/2 -translate-y-1/2"
    >
      {CORNERS.map((corner) => (
        <span
          key={corner}
          className={`absolute size-[22%] border-(--mantine-primary-color-filled) ${corner}`}
        />
      ))}
    </div>
  )
}
