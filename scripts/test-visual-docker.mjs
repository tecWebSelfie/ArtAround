#!/usr/bin/env node
/**
 * Runs the visual regression tests (`pnpm test:visual`, `pnpm
 * test:visual:update`) inside the official Playwright Docker image, on any
 * host: `node scripts/test-visual-docker.mjs [--update] [vitest filters…]`.
 *
 * Why Docker: screenshots depend on the OS's font rendering, and the project
 * is worked on both from a Windows PC and from Linux cloud sessions. Running
 * every capture in the same Linux image gives one reference set
 * (`__screenshots__/*-chromium-linux.png`) that matches everywhere. The image
 * tag follows the project's Playwright version, so its browser is the one the
 * tests expect.
 *
 * The repository is mounted into the container; `node_modules` and the pnpm
 * store live in named Docker volumes instead, because the host's
 * `node_modules` holds binaries for the host OS (Windows). The first run
 * installs dependencies (a few minutes); later runs reuse the volumes.
 *
 * Behind a proxy (cloud sessions) the host's proxy variables and CA bundle are
 * forwarded, and on Linux the container shares the host network so a proxy on
 * localhost is reachable.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { version } = JSON.parse(
  readFileSync(resolve(root, 'node_modules/playwright/package.json'), 'utf8'),
)
const image = `mcr.microsoft.com/playwright:v${version}-noble`

const args = process.argv.slice(2)
// Arguments are forwarded to vitest inside a shell: quote each one.
const quoted = args.map((arg) => `'${arg.replaceAll("'", `'\\''`)}'`).join(' ')

const docker = ['run', '--rm', '--init', '--ipc=host']
docker.push('-v', `${root}:/work`, '-w', '/work')
docker.push('-v', 'artaround-visual-node-modules:/work/node_modules')
docker.push('-v', 'artaround-visual-pnpm-store:/pnpm-store')
// No git hooks to install inside the container.
docker.push('-e', 'HUSKY=0')
if (process.platform === 'linux') docker.push('--network', 'host')
for (const name of [
  'HTTPS_PROXY',
  'HTTP_PROXY',
  'NO_PROXY',
  'https_proxy',
  'http_proxy',
  'no_proxy',
]) {
  if (process.env[name]) docker.push('-e', `${name}=${process.env[name]}`)
}
// A CA bundle for the proxy: mount it at the same path and point Node at it.
const ca = process.env.NODE_EXTRA_CA_CERTS
if (ca && existsSync(ca)) docker.push('-v', `${ca}:${ca}:ro`, '-e', `NODE_EXTRA_CA_CERTS=${ca}`)

const script = [
  'corepack enable',
  'pnpm config set store-dir /pnpm-store',
  'pnpm install --frozen-lockfile',
  `pnpm test:visual:run ${quoted}`,
].join(' && ')
docker.push(image, 'bash', '-c', script)

const result = spawnSync('docker', docker, { stdio: 'inherit' })
if (result.error) {
  console.error(`test-visual-docker: ${result.error.message} (is Docker running?)`)
  process.exit(1)
}
process.exit(result.status ?? 1)
