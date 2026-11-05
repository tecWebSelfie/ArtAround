'use server'

import { searchWikidata, type WikidataSearchResult } from '@/lib/wikidata'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const Query = z.object({ query: z.string().max(120), language: z.string().regex(/^[a-z]{2,3}$/) })

/**
 * Wikidata items matching what an editor typed, for the "Wikidata" field of
 * the object form (`WikidataInput`). Signed-in users only: it is an editing
 * aid and each call reaches an external API. Wikidata errors (rate limits,
 * timeouts) come back as an empty list rather than breaking the form.
 */
export async function searchWikidataAction(
  query: string,
  language: string,
): Promise<WikidataSearchResult[]> {
  const parsed = Query.safeParse({ query, language })
  const { user } = await getSession()
  if (!parsed.success || !user) return []
  return searchWikidata(parsed.data.query, parsed.data.language).catch(() => [])
}
