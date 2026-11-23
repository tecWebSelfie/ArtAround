#!/usr/bin/env node
/**
 * `pnpm services:start`: starts the local services the app needs, in Docker.
 *
 * First the development MongoDB, the `mongodb` service of
 * docker-compose.yml (no authentication, loopback only), and waits until it
 * answers. The same database on a PC (Docker Desktop) and in a Claude Code
 * cloud session, so there is no second MongoDB installation to keep in step.
 * Idempotent: an already running database is left as it is.
 *
 * It also starts the local Typesense node (`typesense`, development key
 * `xyz`, loopback only), which the search pages, Payload's indexing hooks and
 * the integration specs reach through the TYPESENSE_* variables of
 * .env.example (deployments point them at Typesense Cloud). If it can't
 * start, the script warns and goes on: search then reads as unavailable.
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
import { existsSync, mkdirSync, openSync, readFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const seedIfNew = process.argv.includes('--seed-if-new')

const log = (message) => console.log(`\x1b[1m[services:start]\x1b[0m ${message}`)
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
    console.error('Docker is not running: start Docker Desktop, then run `pnpm services:start` again.')
    process.exit(1)
  }
  const cache = path.join(process.env.XDG_CACHE_HOME ?? path.join(homedir(), '.cache'), 'artaround')
  mkdirSync(cache, { recursive: true })
  // A container restart keeps /run but not the processes: dockerd then reads
  // the old containerd pid, finds some other process under that number,
  // waits for a containerd that never answers and gives up ("timeout waiting
  // for containerd to start"). Drop the pid file unless containerd runs.
  const containerdPid = '/run/docker/containerd/containerd.pid'
  if (existsSync(containerdPid)) {
    const pid = readFileSync(containerdPid, 'utf8').trim()
    const comm = existsSync(`/proc/${pid}/comm`) ? readFileSync(`/proc/${pid}/comm`, 'utf8') : ''
    if (!comm.startsWith('containerd')) rmSync(containerdPid, { force: true })
  }
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

// 3. Start them all, LiveKit and Typesense first without waiting, so their
// image pulls and starts overlap MongoDB's; then wait for each healthcheck
// (a `ping` through mongosh for MongoDB, `/health` for Typesense). LiveKit
// and Typesense stay best effort (see the header).
const startDetached = (service) => {
  try {
    run('docker', ['compose', 'up', '--detach', service], { stdio: 'inherit' })
    return true
  } catch {
    return false
  }
}
const livekitStarted = startDetached('livekit')
const typesenseStarted = startDetached('typesense')
log(isNew ? 'Creating the MongoDB volume and starting MongoDB…' : 'Starting MongoDB…')
run('docker', ['compose', 'up', '--detach', '--wait', 'mongodb'], { stdio: 'inherit' })
log('MongoDB is ready on mongodb://127.0.0.1:27017.')

// 4. Typesense for search.
try {
  if (!typesenseStarted) throw new Error('not started')
  run('docker', ['compose', 'up', '--detach', '--wait', 'typesense'], { stdio: 'inherit' })
  log('Typesense is ready on http://127.0.0.1:8108 (run `pnpm search:reindex` to fill it).')
  // An .env older than the node has no TYPESENSE_* lines: the app would still
  // report search as unavailable, so say what to copy.
  const envText = ['.env', '.env.local']
    .map((file) => path.join(root, file))
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n')
  if (!process.env.TYPESENSE_HOST && !/^TYPESENSE_HOST=\S/m.test(envText)) {
    console.warn('No TYPESENSE_HOST in .env: copy the Typesense block of .env.example to use it.')
  }
} catch {
  console.warn('Typesense did not start: search will read as unavailable.')
}

// 5. LiveKit for group tours.
try {
  if (!livekitStarted) throw new Error('not started')
  run('docker', ['compose', 'up', '--detach', '--wait', 'livekit'], { stdio: 'inherit' })
  log('LiveKit is ready on ws://localhost:7880.')
} catch {
  console.warn('LiveKit did not start: group tours (and their e2e spec) will not connect.')
}

if (isNew && seedIfNew) {
  log('Seeding the new database (pnpm seed:e2e)…')
  run('pnpm', ['seed:e2e'], { stdio: 'inherit', shell: process.platform === 'win32' })
}
