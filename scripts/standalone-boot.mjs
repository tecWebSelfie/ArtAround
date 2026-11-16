/**
 * Single-container entry point for the standalone deploy: seed → reindex →
 * app. The deploy container can't be entered and runs just this file:
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
 * fresh database usable without a manual step. A failed seed or reindex is
 * logged and the app starts anyway: nobody can enter the container to fix it,
 * so a site that serves (and logs why its data may be incomplete) beats one
 * that never comes up.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// .../scripts → the standalone root, where server.js and node_modules live;
// every child inherits it as cwd.
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))

// Node's own .env loader (≥ 20.12; dotenv is not guaranteed to be traced). It
// never overrides a variable already set, so the container environment wins,
// then `.env.local`, then `.env` — the same precedence as the repo scripts.
// The seed and the reindex need these; server.js would load them itself.
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

// Mirror `pnpm start` and the Docker guidance for `output: 'standalone'`:
// silence deprecation warnings and listen on every interface in the container.
process.env.NODE_OPTIONS ||= '--no-deprecation'
process.env.HOSTNAME ||= '0.0.0.0'
process.env.PORT ||= '3000'

// As the container's PID 1 this process gets `docker stop`'s SIGTERM: forward
// it to whichever child runs (seed, reindex or server) from the start, so the
// stop never waits for the kill timeout.
let child
let stopping = false
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopping = true
    child?.kill(signal)
  })
}

/** Runs `node <script>`; resolves with its exit code (non-zero when killed). */
function run(script) {
  console.log(`[boot] node ${script}`)
  child = spawn(process.execPath, [script], { stdio: 'inherit' })
  return new Promise((resolve) => {
    child.on('error', (error) => {
      console.error(`[boot] ${script} could not start:`, error)
      resolve(1)
    })
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

for (const script of ['scripts/standalone-seed.mjs', 'scripts/standalone-reindex.mjs']) {
  const code = await run(script)
  // A stop during the seed or reindex must not go on to start the server.
  if (stopping) process.exit(code)
  if (code !== 0) console.error(`[boot] ${script} failed (exit ${code}); starting the app anyway`)
}

// The server is the container's long-lived process: its exit code becomes the
// container's, so a restart policy sees crashes (a requested stop exits 0).
const code = await run('server.js')
process.exit(stopping ? 0 : code)
