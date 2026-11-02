import type { UploadConfig } from 'payload'

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
} satisfies UploadConfig
