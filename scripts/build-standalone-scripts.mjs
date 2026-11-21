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
import { copyFile, lstat, mkdir, realpath, rm, stat, symlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const standalone = path.join(projectRoot, '.next', 'standalone')
const standaloneScripts = path.join(standalone, 'scripts')
const standaloneNodeModules = path.join(standalone, 'node_modules')

/** stat() that resolves symlinks, as false when missing. */
const existsAt = (p) =>
  stat(p).then(
    () => true,
    () => false,
  )

if (!(await existsAt(standalone))) process.exit(0)

/**
 * Packages the bundles import from disk instead of compiling in. They must be
 * resolvable from `.next/standalone/scripts/`: Node walks up to the standalone
 * `node_modules`, so a top-level entry (real dir or junction) is enough.
 * Each must be a direct dependency of the project (its version is read from
 * the project's own `node_modules`, see `linkExternals`). Mongoose is not
 * listed: only the external mongodb adapter imports it, and resolves it
 * through its own `.pnpm` closure.
 */
const externals = ['payload', '@payloadcms/db-mongodb', 'jsdom', 'sharp', 'graphql']

/**
 * Next traces some externals only into `node_modules/.pnpm` without a
 * top-level entry (which Node would not find), and others as a *partial* real
 * directory — a top-level copy of the files the server bundle imports, missing
 * subpaths other entry points use. For each external, link the real package
 * directory from the `.pnpm` store at its usual top-level path (junction on
 * Windows, symlink elsewhere), the layout a plain `node_modules` install has.
 */
async function linkExternals() {
  for (const name of externals) {
    // The store entry the project itself resolves (`node_modules/<name>` is a
    // pnpm symlink into `.pnpm/<entry>/node_modules/<name>`): the version the
    // bundles were compiled against, even when the store holds several.
    const resolved = await realpath(path.join(projectRoot, 'node_modules', name))
    const relativeToStore = path.relative(path.join(projectRoot, 'node_modules', '.pnpm'), resolved)
    const linkTarget = path.join(standaloneNodeModules, '.pnpm', relativeToStore)
    if (!(await existsAt(linkTarget))) {
      throw new Error(
        `${name} is marked external but ${relativeToStore} is missing from .next/standalone`,
      )
    }
    const top = path.join(standaloneNodeModules, name)
    // A link is already Next's own pnpm layout; a real directory is Next's
    // partial trace copy, to be replaced.
    const existing = await lstat(top).catch(() => null)
    if (existing?.isSymbolicLink()) continue
    if (existing) await rm(top, { recursive: true, force: true })
    await mkdir(path.dirname(top), { recursive: true })
    // Relative targets keep the standalone folder relocatable (it is built in
    // one folder and copied into the deploy one). On Windows a junction is
    // always absolute: build on the deploy OS (see docs/standalone-deploy.md).
    await symlink(path.relative(path.dirname(top), linkTarget), top, 'junction')
  }
}

const scripts = [
  // Production seed (registered in payload.config `bin`, run by `payload seed`).
  { entry: 'src/seed.ts', out: 'standalone-seed.mjs' },
  { entry: 'src/scripts/search-reindex.ts', out: 'standalone-reindex.mjs' },
  // Read-aloud diagnostics, run by the boot script before the server.
  { entry: 'src/scripts/tts-check.ts', out: 'standalone-tts-check.mjs' },
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
