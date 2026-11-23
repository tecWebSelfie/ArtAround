# Upstream reports (pending)

Known bugs in our dependencies, each with the report drafted for the
day we decide to file it. Filing is the maintainer's call (2026-11-23:
not yet — the focus stays on the project); this page keeps the
diagnosis and the evidence from ever being re-collected.

All three were verified against the pinned versions in `package.json`
AND against each project's current sources — no upgrade available today
fixes any of them.

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

## vitest: the toMatchScreenshot mask types lie twice

**Where it bit us:** the `visual.mask` support this report ships with
(the MuseumMetadataForm branch): the first implementation was written
straight off the declared types, typechecked clean, and failed all 7
stories with `TypeError: page.locator is not a function`.

**The bug, two type lies on one path:**

- `ScreenshotMatcherArguments` (`@vitest/browser`
  `dist/shared/screenshotMatcher/types.d.ts`) declares
  `screenshotOptions.mask?: readonly string[]` — but that is the
  POST-conversion RPC shape. The client matcher (`expect-element.js`)
  runs every entry through `convertToSelector`, which accepts only DOM
  `Element`s (→ a unique CSS selector) or vitest Locators
  (`Symbol.for('$$vitest:locator')`, → their `.selector` string) and
  THROWS on a raw string ("Expected element or locator to be an
  instance of Element or Locator").
- the `page` object exported from 'vitest/browser' is typed with the
  full Playwright `Page` surface (so `page.locator(selector)`
  compiles) but at runtime is a provider shim without `locator()`;
  `page.elementLocator()` is the only factory, and its declared
  signature takes an `Element`.

The construction path the types suggest — strings → `page.locator()` —
therefore cannot run, and nothing catches it before the test does.

**Report draft:** the repro is a browser-mode test doing
`expect.element(locator).toMatchScreenshot(name, { screenshotOptions:
{ mask: ['.foo'] } })` — compiles, throws at runtime. Suggest: accept
raw strings in `convertToSelector` (they are already the wire format
the server side consumes), or declare the pre-conversion entry type
(`Element | Locator`) in `ScreenshotMatcherArguments` and expose a
public locator factory on the page shim.

**While it is unfixed:** resolve mask selectors in the story document
and pass the elements themselves — what `.storybook/vitest.visual.ts`
does now.

Verified against the pinned 4.0.18 bundle; the current-repo index
(DeepWiki) describes the same conversion, so no bump is in sight.

## related, no report needed: --maxWorkers is a no-op for projects

`vitest --maxWorkers` never reaches project configs on our pinned
4.0.18 (upstream vitest#11051; fixed by #11102, merged 2026-08-31,
after 4.0.18): the CLI-override allowlist for projects omits it, and
browser mode reads `project.config.maxWorkers`. If the lane ever needs
worker limiting before an upgrade, the working knobs are the
`VITEST_MAX_WORKERS` environment variable (applied to every project by
`resolveConfig`) or `maxWorkers` in the project's own config. Moot
once a vitest upgrade passes #11102.
