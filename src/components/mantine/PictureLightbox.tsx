'use client'

import { pictureSrc, type Picture } from '@/lib/picture'
import { Lightbox } from '@mantine/lightbox'
import { useTranslation } from 'react-i18next'

/**
 * Full-screen viewer for a set of pictures (`@mantine/lightbox`): swipe or
 * arrows between them, pinch or click to zoom, thumbnails when there are
 * several. Shared by every place that shows a document's pictures (the
 * `DetailCover` of each detail page, the content's `PictureGrid`), so they browse and
 * zoom the same way. Draws the original file: this is where detail matters.
 *
 * Controlled by one value: the open picture's `index`, or `null` when closed,
 * so callers keep a single `useState<number | null>(null)`.
 */
export function PictureLightbox({
  pictures,
  index,
  onChange,
}: {
  pictures: Picture[]
  index: number | null
  onChange: (index: number | null) => void
}) {
  const { t } = useTranslation('common')
  const several = pictures.length > 1
  return (
    <Lightbox
      opened={index !== null}
      onClose={() => onChange(null)}
      currentIndex={index ?? 0}
      onIndexChange={onChange}
      slides={pictures.map((picture) => ({
        src: picture.url ?? '',
        alt: picture.alt ?? '',
        thumbSrc: pictureSrc(picture, 'card') ?? undefined,
      }))}
      withZoom
      withThumbnails={several}
      withNavigation={several}
      labels={{
        lightboxLabel: t('Photos'),
        slidesLabel: t('Photos'),
        slideLabel: (current, total) => t('Photo {{current}} of {{total}}', { current, total }),
        thumbnailLabel: (current) => t('Go to photo {{current}}', { current }),
        previousSlideLabel: t('Previous photo'),
        nextSlideLabel: t('Next photo'),
        enterFullscreenLabel: t('Full screen'),
        exitFullscreenLabel: t('Exit full screen'),
        showThumbnailsLabel: t('Show thumbnails'),
        hideThumbnailsLabel: t('Hide thumbnails'),
        downloadLabel: t('Download'),
        closeLabel: t('Close'),
      }}
    />
  )
}
