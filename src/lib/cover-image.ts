import type { CurrentImage } from '@/components/editing/CoverImageInput'
import type { Payload } from 'payload'
import { PICTURE_SELECT, pictureSrc, type Picture, type PictureCollection } from './picture'

/**
 * A document's stored picture as the editing forms preview it
 * (`CoverImageInput`): its id and card-size URL. Accepts the relation as
 * Payload returns it at any depth (an id, a populated doc, or nothing); an id
 * is read here (a populated doc is used as is), and a picture that can't be
 * read counts as none.
 */
export async function coverImage(
  payload: Payload,
  collection: PictureCollection,
  value: string | (Picture & { id: string }) | null | undefined,
): Promise<CurrentImage | null> {
  if (!value) return null
  // Already populated: nothing to read.
  if (typeof value !== 'string') return { id: value.id, url: pictureSrc(value, 'card') }
  const id = value
  const doc = await payload
    .findByID({ collection, id, depth: 0, select: PICTURE_SELECT })
    .catch(() => null)
  return doc && { id, url: pictureSrc(doc, 'card') }
}
