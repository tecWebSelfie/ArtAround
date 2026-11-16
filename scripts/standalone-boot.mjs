/**
 * Single-container entry point for the standalone deploy: seed → reindex →
 * app. The Docker container runs just this file:
 *
 *   node .next/standalone/scripts/standalone-boot.mjs
 *
 * It is plain Node ESM on purpose (no project imports): `.next/standalone`
 * ships only what Next traced, so everything this script needs — the seed and
 * reindex bundles (`scripts/build-standalone-scripts.mjs` compiles them at the
 * end of `pnpm build`) and the externals they resolve from the standalone's
 * own `node_modules` — must already be there.
 *
 * Every step is safe to repeat: the seed upserts by natural key (its own
 * skips), the reindex rebuilds the search collection from scratch, and the
 * server is stateless — so an entrypoint that always seeds is what makes a
 * fresh database usable without a manual step.
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
// .../scripts → the standalone root, where server.js and node_modules live.
const root = path.resolve(scriptDir, '..')
process.chdir(root)

/** Minimal .env loader (dotenv is not guaranteed to be traced into standalone). */
function loadEnvFile(name) {
  let content
  try {
    content = readFileSync(path.join(root, name), 'utf8')
  } catch {
    return
  }
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.exec(line)
    if (!match || line.trim().startsWith('#')) continue
    const [, key, raw] = match
    let value = (raw ?? '').trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
// Same precedence as the repo scripts: `.env.local` wins over `.env`.
loadEnvFile('.env')
loadEnvFile('.env.local')

// Mirror `pnpm start` and the Docker guidance for `output: 'standalone'`:
// silence deprecation warnings and listen on every interface in the container.
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || '--no-deprecation'
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0'
process.env.PORT = process.env.PORT || '3000'

/**
 * Runs one command to completion in the standalone root; exits on failure.
 * `cwd` keeps the child in the standalone root so relative paths (`server.js`)
 * and file-based env/config lookups behave like the documented deployment.
 */
function run(label, args) {
  console.log(`[boot] ${label}: node ${args.join(' ')}`)
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: 'inherit',
      env: process.env,
      cwd: root,
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${label} exited with code ${code}`))
    })
  })
}

try {
  await run('seed', ['scripts/standalone-seed.mjs'])
  await run('reindex', ['scripts/standalone-reindex.mjs'])
} catch (error) {
  console.error('[boot] failed before the server could start:', error)
  process.exit(1)
}

console.log('[boot] starting the app…')
// The server is the container's long-lived process: this script stays alive
// while it runs and forwards the stop signals to it, so `docker stop` ends
// both cleanly.
const server = spawn(process.execPath, ['server.js'], { stdio: 'inherit', env: process.env })
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal))
}
server.on('exit', (code) => process.exit(code ?? 0))
