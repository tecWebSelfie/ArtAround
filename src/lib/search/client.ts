import { Client } from 'typesense'

/**
 * The one Typesense client.
 *
 * Every read and write goes through the Next server (server components, route
 * handlers, Payload hooks): the browser never talks to Typesense and no key is
 * ever exposed with a `NEXT_PUBLIC_` prefix. `TYPESENSE_API_KEY` is the admin
 * (or a server key limited to `documents:*`) in production.
 *
 * Local development and CI fall back to the Docker service started by
 * `pnpm services:start` (`typesense/typesense`, API key `xyz`), so the app runs
 * without a Cloud cluster. Production must set the four `TYPESENSE_*`
 * variables (see docs/search.md).
 *
 * Not marked `server-only`: the reindex script and Payload hooks run outside
 * Next's React server tree. Never import it from a client component.
 */
export const SEARCH_COLLECTION_NAME = process.env.TYPESENSE_COLLECTION ?? 'search_items'

const node = {
  host: process.env.TYPESENSE_HOST ?? '127.0.0.1',
  port: Number(process.env.TYPESENSE_PORT ?? 8108),
  protocol: process.env.TYPESENSE_PROTOCOL ?? 'http',
}

let client: Client | null = null

export function typesense() {
  client ??= new Client({
    nodes: [node],
    apiKey: process.env.TYPESENSE_API_KEY ?? 'xyz',
    connectionTimeoutSeconds: 3,
    numRetries: 1,
    retryIntervalSeconds: 0.2,
    logLevel: 'warn',
  })
  return client
}

export function searchCollection() {
  return typesense().collections<Record<string, unknown>>(SEARCH_COLLECTION_NAME)
}

export function isTypesenseConfigured() {
  return Boolean(process.env.TYPESENSE_API_KEY || process.env.TYPESENSE_HOST)
}
