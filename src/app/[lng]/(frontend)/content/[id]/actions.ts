'use server'

import type { CurrentImage } from '@/components/editing/CoverImageInput'
import type { ContentFormValues } from '@/components/editing/forms/ContentFields'
import { coverImage } from '@/lib/cover-image'
import { lexicalToHTML } from '@/lib/richtext'
import { can, getSession } from '@/lib/session'
import { extractID } from 'payload/shared'
import { z } from 'zod'

/**
 * Content page Server Functions. Next exposes each export as a public POST
 * endpoint, so the argument is validated and the permission re-checked here.
 */

const contentId = z.string().min(1).max(64)

export type ContentSource = Omit<ContentFormValues, 'object'> & {
  /** The first picture (the cover) and the ids of the others, in order. */
  cover: CurrentImage | null
  otherImages: string[]
}

/**
 * What the content page's inline editor (`ContentEditForm`) starts from,
 * loaded when the author opens it rather than with every page view: the
 * source-locale (`en`) values, since translations are regenerated from them,
 * the body converted to HTML for the TipTap editor, and the cover picture.
 * `null` when the id is invalid or the visitor may not edit the content.
 */
export async function loadContentSource(id: string): Promise<ContentSource | null> {
  const parsed = contentId.safeParse(id)
  if (!parsed.success || !(await can('contents', parsed.data, 'update'))) return null
  const { payload } = await getSession()
  const content = await payload.findByID({
    collection: 'contents',
    id: parsed.data,
    locale: 'en',
    depth: 0,
    select: {
      title: true,
      difficulty: true,
      copyright: true,
      price: true,
      body: true,
      images: true,
    },
  })
  const [first, ...otherImages] = (content.images ?? []).map(extractID)
  const cover = await coverImage(payload, 'contentImages', first)
  return {
    cover,
    // An unreadable first picture is kept among the others, not dropped.
    otherImages: cover || !first ? otherImages : [first, ...otherImages],
    title: content.title,
    difficulty: content.difficulty,
    copyright: content.copyright,
    price: content.price ?? null,
    bodyHTML: lexicalToHTML(content.body),
  }
}
