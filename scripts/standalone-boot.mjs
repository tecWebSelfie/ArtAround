/**
 * Single-container entry point for the standalone deploy: seed → reindex →
 * (opt-in read-aloud diagnostics) → app. The deploy container can't be entered and runs just this file:
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
// never overrides a variable already set, so the order below is Next's
// production precedence: container environment, `.env.local`,
// `.env.production`, `.env`. `next build` copies `.env.production` and `.env`
// of the build folder into the standalone by itself (not `.env.local`), so
// the production values travel with every build. The seed and the reindex
// need these; server.js loads them itself.
for (const file of ['.env.local', '.env.production', '.env']) {
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

/**
 * Runs `node <script>`; resolves with its exit code (non-zero when killed).
 * With `timeoutMs`, a script still running by then gets SIGTERM, then SIGKILL
 * a few seconds later: a library's SIGTERM handler that doesn't exit must not
 * keep the boot (and so the server) waiting forever.
 */
function run(script, timeoutMs) {
  console.log(`[boot] node ${script}`)
  child = spawn(process.execPath, [script], { stdio: 'inherit' })
  if (timeoutMs) {
    const running = child
    let killTimer
    const timer = setTimeout(() => {
      console.error(`[boot] ${script} still running after ${timeoutMs / 1000} s: stopped`)
      running.kill('SIGTERM')
      killTimer = setTimeout(() => running.kill('SIGKILL'), 5_000)
    }, timeoutMs)
    running.on('exit', () => {
      clearTimeout(timer)
      clearTimeout(killTimer)
    })
  }
  return new Promise((resolve) => {
    child.on('error', (error) => {
      console.error(`[boot] ${script} could not start:`, error)
      resolve(1)
    })
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

// The read-aloud diagnostics (src/scripts/tts-check.ts) write to this log
// what the content audio chain does on this server. Opt-in with `TTS_CHECK=1`
// (e.g. in `.env.production` for one deploy): they hold the server back for up
// to two minutes and pay for a Fish Audio synthesis plus one content audio,
// so they must not run on every boot or restart.
const steps = [
  { script: 'scripts/standalone-seed.mjs' },
  { script: 'scripts/standalone-reindex.mjs' },
  ...(process.env.TTS_CHECK === '1'
    ? [{ script: 'scripts/standalone-tts-check.mjs', timeoutMs: 120_000 }]
    : []),
]
for (const { script, timeoutMs } of steps) {
  const code = await run(script, timeoutMs)
  // A stop during the seed or reindex must not go on to start the server.
  if (stopping) process.exit(code)
  if (code !== 0) console.error(`[boot] ${script} failed (exit ${code}); starting the app anyway`)
}

// The server is the container's long-lived process: its exit code becomes the
// container's, so a restart policy sees crashes (a requested stop exits 0).
const code = await run('server.js')
process.exit(stopping ? 0 : code)
