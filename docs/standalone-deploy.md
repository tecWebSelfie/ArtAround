# Standalone deploy

The deploy container gets only the `.next/standalone` output of `pnpm build` and
runs a single node command inside it. This guide covers what that requires.

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
symbolic links** (`cp -a`, `rsync -a`, or `tar`): Next's pnpm layout and the
externals linked above are relative symlinks into `node_modules/.pnpm`. A copy
that follows them duplicates every linked package and may no longer fit the
quota. Build on Linux: on Windows the links are junctions, which are always
absolute paths of the build machine.
