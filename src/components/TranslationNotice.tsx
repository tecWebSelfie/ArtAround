import { readLocalizedPage } from '@/lib/localized-page'
import { TranslationPending } from './TranslationPending'

/**
 * Server side of the "translating" line: rendered by every page and modal
 * that shows an object or a content through `getLocalizedPageDocument`. It
 * reads the same cached document, so it costs no query, and shows
 * `TranslationPending` (which refreshes the route) only while the visitor is
 * reading the English fallback.
 */
export async function TranslationNotice({
  collection,
  id,
  lng,
}: {
  collection: 'objects' | 'contents'
  id: string
  lng: string
}) {
  const { pending } = await readLocalizedPage(collection, id, lng)
  return pending ? <TranslationPending /> : null
}
