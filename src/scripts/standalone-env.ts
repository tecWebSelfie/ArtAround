/**
 * Makes a bundled standalone script started by hand
 * (`node scripts/standalone-tts-check.mjs`) see what the boot script gives
 * the ones it starts (`scripts/standalone-boot.mjs`): the standalone root as
 * working directory, where `server.js` runs and a relative upload `staticDir`
 * resolves, and the variables of `.env.local`, `.env.production` and `.env`
 * (PAYLOAD_SECRET, DATABASE_URL, the AI keys), in Next's production
 * precedence; a variable already set is never overridden.
 *
 * Import it first: ES modules are evaluated in import order, and
 * `payload.config` and the AI providers read the environment as they load.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// The bundle sits in `.next/standalone/scripts/`; outside a standalone
// (a source checkout) nothing changes.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
if (existsSync(path.join(root, 'server.js'))) {
  process.chdir(root)
  for (const file of ['.env.local', '.env.production', '.env']) {
    try {
      process.loadEnvFile(file)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
}
