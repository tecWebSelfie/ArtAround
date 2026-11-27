/**
 * Nightly QA regression (standalone boot, `stopStaleServers()`): the sweep
 * lists /proc, then calls `process.kill(pid, 'SIGTERM')` (and later
 * `'SIGKILL'`) without a guard. An orphan `node server.js` that exits on
 * its own after it was read from /proc but before the kill (it crashed, was
 * stopped by hand, or its Next shutdown finished) makes `process.kill`
 * throw ESRCH. The throw is an unhandled rejection of the top-level await:
 * the boot exits 1 and the server never starts, so the site stays down
 * until the next restart.
 *
 * The real window is tiny in a small container, so the spec widens it: many
 * filler processes (with higher pids than the orphan) make the /proc scan
 * take tens of milliseconds, and a helper spawned by the stub reindex kills
 * the orphan a few milliseconds into that scan. A boot must survive the
 * orphan vanishing and still start its own server.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const linux = process.platform === 'linux'
const bootSource = path.resolve(__dirname, '../../../scripts/standalone-boot.mjs')

const spawned: ChildProcess[] = []
const roots: string[] = []

function pidOf(root: string, label: string) {
  try {
    return Number(readFileSync(path.join(root, `server-${label}.pid`), 'utf8'))
  } catch {
    return 0
  }
}

async function waitFor(check: () => boolean, ms = 5_000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (check()) return true
    await new Promise((r) => setTimeout(r, 25))
  }
  return check()
}

/** A throwaway standalone whose reindex stub kills the orphan `killAfterMs` after it exits. */
function makeStandalone(killAfterMs: number) {
  const root = mkdtempSync(path.join(tmpdir(), 'boot-esrch-'))
  roots.push(root)
  mkdirSync(path.join(root, 'scripts'))
  copyFileSync(bootSource, path.join(root, 'scripts/standalone-boot.mjs'))
  writeFileSync(path.join(root, 'scripts/standalone-seed.mjs'), '')
  // The boot's sweep starts right after the reindex exits; a detached helper
  // removes the orphan while the sweep is still scanning /proc.
  writeFileSync(
    path.join(root, 'scripts/standalone-reindex.mjs'),
    `import { spawn } from 'node:child_process'
spawn(process.execPath, ['-e', ${JSON.stringify(
      `setTimeout(() => { try { process.kill(Number(require('fs').readFileSync('server-orphan.pid', 'utf8')), 'SIGKILL') } catch {} }, ${killAfterMs})`,
    )}], { detached: true, stdio: 'ignore' }).unref()
`,
  )
  writeFileSync(
    path.join(root, 'server.js'),
    `require('fs').writeFileSync('server-' + process.env.SERVER_LABEL + '.pid', String(process.pid))
process.on('SIGTERM', () => process.exit(0))
setInterval(() => {}, 1000)
`,
  )
  return root
}

afterEach(() => {
  for (const child of spawned.splice(0)) child.kill('SIGKILL')
  for (const root of roots.splice(0)) {
    for (const label of ['orphan', 'new']) {
      const pid = pidOf(root, label)
      if (pid) {
        try {
          process.kill(pid, 'SIGKILL')
        } catch {}
      }
    }
    rmSync(root, { recursive: true, force: true })
  }
})

describe.runIf(linux)('standalone boot sweep', { timeout: 120_000 }, () => {
  it('survives an orphan server.js exiting between the /proc scan and the kill', async () => {
    const crashes: string[] = []
    // The offset that lands inside the scan depends on the machine: try a few.
    for (const killAfterMs of [3, 5, 8, 12]) {
      const root = makeStandalone(killAfterMs)
      const orphan = spawn(process.execPath, ['server.js'], {
        cwd: root,
        env: { ...process.env, SERVER_LABEL: 'orphan', NODE_OPTIONS: '' },
        stdio: 'ignore',
      })
      spawned.push(orphan)
      expect(await waitFor(() => pidOf(root, 'orphan') > 0)).toBe(true)

      // Fillers spawned after the orphan have higher pids: /proc is read in
      // ascending order, so the orphan is matched first and the scan goes on.
      const fillers = Array.from({ length: 2_500 }, () =>
        spawn('sleep', ['120'], { stdio: 'ignore' }),
      )
      spawned.push(...fillers)
      await new Promise((r) => setTimeout(r, 300))

      let stderr = ''
      const boot = spawn(process.execPath, ['scripts/standalone-boot.mjs'], {
        cwd: root,
        env: { ...process.env, SERVER_LABEL: 'new', NODE_OPTIONS: '' },
        stdio: ['ignore', 'ignore', 'pipe'],
      })
      spawned.push(boot)
      boot.stderr!.on('data', (chunk) => (stderr += chunk))

      const started = await waitFor(() => pidOf(root, 'new') > 0 || boot.exitCode !== null, 15_000)
      if (!started || boot.exitCode !== null || pidOf(root, 'new') === 0) {
        crashes.push(
          `kill after ${killAfterMs} ms: exit ${boot.exitCode}, ${stderr.split('\n').find((l) => /Error/.test(l)) ?? ''}`,
        )
      }

      for (const child of [boot, orphan, ...fillers]) child.kill('SIGKILL')
      const server = pidOf(root, 'new')
      if (server) {
        try {
          process.kill(server, 'SIGKILL')
        } catch {}
      }
      await new Promise((r) => setTimeout(r, 500))
    }

    expect(crashes, 'the boot must not crash when an orphan vanishes mid-sweep').toEqual([])
  })
})
