import { createClient } from '../pascal/mint/client/client'

/**
 * Unauthenticated Mint client for browser components. Points at our own
 * `/api/mint` proxy, which checks curator access and attaches
 * `MINT_API_KEY` server-side. Never holds credentials itself.
 */
export const mintBrowserClient = createClient({
  baseUrl: '/api/mint',
})
