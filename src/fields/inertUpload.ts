import type { UploadConfig } from 'payload'

/**
 * Response hardening shared by EVERY upload collection (N36, stored XSS).
 * Uploaded files are served from the app's own origin, so a file a browser
 * can execute (e.g. an `.xml` with an XHTML root and a `<script>`) would run
 * with the visitor's session. Besides allow-listing `mimeTypes` per
 * collection, each file is served as an inert download-like resource:
 *
 * - `nosniff` stops the browser from second-guessing the declared type.
 * - The CSP `sandbox` (opaque origin, no scripts) with `default-src 'none'`
 *   only affects the file when it is opened as a document; `<img>`, `<audio>`,
 *   model and `fetch` consumers ignore it, so embedded pictures, audio and
 *   models keep working. It also replaces Payload's SVG-only
 *   `script-src 'none'` with a stricter policy.
 */
export const inertResponseHeaders = {
  modifyResponseHeaders: ({ headers }) => {
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set(
      'Content-Security-Policy',
      "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
    )
    return headers
  },
} satisfies Pick<UploadConfig, 'modifyResponseHeaders'>

/**
 * Raster pictures the app takes from visitors (cover/avatar file inputs
 * accept `image/*`). SVG is left out on purpose: nothing needs visitor SVGs
 * and they are an active-content format.
 */
export const RASTER_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]
