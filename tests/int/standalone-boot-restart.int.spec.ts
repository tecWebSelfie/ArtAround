/**
 * Regression for the 25 Nov 2026 canary failure (and the 23 Nov "kept
 * serving the old build until restarted by hand"): the deploy container's
 * nodemon restarts `scripts/standalone-boot.mjs` with SIGUSR2, a signal the
 * boot did not handle, so the boot died at once and left its `server.js`
 * child orphaned on the port. The restarted boot's own server could not
 * listen, the orphan kept rendering the previous build, and the deploy's
 * `rsync --delete` had removed that build's chunks: the live pages listed
 * CSS/JS that answered 500 and never hydrated ("client-side exception").
 *
 * These specs run the real boot script in a throwaway standalone-shaped
 * folder whose seed, reindex and server are stubs, and check the two
 * invariants: a restart signal takes the server down with the boot, and a
 * boot never leaves an earlier server of the same folder running.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// The orphan reaping reads /proc, as the Linux deploy container does.
const linux = process.platform === 'linux'

const bootSource = path.resolve(__dirname, '../../scripts/standalone-boot.mjs')

let root: string
const spawned: ChildProcess[] = []

/** True while `pid` is a live process (signal 0 only probes). */
function alive(pid: number) {
  try {
    process.kill(pid, 0)
    // A zombie still answers the probe: count it as gone.
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8')
    return stat.slice(stat.lastIndexOf(')') + 2)[0] !== 'Z'
  } catch {
    return false
  }
}

async function waitFor(check: () => boolean, ms = 5_000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (check()) return true
    await new Promise((r) => setTimeout(r, 50))
  }
  return check()
}

/** The pid the stub server.js wrote once it started (`label` tells runs apart). */
function serverPid(label: string) {
  try {
    return Number(readFileSync(path.join(root, `server-${label}.pid`), 'utf8'))
  } catch {
    return 0
  }
}

function startBoot(label: string) {
  const boot = spawn(process.execPath, ['scripts/standalone-boot.mjs'], {
    cwd: root,
    env: { ...process.env, SERVER_LABEL: label, NODE_OPTIONS: '' },
    stdio: 'ignore',
  })
  spawned.push(boot)
  return boot
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'boot-restart-'))
  mkdirSync(path.join(root, 'scripts'))
  copyFileSync(bootSource, path.join(root, 'scripts/standalone-boot.mjs'))
  writeFileSync(path.join(root, 'scripts/standalone-seed.mjs'), '')
  writeFileSync(path.join(root, 'scripts/standalone-reindex.mjs'), '')
  // A server that, like Next's, runs until signalled; Node's default for
  // SIGUSR2 (terminate) is left alone, as Next leaves it.
  writeFileSync(
    path.join(root, 'server.js'),
    `require('fs').writeFileSync('server-' + process.env.SERVER_LABEL + '.pid', String(process.pid))
process.on('SIGTERM', () => process.exit(0))
setInterval(() => {}, 1000)
`,
  )
})

afterEach(() => {
  for (const child of spawned.splice(0)) child.kill('SIGKILL')
  for (const label of ['first', 'second', 'orphan']) {
    const pid = serverPid(label)
    if (pid && alive(pid)) process.kill(pid, 'SIGKILL')
  }
  rmSync(root, { recursive: true, force: true })
})

describe.runIf(linux)('standalone boot restarts', { timeout: 30_000 }, () => {
  it("nodemon's restart signal (SIGUSR2) stops the server with the boot", async () => {
    const boot = startBoot('first')
    expect(await waitFor(() => serverPid('first') > 0)).toBe(true)
    const server = serverPid('first')

    boot.kill('SIGUSR2')

    expect(await waitFor(() => !alive(boot.pid!))).toBe(true)
    expect(await waitFor(() => !alive(server)), 'server.js must not outlive its boot').toBe(true)
  })

  it('a boot stops a server an earlier boot of the same folder left running', async () => {
    // The orphan an old boot left behind: `node server.js` in this folder.
    const orphan = spawn(process.execPath, ['server.js'], {
      cwd: root,
      env: { ...process.env, SERVER_LABEL: 'orphan' },
      stdio: 'ignore',
    })
    spawned.push(orphan)
    expect(await waitFor(() => serverPid('orphan') > 0)).toBe(true)

    startBoot('second')

    expect(await waitFor(() => serverPid('second') > 0)).toBe(true)
    expect(await waitFor(() => !alive(orphan.pid!)), 'the orphan must be stopped').toBe(true)
    expect(alive(serverPid('second'))).toBe(true)
  })
})
