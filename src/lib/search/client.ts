import { Client } from 'typesense'

/**
 * The one Typesense client (Typesense Cloud in every environment).
 *
 * Every read and write goes through the Next server (server components, route
 * handlers, Payload hooks): the browser never talks to Typesense and no key is
 * ever exposed with a `NEXT_PUBLIC_` prefix. `TYPESENSE_API_KEY` is the admin
 * key of the cluster.
 *
 * There is no local fallback service: without `TYPESENSE_HOST` and
 * `TYPESENSE_API_KEY` the search is reported as unavailable instead of quietly
 * querying a Docker container. Reads then surface an error and writes are
 * skipped (a Payload save must still succeed without search).
 *
 * Not marked `server-only`: the reindex script and Payload hooks run outside
 * Next's React server tree. Never import it from a client component.
 */
export const SEARCH_COLLECTION_NAME = process.env.TYPESENSE_COLLECTION ?? 'artaround'

/** The two variables without which there is no cluster to talk to. */
export function isTypesenseConfigured() {
  return Boolean(process.env.TYPESENSE_HOST && process.env.TYPESENSE_API_KEY)
}

/** Thrown by every read when the cluster is missing or unreachable. */
export class SearchUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'SearchUnavailableError'
  }
}

let client: Client | null = null

export function typesense() {
  if (!isTypesenseConfigured()) {
    throw new SearchUnavailableError(
      'Typesense is not configured: set TYPESENSE_HOST and TYPESENSE_API_KEY.',
    )
  }
  client ??= new Client({
    nodes: [
      {
        host: process.env.TYPESENSE_HOST as string,
        // Typesense Cloud speaks HTTPS on 443; a self-hosted cluster can pass
        // other values through the environment.
        port: Number(process.env.TYPESENSE_PORT ?? 443),
        protocol: process.env.TYPESENSE_PROTOCOL ?? 'https',
      },
    ],
    apiKey: process.env.TYPESENSE_API_KEY as string,
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
