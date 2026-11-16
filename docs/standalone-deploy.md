# Standalone deploy

The deploy container gets only the `.next/standalone` output of `pnpm build` and
runs a single node command inside it. This guide covers what that requires.

## Deploy procedure

On the deploy server, in a build folder outside the quota (the global pnpm
store outside the home quota too):

    git clone <repo> build && cd build      # or `git pull` in an existing clone
    # once: the production variables (DATABASE_URL, PAYLOAD_SECRET, NEXT_PUBLIC_*, ...)
    cp .env.example .env && $EDITOR .env
    pnpm install --frozen-lockfile
    pnpm build                              # no database needed
    rsync -a --delete .next/standalone/ /path/to/html/standalone/

`/path/to/html` is the folder mounted as the container's root. The
container's single entrypoint is then

    node standalone/scripts/standalone-boot.mjs

(the boot moves into the standalone root by itself, so the working directory
it starts from does not matter). Restart the container after each copy.

- **Variables:** `next build` copies the build folder's `.env` (and
  `.env.production`) into the standalone, so nothing is placed by hand in the
  deploy folder and `--delete` is safe. Keep no `.env.local` in the build
  folder: the build would read it (e.g. for `NEXT_PUBLIC_*`, inlined at build
  time) but not copy it, so the server would run with other values.
- **`-a`** keeps the symlinks (see below); `--delete` removes the files of
  the previous build.

## Build without a database

`pnpm build` may run where MongoDB is not reachable. The build-time reads are
deliberately ordered to bail out of prerendering before any connection:

- the two museum-scoped routes that had `generateStaticParams` (the details
  page and the map editor) read the visitor's session on every request, so
  they are `dynamic = 'force-dynamic'`: no prerendering happens at all, and a
  build without a database never connects for them (a route left SSG with no
  prerendered pages would fail its first request on `headers()`, see below);
- `getSession` (`src/lib/session.ts`) reads the request headers _before_
  opening the database connection: during the build's shell prerendering that
  bails the page out to dynamic rendering first.
- the remaining database touches sit behind `searchParams` reads (which bail
  out the same way) or declare `dynamic = 'force-dynamic'`.

A route that stayed SSG with an empty `generateStaticParams` would not work:
its first request runs an on-demand _static_ render, where reading the
session fails (`DYNAMIC_SERVER_USAGE`, HTTP 500) instead of falling back to
dynamic. That is why the museum routes above are `force-dynamic` rather than
SSG with an empty params array.

## What the standalone output contains

`next build` traces only what the server bundle imports, and the traced copies
can be _partial_: a package Next bundles into the server chunks (the plugins,
`@payloadcms/richtext-lexical`, …) is not traced as a package at all, and one
copied file-by-file may miss subpaths the server never imports. The seed and
the reindex therefore cannot rely on what the trace leaves behind.

`scripts/build-standalone-scripts.mjs` (the last step of `pnpm build`) makes
the standalone self-sufficient:

- it compiles `src/seed.ts` and `src/scripts/reindex-search.ts` into
  self-contained ESM bundles at `.next/standalone/scripts/standalone-seed.mjs`
  and `standalone-reindex.mjs` (esbuild; ESM because both scripts use top-level
  await). Everything not resolvable from the standalone — the payload config,
  the plugins, `@pascal-app/core`, `jose` and `@payloadcms/translations` (whose
  traced copies are partial) — is compiled in; only the packages the
  standalone really ships whole (`payload`, `@payloadcms/db-mongodb`,
  `jsdom`, `sharp`, `graphql`) stay external (mongoose comes through the
  adapter);
- it links the external packages Next left only inside
  `node_modules/.pnpm` — and replaces the partial top-level trace copies of
  the same — with junctions to their full directories in the store;
- it copies `scripts/standalone-boot.mjs` next to them.

`scripts/copy-standalone-assets.mjs` (earlier in `pnpm build`) copies `public/`
and `.next/static/` in.

## Boot script

    node .next/standalone/scripts/standalone-boot.mjs
    # local shortcut: pnpm standalone:boot

Plain Node ESM, no project imports. In order it:

1. loads `.env.local` and `.env` from the standalone root with Node's own
   `process.loadEnvFile` (Node ≥ 20.12; no dotenv, which is not guaranteed to
   be traced). Variables already set win, so the precedence is container
   environment, then `.env.local`, then `.env`;
2. runs the seed bundle (idempotent: upserts by natural key, skips existing
   documents) — makes a fresh database usable;
3. runs the reindex bundle (rebuilds the search collection from the current
   documents);
4. starts `server.js` and exits with its exit code.

A failed seed or reindex is logged and the app starts anyway: the container
can't be entered, so a site that serves beats one that never comes up. The
`SIGINT`/`SIGTERM` of `docker stop` is forwarded to whichever step is running,
and a stop during the seed or reindex does not go on to start the server.

Defaults mirroring the Docker guidance: `HOSTNAME=0.0.0.0`, `PORT=3000`,
`NODE_OPTIONS=--no-deprecation`; each can be overridden from the environment.

The demo museum of the course specification is not part of the boot seed.
`pnpm seed:demo` can't reach the deployed database (only code running inside
the container can), so it is not available in this deploy until it is bundled
into the boot like the seed.

## Copying the standalone into the deploy folder

Build in any folder (the deploy folder's quota is too small for a clone and a
build), then copy `.next/standalone` into the deploy folder **preserving
symbolic links** (`cp -a`, `rsync -a`, or `tar`).

The standalone keeps pnpm's layout: the real files of each package sit in
`node_modules/.pnpm/<name>@<version>/node_modules/<name>`, next to the
packages it depends on, and `node_modules/<name>` is a relative symlink to it
(Next's own trace, plus the externals linked above). Node follows the link to
the real path and finds the dependencies there. A copy that follows the
links instead (`cp -r`, some SFTP clients, a zip) breaks this twice, as
measured on this project:

- it no longer runs: `node_modules/payload` becomes a plain copy outside
  `.pnpm`, and `import('payload')` fails with `Cannot find package 'ws'`;
- it grows from ~314 MB to ~525 MB, which may no longer fit the quota.

Build on Linux: on Windows the links are junctions, which are always
absolute paths of the build machine.

The standalone does not depend on the global pnpm store (wherever it is
configured, e.g. moved out of a home folder with its own quota): Next copies
the real files into `.next/standalone/node_modules/.pnpm`, and every link is
relative and points inside the standalone. The store is only used by
`pnpm install` on the build machine.
