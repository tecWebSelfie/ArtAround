import type { CollectionBeforeOperationHook, UploadConfig } from 'payload'

import { inertResponseHeaders, RASTER_IMAGE_MIME_TYPES } from './inertUpload'

/**
 * Upload settings shared by the picture collections that feed covers and
 * cards (tour, content, object and museum thumbnails). Sharp derives two
 * widths on upload, so pages never download the original for a small box:
 *
 * - `card` (480px wide): list rows, cards, carousels. It is also the admin
 *   thumbnail, so `thumbnailURL` (already read across the frontend) points
 *   at it instead of being empty.
 * - `cover` (1280px wide): the detail-page cover (`DetailCover`), sharp on
 *   a 2× phone and on a desktop column, a fraction of a camera original.
 *
 * Height is left out to keep each picture's proportions. `withoutEnlargement`
 * keeps a smaller original as is rather than upscaling it. Pictures uploaded
 * before these sizes existed have no `sizes` and fall back to `url`.
 */
export const imageUpload = {
  imageSizes: [
    { name: 'card', width: 480, withoutEnlargement: true },
    { name: 'cover', width: 1280, withoutEnlargement: true },
  ],
  adminThumbnail: 'card',
  // Allow-list: without it Payload only blocks a few extensions (N36).
  mimeTypes: RASTER_IMAGE_MIME_TYPES,
  ...inertResponseHeaders,
} satisfies UploadConfig

/**
 * N39: these collections share one folder (`museumThumbnails/`, see
 * src/plugins/uploadsDir.ts). Payload picks a free name for the MAIN file
 * only; the resized copies are written as `<main stem>-<w>x<h>.<ext>` over
 * whatever is on disk. So a main file whose stem already ends in `-<w>x<h>`
 * (`foo-480x343.jpg`) could be silently replaced by the `card` copy of an
 * upload named `foo.jpg`, whoever owns it.
 *
 * Invariant kept here: no main filename ends in `-<digits>x<digits>`, so it can
 * never equal a resized copy's name; and because main names are unique
 * (Payload increments them against disk and DB), copies derived from distinct
 * stems are distinct too. The extension is normalized (lower case,
 * `jpeg` -> `jpg`) because copies are named after the sniffed type
 * (`a.jpeg` and `a.jpg` are different mains whose copies are both `a-480x343.jpg`).
 * Runs before Payload reads `req.file.name`, on create and on update (replacing
 * the file).
 */
export const keepResizedNamesFree: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== 'create' && operation !== 'update' && operation !== 'updateByID') return args
  const file = req.file
  if (!file?.name) return args
  const dot = file.name.lastIndexOf('.')
  let stem = dot > 0 ? file.name.slice(0, dot) : file.name
  let ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : ''
  if (ext === 'jpeg' || ext === 'jpe') ext = 'jpg'
  // Same shape as the suffix Payload appends; `-img` is neutral and keeps the stem readable.
  if (/-\d+x\d+$/.test(stem)) stem += '-img'
  file.name = ext ? `${stem}.${ext}` : stem
  return args
}
