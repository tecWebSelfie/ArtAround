'use client'

import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'
import type { MuseumThumbnail } from '@/payload-types'
import { Carousel } from '@mantine/carousel'
import { AspectRatio, Button, Image, Modal, Overlay } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Images } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * The museum page's cover photo. With more than one photo, a "Photos · N"
 * button on the cover opens all of them in a swipeable modal; with one, the
 * cover is just the picture (no button that leads nowhere).
 */
export function MuseumGallery({ photos }: { photos: MuseumThumbnail[] }) {
  const { t } = useTranslation('museum-page')
  const [opened, gallery] = useDisclosure(false)
  const cover = photos[0]

  return (
    <AspectRatio pos="relative" ratio={16 / 9}>
      <Image
        radius="lg"
        src={cover?.url}
        fallbackSrc={PLACEHOLDER_IMAGE}
        // An empty cover is a placeholder, decorative to screen readers.
        alt={cover?.alt ?? ''}
      />
      {photos.length > 1 && (
        <>
          {/* Overlay Opt-In: only the button takes pointer events. */}
          <Overlay
            backgroundOpacity={0}
            p="sm"
            className="pointer-events-none flex items-end justify-end"
          >
            <Button
              className="pointer-events-auto"
              size="compact-sm"
              variant="white"
              color="blue.8"
              autoContrast
              leftSection={<Images size={14} aria-hidden />}
              onClick={gallery.open}
            >
              {t('Photos')} · <span className="tabular-nums">{photos.length}</span>
            </Button>
          </Overlay>
          <Modal opened={opened} onClose={gallery.close} title={t('Photos')} size="xl" centered>
            <Carousel withIndicators emblaOptions={{ loop: true }} slideGap="sm">
              {photos.map((photo) => (
                <Carousel.Slide key={photo.id}>
                  <AspectRatio ratio={4 / 3}>
                    <Image radius="md" src={photo.url} alt={photo.alt} fit="contain" />
                  </AspectRatio>
                </Carousel.Slide>
              ))}
            </Carousel>
          </Modal>
        </>
      )}
    </AspectRatio>
  )
}
