#!/usr/bin/env node
/**
 * `pnpm db:start`: starts the development MongoDB, the `mongodb` service of
 * docker-compose.yml (no authentication, loopback only), and waits until it
 * answers. The same database on a PC (Docker Desktop) and in a Claude Code
 * cloud session, so there is no second MongoDB installation to keep in step.
 * Idempotent: an already running database is left as it is.
 *
 * It then starts the local LiveKit server too (`livekit`, included from
 * my-agent/compose.livekit.yaml, `--dev` keys `devkey`/`secret`): group tours
 * and their e2e spec need a real one, and a cloud container restart stops it
 * along with everything else. LiveKit is best effort: if it can't start, the
 * script warns and still exits 0, since everything but group tours works
 * without it.
 *
 * Options:
 *   --seed-if-new  run `pnpm seed:e2e` when this call created the data volume
 *                  (never on an existing one: it may hold your test data).
 *                  Needs `.env`, so `scripts/cloud-preview.sh` writes it first.
 *
 * Node rather than a shell script so that it runs the same on Windows.
 */
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, openSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const seedIfNew = process.argv.includes('--seed-if-new')

const log = (message) => console.log(`\x1b[1m[db:start]\x1b[0m ${message}`)
const run = (cmd, args, options = {}) =>
  execFileSync(cmd, args, { cwd: root, encoding: 'utf8', ...options })
const succeeds = (cmd, args) => {
  try {
    run(cmd, args, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 1. The Docker daemon. Docker Desktop starts it on a PC; a cloud session's
// container ships `dockerd` but does not start it at boot.
if (!succeeds('docker', ['info'])) {
  if (process.env.CLAUDE_CODE_REMOTE !== 'true') {
    console.error('Docker is not running: start Docker Desktop, then run `pnpm db:start` again.')
    process.exit(1)
  }
  const cache = path.join(process.env.XDG_CACHE_HOME ?? path.join(homedir(), '.cache'), 'artaround')
  mkdirSync(cache, { recursive: true })
  const logFile = openSync(path.join(cache, 'dockerd.log'), 'a')
  spawn('dockerd', [], { detached: true, stdio: ['ignore', logFile, logFile] }).unref()
  log('Starting the Docker daemon…')
  let ready = false
  for (let i = 0; i < 60 && !ready; i++) {
    await sleep(500)
    ready = succeeds('docker', ['info'])
  }
  if (!ready) {
    console.error(`The Docker daemon did not start: see ${path.join(cache, 'dockerd.log')}.`)
    process.exit(1)
  }
}

// 2. Whether the data volume exists yet, under the name compose gives it
// (project name + `mongo-data`), to know if the database is new.
const config = JSON.parse(run('docker', ['compose', 'config', '--format', 'json']))
const volume = config.volumes['mongo-data'].name
const isNew = !succeeds('docker', ['volume', 'inspect', volume])

// 3. Start it and wait for the compose healthcheck (a `ping` through mongosh).
log(isNew ? 'Creating the MongoDB volume and starting MongoDB…' : 'Starting MongoDB…')
run('docker', ['compose', 'up', '--detach', '--wait', 'mongodb'], { stdio: 'inherit' })
log('MongoDB is ready on mongodb://127.0.0.1:27017.')

// 4. LiveKit for group tours (best effort, see the header).
try {
  run('docker', ['compose', 'up', '--detach', '--wait', 'livekit'], { stdio: 'inherit' })
  log('LiveKit is ready on ws://localhost:7880.')
} catch {
  console.warn('LiveKit did not start: group tours (and their e2e spec) will not connect.')
}

if (isNew && seedIfNew) {
  log('Seeding the new database (pnpm seed:e2e)…')
  run('pnpm', ['seed:e2e'], { stdio: 'inherit', shell: process.platform === 'win32' })
}
