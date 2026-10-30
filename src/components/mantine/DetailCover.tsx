'use client'

import { pictureSrc, usablePictures, type Picture } from '@/lib/picture'
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'
import { Box, Button, Group, Image, Overlay, Paper, Skeleton, UnstyledButton } from '@mantine/core'
import { Box as Cube, Image as ImageIcon, Images } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KIND_FALLBACK } from './kind-fallback'

import { PictureLightbox } from './PictureLightbox'

// three.js, R3F and drei load on the first press of "3D", never before (the
// lazy chunk is only requested when the viewer first renders). The lightbox
// loads its own code on first open.
const ModelViewer = lazy(() => import('./ModelViewer').then((m) => ({ default: m.ModelViewer })))

/**
 * The media card that opens a detail page (object, content, tour, museum):
 * the first picture, height-capped so on landing the title, the at-a-glance
 * facts and the start of the text still fit above the fold on a phone, while
 * the page's main action waits in the fixed footer (DESIGN.md → The
 * Thumb-Reach Rule).
 *
 * - Tapping the picture, or "Photos · N", opens every picture in the
 *   `PictureLightbox` (zoom, swipe, thumbnails). `lightbox={false}` keeps it
 *   out of places already layered over the page (navigation modals).
 * - With a 3D `model`, a "3D" toggle swaps the picture for an orbitable
 *   `ModelViewer` in the same card, and "Photo" swaps it back.
 * - Without a picture the kind's identity stands in (`KIND_FALLBACK`), or the
 *   neutral placeholder for objects.
 *
 * `clamp(160px, 32dvh, 360px)`: about a third of the screen on any phone
 * (≈270px at 844px tall), never a sliver on a short landscape screen and never
 * a wall on a tall desktop. Controls follow the Overlay Opt-In Rule.
 */
const COVER_HEIGHT = 'clamp(160px, 32dvh, 360px)'

/** The small white buttons over the media (DESIGN.md → Media card). */
const OVERLAY_BUTTON = { size: 'compact-sm', variant: 'white', color: 'dark' } as const

export function DetailCover({
  pictures = [],
  model,
  fallback,
  title,
  lightbox = true,
}: {
  /**
   * The document's pictures, cover first, as read with `PICTURE_SELECT`;
   * missing or URL-less entries are skipped (`usablePictures`).
   */
  pictures?: (Picture | null | undefined)[]
  /** The object's 3D model (GLB), when it has one. */
  model?: { url?: string | null } | null
  /** Without a picture: the kind's gradient and mark; omitted, the placeholder. */
  fallback?: 'tour' | 'content'
  /** What the media shows, for the 3D view's accessible name. */
  title: string
  lightbox?: boolean
}) {
  const { t } = useTranslation('common')
  const [show3d, setShow3d] = useState(false)
  // The open picture in the lightbox, `null` while it is closed.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const shown = usablePictures(pictures)
  const cover = shown[0]
  const modelUrl = model?.url
  const showPhotosButton = lightbox && shown.length > 1 && !show3d
  const openLightbox = () => setLightboxIndex(0)

  return (
    <Paper radius="lg" pos="relative" h={COVER_HEIGHT} className="overflow-hidden">
      {show3d && modelUrl ? (
        <Suspense fallback={<Skeleton h="100%" radius={0} />}>
          <ModelViewer
            url={modelUrl}
            label={t('3D model of {{title}}', { title })}
            unavailable={t('The 3D view is not available on this device.')}
          />
        </Suspense>
      ) : cover ? (
        <UnstyledButton
          w="100%"
          h="100%"
          disabled={!lightbox}
          aria-label={lightbox ? t('Open photos') : undefined}
          onClick={openLightbox}
          className={lightbox ? 'cursor-zoom-in' : undefined}
        >
          {/* The page's largest paint: fetch it first. */}
          <Image
            src={pictureSrc(cover, 'cover')}
            alt={cover.alt ?? ''}
            h="100%"
            fit="cover"
            fetchPriority="high"
          />
        </UnstyledButton>
      ) : (
        <CoverFallback kind={fallback} />
      )}

      {(modelUrl || showPhotosButton) && (
        // Overlay Opt-In: only the buttons take pointer events, the canvas
        // underneath stays draggable.
        <Overlay
          backgroundOpacity={0}
          p="sm"
          className="pointer-events-none flex items-end justify-end"
        >
          <Group gap="xs" className="pointer-events-auto">
            {showPhotosButton && (
              <Button
                {...OVERLAY_BUTTON}
                rightSection={<Images size={14} aria-hidden />}
                onClick={openLightbox}
              >
                {t('Photos')} · <span className="tabular-nums">{shown.length}</span>
              </Button>
            )}
            {modelUrl && (
              <Button
                {...OVERLAY_BUTTON}
                aria-pressed={show3d}
                rightSection={
                  show3d ? <ImageIcon size={14} aria-hidden /> : <Cube size={14} aria-hidden />
                }
                onClick={() => setShow3d((on) => !on)}
              >
                {show3d ? t('Photo') : '3D'}
              </Button>
            )}
          </Group>
        </Overlay>
      )}

      {/* Only the picture and "Photos" open it, both shown only with `lightbox`. */}
      <PictureLightbox pictures={shown} index={lightboxIndex} onChange={setLightboxIndex} />
    </Paper>
  )
}

/** Decorative: the title right below names what is missing a picture. */
function CoverFallback({ kind }: { kind?: 'tour' | 'content' }) {
  if (!kind) return <Image src={PLACEHOLDER_IMAGE} alt="" h="100%" fit="cover" />
  const { background, Icon } = KIND_FALLBACK[kind]
  return (
    <Box
      h="100%"
      aria-hidden
      c="white"
      style={{ background }}
      className="flex items-center justify-center"
    >
      <Icon size="30%" strokeWidth={1.5} />
    </Box>
  )
}
