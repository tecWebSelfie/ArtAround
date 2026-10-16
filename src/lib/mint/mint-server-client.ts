import 'server-only'

import { createClient } from '../pascal/mint/client/client'

/**
 * Authenticated Mint client for server-only code (route handlers, server
 * actions/components). Holds `MINT_API_KEY`, so it must never be imported
 * from client components — `server-only` fails the build if that happens.
 */
export const mintServerClient = createClient({
  baseUrl: 'https://api.mint.gg',
  auth: () => process.env.MINT_API_KEY ?? '',
})
