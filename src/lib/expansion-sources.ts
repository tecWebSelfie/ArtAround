import 'server-only'

import { createMCPClient } from '@ai-sdk/mcp'

/**
 * External facts for `/api/expand`, from two public, authoritative sources:
 *
 * - Wikidata, through Wikimedia Deutschland's hosted MCP server
 *   (`search_items` finds the item, `get_statements` lists its facts: author,
 *   date, location, movement…);
 * - Wikipedia, whose page summary comes in the visitor's own language.
 *
 * Our server calls these tools itself, once each, before the single model
 * call. The model never chooses which URL to open, and one expansion costs
 * one model request instead of several tool round-trips (the Groq free tier
 * allows 8,000 tokens a minute). Every lookup has a short timeout and fails
 * silently: without sources the text is written from the museum's own data.
 */

export type ExternalSource = { title: string; url: string; text: string }

const WIKIDATA_MCP_URL = 'https://wd-mcp.wmcloud.org/mcp'
// Wikidata needs about 9 s (MCP handshake, tool list, search, statements).
const TIMEOUT_MS = 10_000
/** Wikimedia asks API clients to identify themselves. */
const USER_AGENT = 'ArtAround/1.0 (university museum guide project)'
/** Keeps each source to roughly 500 tokens of the prompt. */
const MAX_SOURCE_CHARS = 2_000

/** Text of an MCP tool result (`{ content: [{ type: 'text', text }] }`). */
function toolText(result: unknown) {
  const content = (result as { content?: { type: string; text?: string }[] })?.content ?? []
  return content.map((part) => (part.type === 'text' ? (part.text ?? '') : '')).join('\n')
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('source timed out')), TIMEOUT_MS),
    ),
  ])
}

async function wikidataFacts(query: string, lang: string): Promise<ExternalSource | null> {
  const client = await createMCPClient({ transport: { type: 'http', url: WIKIDATA_MCP_URL } })
  try {
    const tools = await client.tools()
    const call = { toolCallId: 'expand', messages: [], context: {} }
    // Lines look like "Q867403: Madonna with the Long Neck — painting by Parmigianino".
    const found = toolText(await tools.search_items.execute({ query, lang }, call))
    const first = /^(Q\d+): (.+)$/m.exec(found)
    if (!first) return null
    const [, qid, label] = first
    const facts = toolText(await tools.get_statements.execute({ entity_id: qid, lang }, call))
    return {
      title: `Wikidata: ${label}`,
      url: `https://www.wikidata.org/wiki/${qid}`,
      text: `${label}\n${facts}`.slice(0, MAX_SOURCE_CHARS),
    }
  } finally {
    await client.close()
  }
}

async function wikipediaSummary(query: string, lang: string): Promise<ExternalSource | null> {
  // The language only ever picks a Wikipedia subdomain, so it must be a plain code.
  const wiki = /^[a-z]{2,3}$/.test(lang) ? lang : 'en'
  const headers = { 'User-Agent': USER_AGENT }
  const search = await fetch(
    `https://${wiki}.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=1`,
    { headers },
  )
  const page = ((await search.json()) as { pages?: { key: string }[] }).pages?.[0]
  if (!page) return null
  const summary = await fetch(
    `https://${wiki}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.key)}`,
    { headers },
  )
  const json = (await summary.json()) as {
    title?: string
    extract?: string
    content_urls?: { desktop?: { page?: string } }
  }
  if (!json.extract) return null
  return {
    title: `Wikipedia: ${json.title ?? page.key}`,
    url: json.content_urls?.desktop?.page ?? `https://${wiki}.wikipedia.org/wiki/${page.key}`,
    text: json.extract.slice(0, MAX_SOURCE_CHARS),
  }
}

/** Both lookups in parallel; whatever answers in time is used. */
export async function externalSources(query: string, lang: string): Promise<ExternalSource[]> {
  const results = await Promise.allSettled([
    withTimeout(wikidataFacts(query, lang)),
    withTimeout(wikipediaSummary(query, lang)),
  ])
  return results.flatMap((result) =>
    result.status === 'fulfilled' && result.value ? [result.value] : [],
  )
}
