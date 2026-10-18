import config from '@/payload.config'
import { getPayload } from 'payload'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { normalizeLocale, resolveLocalized } from './localized'

/**
 * Shared localized Payload read for canonical details pages and tour modals, so
 * both URL forms render the same translated document and missing-doc behavior.
 */
export const getLocalizedPageDocument = cache(
  async <T extends 'objects' | 'contents'>(collection: T, id: string, lng: string) => {
    const payload = await getPayload({ config })
    const result = await resolveLocalized(
      payload,
      process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000',
      { collection, id, locale: normalizeLocale(lng) ?? 'en' },
    )
    if (result.kind === 'not-found') notFound()
    return result.doc
  },
)
