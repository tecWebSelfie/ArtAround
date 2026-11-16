/**
 * Standalone completion step (runs right after `next build`, chained in the
 * `build` script after `copy-standalone-assets.mjs`): compiles the production
 * seed and the search reindex into self-contained ESM bundles inside
 * `.next/standalone/scripts/`, and copies the boot entry point next to them.
 *
 * Why bundles and not the TypeScript sources run through tsx: `.next/standalone`
 * ships only what Next traced. The `payload` CLI would need tsx (untraced), and
 * `payload.config.ts` imports packages Next bundles into the server chunks
 * instead of tracing as packages (richtext-lexical, the plugins, …) — a
 * tsx-based flow would miss files. The bundles keep as `external` only what the
 * standalone really has on disk (checked below); everything else — the config
 * itself, the plugins, `@pascal-app/core`, … — is compiled in.
 *
 * A build without a standalone output (or one that failed before writing it)
 * has nothing to complete, like `copy-standalone-assets.mjs`.
 */
import esbuild from 'esbuild'
import { copyFile, lstat, mkdir, readdir, rm, stat, symlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const standalone = path.join(projectRoot, '.next', 'standalone')
const standaloneScripts = path.join(standalone, 'scripts')
const standaloneNodeModules = path.join(standalone, 'node_modules')

/** stat() that resolves symlinks, as false when missing. */
const existsAt = (p) => stat(p).then(() => true, () => false)
/** lstat() as null when missing. */
const lstat2 = (p) => lstat(p).catch(() => null)

const exists = await existsAt(standalone)
if (!exists) process.exit(0)

/**
 * Packages the bundles import from disk instead of compiling in. They must be
 * resolvable from `.next/standalone/scripts/`: Node walks up to the standalone
 * `node_modules`, so a top-level entry (real dir or junction) is enough.
 * Mongoose stays external because the mongodb adapter already resolves it
 * through its own `.pnpm` closure; bundling it would drag the optional native
 * modules of the driver into the artifact.
 */
const externals = [
  'payload',
  '@payloadcms/db-mongodb',
  'mongoose',
  'jsdom',
  'sharp',
  'graphql',
]

/**
 * Next traces some externals only into `node_modules/.pnpm` without a
 * top-level entry (which Node would not find), and others as a *partial* real
 * directory — a top-level copy of the files the server bundle imports, missing
 * subpaths other entry points use. For each external, link the real package
 * directory from the `.pnpm` store at its usual top-level path (junction on
 * Windows, symlink elsewhere), the layout a plain `node_modules` install has.
 */
async function linkExternals() {
  const pnpmDir = path.join(standaloneNodeModules, '.pnpm')
  for (const name of externals) {
    const top = path.join(standaloneNodeModules, name)
    const flat = name.replace('/', '+')
    let linkTarget
    for (const entry of await readdir(pnpmDir)) {
      if (!entry.startsWith(`${flat}@`)) continue
      linkTarget = path.join(pnpmDir, entry, 'node_modules', name)
      break
    }
    if (!linkTarget) {
      throw new Error(`${name} is marked external but is missing from .next/standalone`)
    }
    // A junction to the store is already the full package; a real directory is
    // Next's partial trace copy, to be replaced.
    const existing = await lstat2(top)
    if (existing?.isSymbolicLink()) continue
    if (existing) await rm(top, { recursive: true, force: true })
    await mkdir(path.dirname(top), { recursive: true })
    // Relative targets keep the standalone folder relocatable (Docker copies).
    await symlink(path.relative(path.dirname(top), linkTarget), top, 'junction')
  }
}

const scripts = [
  // Production seed (registered in payload.config `bin`, run by `payload seed`).
  { entry: 'src/seed.ts', out: 'standalone-seed.mjs' },
  { entry: 'src/scripts/reindex-search.ts', out: 'standalone-reindex.mjs' },
]

await mkdir(standaloneScripts, { recursive: true })

for (const { entry, out } of scripts) {
  await esbuild.build({
    entryPoints: [path.join(projectRoot, entry)],
    outfile: path.join(standaloneScripts, out),
    bundle: true,
    format: 'esm',
    platform: 'node',
    // Both scripts rely on top-level await, so the output must be ESM; the
    // tsconfig resolves their `@/` and `@payload-config` aliases at bundle time.
    tsconfig: path.join(projectRoot, 'tsconfig.json'),
    target: 'node20',
    sourcemap: false,
    minify: false,
    logLevel: 'warning',
    external: externals,
    // Bundled CJS dependencies (express, raw-body, next's compiled chunks, …)
    // keep calling require() and __dirname in the ESM output; esbuild's stubs
    // would throw, so wire both up to the real module system. __dirname is the
    // bundle's own directory (.next/standalone/scripts), what the bundled
    // chunks expect. The helper imports use unlikely names: bundled sources
    // import fileURLToPath themselves under the plain name.
    banner: {
      js: [
        "import { createRequire as __bundleCreateRequire } from 'node:module';",
        "import { dirname as __bundleDirname } from 'node:path';",
        "import { fileURLToPath as __bundleFileURLToPath } from 'node:url';",
        'const require = __bundleCreateRequire(import.meta.url);',
        'const __dirname = __bundleDirname(__bundleFileURLToPath(import.meta.url));',
      ].join('\n'),
    },
  })
}

await linkExternals()

await copyFile(
  path.join(projectRoot, 'scripts', 'standalone-boot.mjs'),
  path.join(standaloneScripts, 'standalone-boot.mjs'),
)
