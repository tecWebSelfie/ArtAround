'use client'

import { pictureSrc, type Picture } from '@/lib/picture'
import { Lightbox } from '@mantine/lightbox'
import { useTranslation } from 'react-i18next'

/**
 * The `@mantine/lightbox` body of `PictureLightbox`, in its own module so it
 * loads as a lazy chunk on the first open. Mounted only while open, at `index`.
 * Draws the original file: this is where detail matters.
 */
export function PictureLightboxDialog({
  pictures,
  index,
  onChange,
}: {
  pictures: Picture[]
  index: number
  onChange: (index: number | null) => void
}) {
  const { t } = useTranslation('common')
  const several = pictures.length > 1
  return (
    <Lightbox
      opened
      onClose={() => onChange(null)}
      currentIndex={index}
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
