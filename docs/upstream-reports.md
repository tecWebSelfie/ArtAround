# Upstream reports (pending)

Known bugs in our dependencies, each with the report drafted for the
day we decide to file it. Filing is the maintainer's call (2026-11-23:
not yet — the focus stays on the project); this page keeps the
diagnosis and the evidence from ever being re-collected.

Both were verified against the pinned versions in `package.json` AND
against each project's `main` — no upgrade available today fixes
either.

## payload: stored join fields crash Local API updates

**Where it bit us:** `scripts/set-museum-color.ts` (its comment and PR
#16 tell the story). Any Local API `update` of a museum whose Mongo
document carries a _stored_ join field — legacy junk our
pre-2026-10-19 seeds wrote (`tours: [tourId]` in the create data) —
crashes in `afterRead` with `TypeError: Cannot set properties of
undefined (setting '0')`.

**The bug, two halves:**

- the write path stores join fields verbatim into Mongo instead of
  stripping them (a join is a read-time virtual, yet `payload.create`
  with a join field in `data` persists it);
- `relationshipPopulationPromise` (`populate()`, the join branch
  around line 118 of `fields/hooks/afterRead/relationshipPopulationPromise.ts`)
  guards on both shapes — `Array.isArray(value) ||
Array.isArray(value?.docs)` — but writes only the `{docs}` shape, so
  a stored array reaches the write and throws.

`find`/`findByID` are safe: the join query in `find.js` replaces the
stored value with `{docs, hasNextPage}` before population. `update`
runs no join query, so the raw array reaches `afterRead` — which is
why only updates ever failed and reads always looked healthy.

**Report draft:** the repro is two calls — `payload.create` passing a
join field in `data`, then `payload.update` on the same doc: the
update throws. Suggest: strip join fields on the write path, and/or
make the join write shape-aware. Present in 3.89.0 and on their `main`
as of 2026-11-22 (the file's last commit is 2026-03-30), so no bump
fixes it: the 3.94.1 compat matrix is clean (every `@payloadcms/*` pin
we use exists there, the translator's `payload: ^3.76.0` peer accepts
it, payload's only peer is `graphql: ^16.8.1` which we already
satisfy), but there is nothing to gain — the dev DB was cleaned on
2026-11-21 and the writer is gone.

## vitest: toMatchScreenshot in afterEach masks the real failure

**Where it bit us:** the visual regression lane — its first reds
(2026-11-21/22) took a day to diagnose because the reported error was
not the real one (PR #17 tells the story: 89 failures that were really
missing references and stale post-restyle captures).

**The bug:** browser-mode `toMatchScreenshot` records the failure's
artifacts via `recordArtifact(this.task, …)` (`@vitest/browser`'s
`expect-element.js`); in `afterEach` the story test is already
finalized 'pass', and `recordArtifact`'s guard (`@vitest/runner`
throws when `task.result.state !== "run"`) turns the recording itself
into the reported error — "Cannot record a test artifact outside of
the test run" — replacing the matcher's verdict (missing reference /
pixel count / unstable) and attaching the generic poll cause "Matcher
did not succeed in time". No actual/diff images are attached either,
so a failing run's diff-upload step always finds nothing.

**Report draft:** the repro is a browser-mode test whose `afterEach`
does `await expect.element(locator).toMatchScreenshot(name)` against a
missing or mismatching reference; the reported error is the artifact
one. Suggest: allow artifact recording from hooks (or record against
the run instead of the finalized task), and never let the recording
error replace the matcher's own.

**While it is unfixed:** read a red lane by the failing story names
and by regenerating to compare — the error text is not evidence of
anything (`.storybook/vitest.visual.ts` points here too).

## related, no report needed: --maxWorkers is a no-op for projects

`vitest --maxWorkers` never reaches project configs on our pinned
4.0.18 (upstream vitest#11051; fixed by #11102, merged 2026-08-31,
after 4.0.18): the CLI-override allowlist for projects omits it, and
browser mode reads `project.config.maxWorkers`. If the lane ever needs
worker limiting before an upgrade, the working knobs are the
`VITEST_MAX_WORKERS` environment variable (applied to every project by
`resolveConfig`) or `maxWorkers` in the project's own config. Moot
once a vitest upgrade passes #11102.
