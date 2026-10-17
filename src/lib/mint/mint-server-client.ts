/**
 * ⚠️ SERVER-ONLY by convention (do not add the `server-only` package import:
 * it throws under tsx-run Payload CLIs like `generate:types` / bin scripts).
 *
 * Authenticated Mint client for server-side code (Payload tasks/workflows,
 * custom endpoints). Holds `MINT_API_KEY`, so it must never be imported from
 * client components — the key would be inlined into the browser bundle.
 */
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
