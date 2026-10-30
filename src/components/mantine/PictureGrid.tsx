'use client'

import { pictureSrc, type Picture } from '@/lib/picture'
import { Image, SimpleGrid, UnstyledButton } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PictureLightbox } from './PictureLightbox'

/**
 * A grid of a document's pictures at card size; tapping one opens it, with
 * the others, in the shared `PictureLightbox` (zoom, swipe, thumbnails).
 * Takes pictures that have a URL (`usablePictures`).
 */
export function PictureGrid({ pictures }: { pictures: Picture[] }) {
  const { t } = useTranslation('common')
  const [index, setIndex] = useState<number | null>(null)
  return (
    <>
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
        {pictures.map((picture, i) => (
          <UnstyledButton
            key={picture.url}
            aria-label={t('Open photo {{current}}', { current: i + 1 })}
            onClick={() => setIndex(i)}
            className="cursor-zoom-in"
          >
            <Image
              src={pictureSrc(picture, 'card')}
              alt={picture.alt ?? ''}
              radius="md"
              h={160}
              fit="cover"
            />
          </UnstyledButton>
        ))}
      </SimpleGrid>
      <PictureLightbox pictures={pictures} index={index} onChange={setIndex} />
    </>
  )
}
