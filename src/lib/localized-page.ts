import { cache } from 'react'
import { notFound } from 'next/navigation'
import { normalizeLocale, resolveLocalized } from './localized'
import { PICTURE_SELECT } from './picture'
import { getSession } from './session'

/**
 * Shared localized Payload read for canonical details pages and tour modals, so
 * both URL forms render the same translated document and missing-doc behavior.
 * Reads as the signed-in visitor, so a paid content's body is present only
 * for people entitled to it.
 *
 * The localized read is depth 0, so an object's photo would arrive as a bare
 * id. For objects the photo is populated here, alongside, so every object view
 * (page and navigation modals) shows it rather than the placeholder.
 */
export const getLocalizedPageDocument = cache(
  async <T extends 'objects' | 'contents'>(collection: T, id: string, lng: string) => {
    const { payload, user } = await getSession()
    const [result, media] = await Promise.all([
      resolveLocalized(payload, process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000', {
        collection,
        id,
        locale: normalizeLocale(lng) ?? 'en',
        user,
      }),
      collection === 'objects'
        ? payload
            .findByID({
              collection: 'objects',
              id,
              depth: 1,
              select: { thumbnail: true },
              populate: { objectsThumbnails: PICTURE_SELECT },
            })
            .catch(() => null)
        : null,
    ])
    if (result.kind === 'not-found') notFound()
    return media?.thumbnail ? { ...result.doc, thumbnail: media.thumbnail } : result.doc
  },
)
