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
  `mongoose`, `jsdom`, `sharp`, `graphql`) stay external;
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

1. loads `.env` then `.env.local` from the standalone root (no dotenv
   dependency: it is not guaranteed to be traced; variables already set in
   the environment win);
2. runs the seed bundle (idempotent: upserts by natural key, skips existing
   documents) — makes a fresh database usable;
3. runs the reindex bundle (rebuilds the search collection from the current
   documents);
4. starts `server.js` and stays alive while it runs, forwarding `SIGINT`/
   `SIGTERM` so `docker stop` shuts everything down cleanly.

Defaults mirroring the Docker guidance: `HOSTNAME=0.0.0.0`, `PORT=3000`,
`NODE_OPTIONS=--no-deprecation`; each can be overridden from the environment.

The demo museum of the course specification is not part of the boot seed: run
`pnpm seed:demo` against the deployed database manually when it is wanted
(it needs network access for Wikimedia and Wikidata).
