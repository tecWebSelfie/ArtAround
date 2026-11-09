import { cache } from 'react'
import { notFound } from 'next/navigation'
import { normalizeLocale, resolveLocalized } from './localized'
import { PICTURE_SELECT } from './picture'
import { getSession } from './session'
import type { Content } from '@/payload-types'
import { withContentObjects } from './stop-objects'

const PUBLIC_MEDIA = { overrideAccess: true } as const

/**
 * Shared localized Payload read for canonical details pages and tour modals, so
 * both URL forms render the same translated document and missing-doc behavior.
 * Reads as the signed-in visitor, so a paid content's body is present only
 * for people entitled to it.
 *
 * The localized read is depth 0, so an object's photo and 3D model would
 * arrive as bare ids. For objects both are populated here, alongside, so every
 * object view (page and modals) shows the photo and can offer the 3D view.
 * For contents the same goes for their images and the works they talk about
 * (with thumbnails), so the tour's step modal can show the artwork.
 */
export const getLocalizedPageDocument = cache(
  async <T extends 'objects' | 'contents'>(collection: T, id: string, lng: string) => {
    const { payload, user } = await getSession()
    const locale = normalizeLocale(lng) ?? 'en'
    const [result, media] = await Promise.all([
      resolveLocalized(payload, {
        collection,
        id,
        locale,
        user,
      }),
      collection === 'objects'
        ? payload
            .findByID({
              collection: 'objects',
              id,
              depth: 1,
              select: { thumbnail: true, model: true },
              // The GLB's `url` is computed from `filename` too.
              populate: {
                objectsThumbnails: PICTURE_SELECT,
                objectsModels: { url: true, filename: true },
              },
            })
            .catch(() => null)
        : payload
            .findByID({
              collection: 'contents',
              id,
              depth: 1,
              select: { images: true, objects: true },
              populate: { contentImages: PICTURE_SELECT },
            })
            // The works come back from the join as ids: fill in their
            // names and thumbnails (src/lib/stop-objects.ts).
            .then((content) =>
              withContentObjects(payload, [content as Content], locale, PUBLIC_MEDIA),
            )
            .then(([content]) => content)
            // Pictures only (no body): read like the object branch. The
            // localized read above still decides whether the visitor may
            // see the content at all.
            .catch(() => null),
    ])
    if (result.kind === 'not-found') notFound()
    if (!media) return result.doc
    if (collection === 'objects') {
      const { thumbnail, model } = media as { thumbnail?: unknown; model?: unknown }
      return { ...result.doc, thumbnail: thumbnail ?? null, model: model ?? null }
    }
    const { images, objects } = media as Pick<Content, 'images' | 'objects'>
    return { ...result.doc, images: images ?? (result.doc as Content).images, objects }
  },
)
