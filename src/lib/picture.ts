/**
 * Pictures from the upload collections built on `imageUpload`
 * (src/fields/imageUpload.ts), read the same way on server and client.
 */

/** The upload collections whose documents carry a page's or card's picture. */
export type PictureCollection = 'objectsThumbnails' | 'contentImages' | 'toursThumbnails'

/** The fields a picture is drawn from (select `sizes` to get the variants). */
export type Picture = {
  url?: string | null
  thumbnailURL?: string | null
  alt?: string | null
  sizes?: { card?: { url?: string | null }; cover?: { url?: string | null } }
}

/**
 * The URL to draw `picture` at: its derived `card` (480px) or `cover`
 * (1280px) variant, else the original (pictures uploaded before the sizes
 * existed have none).
 */
export function pictureSrc(picture: Picture | null | undefined, size: 'card' | 'cover') {
  return picture?.sizes?.[size]?.url ?? picture?.url ?? null
}

/**
 * The pictures that can be drawn: populated and with a URL. Detail covers and
 * picture grids take a document's pictures through this one filter, so
 * callers pass raw relation values (`[cover]`, `images`).
 */
export function usablePictures<T extends Picture>(
  pictures: readonly (T | null | undefined)[] | null | undefined,
): T[] {
  return (pictures ?? []).filter((picture): picture is T => Boolean(picture?.url))
}

/**
 * What to select (or `populate`) for a picture. Payload computes `url` and
 * `thumbnailURL` from the stored `filename` (per size too), so selecting the
 * URLs without it returns `null`.
 */
export const PICTURE_SELECT = {
  url: true,
  filename: true,
  thumbnailURL: true,
  alt: true,
  sizes: {
    card: { url: true, filename: true },
    cover: { url: true, filename: true },
  },
} as const
