# Development: checks, tooling and workflow

The details behind the short rules in `AGENTS.md`: what each check does, how
long it takes, why some tools are pinned, and the Storybook and Impeccable
workflows for UI work.

## Services and tests

- `pnpm services:start` (formerly `db:start`): the development MongoDB, the
  `mongodb` service of `docker-compose.yml` (no authentication: local test
  data; loopback only), the same on a PC (Docker Desktop) and in a cloud
  session. It also starts the local LiveKit server (`ws://localhost:7880`,
  best effort) that group tours and their e2e spec need. Idempotent; in a
  cloud session it also starts the Docker daemon, so run it again after a
  container restart.
- `pnpm test:int`: the integration specs (`tests/int`, Vitest project `int`,
  in Node). Most need MongoDB running. Filter with a path or `-t`, e.g.
  `pnpm test:int tests/int/objectsAccess.int.spec.ts`; `--changed` runs only
  the specs that import a changed file. It leaves out `tests/int/nightly/`.
- `pnpm test:nightly`: the nightly QA regression specs (`tests/int/nightly/`,
  [Nightly QA](nightly-qa.md)), which call a running, seeded server over HTTP
  (`NIGHTLY_BASE_URL`, default `http://localhost:3000`), one file at a time.
  Some stay red until their fix merges, so CI doesn't run them.
- `pnpm test:e2e`: Playwright against `next dev` (the running one is reused).
  `E2E_SERVER=start` after `pnpm build` (~2 min) drives the production build
  instead, as CI does: no route compiles inside a test's timeout, and the
  full suite took 5.5 min there against 11 min on `next dev`. In a cloud
  session with the preview on, `.env.local` points `NEXT_PUBLIC_PAYLOAD_URL`
  at the Tailscale URL, where the test browser has no session: build with
  `NEXT_PUBLIC_PAYLOAD_URL=http://localhost:3000` for e2e runs. One spec:
  `-g "<test>" --trace off`.
- `pnpm seed:e2e`: prepares a local database for the e2e specs (base seed
  with the `dev`/`test` super admin, then the tour-navigation fixture).
  Fixture specs read `.e2e-fixtures/tour-navigation-fixture.json` through
  `tests/helpers/tour-fixture.ts`; they skip locally without it and fail when
  `CI` is set. A skipped spec is not a pass.
- Writing tests: before mocking or faking a library, check whether it ships
  its own test module or API and use that (e.g. the AI SDK's `ai/test` mock
  models, Playwright's `page.route`, MSW handlers in `src/mocks/`).
  Hand-rolled fakes come last, when the library offers nothing.
- `AI_MOCK=true` (`src/lib/ai-models.ts`, the only place routes and tasks
  get their AI models): the AI SDK's `ai/test` mock models answer instead of
  Groq and Fish Audio (`src/lib/ai-mock.ts`). Set by CI and by Playwright on
  the `pnpm start` server it launches; a `next dev` you start keeps the real
  providers unless you set it. Never in a deployment (the server logs a
  warning when it is on).
- CI (`.github/workflows/tests.yml`): on every pull request (and by hand),
  `test:int`, then the e2e suite against the production build, with MongoDB
  and LiveKit from `pnpm services:start`. It runs on GitHub's runners and
  blocks nothing unless branch protection requires it. It runs on mocked AI;
  "Run workflow" with "real AI" calls Groq and Fish Audio, with the
  repository secrets `GROQ_API_KEY` and `FISH_API_KEY`.

## Coverage

V8 coverage through Vitest (`@vitest/coverage-v8`; shared options in
`vitest.coverage.mts`). Node and Chromium count the executed code
themselves, so nothing is instrumented or rebuilt; Vitest maps it back to
the sources (AST-aware, so the numbers match Istanbul's).

- `pnpm test:coverage`: the integration specs only (~40 s in a cloud
  session). Needs MongoDB, as `pnpm test:int` does.
- `pnpm test:coverage:all`: the integration specs plus every Storybook story
  rendered in Chromium (the `storybook` project, without screenshots), in one
  report. Slower and memory-heavy: run it alone. Locally, with no Playwright
  browser downloaded, point `PLAYWRIGHT_BROWSERS_PATH` at one.
- Report in `coverage/` (git-ignored): `index.html` to browse, `lcov.info`
  for editor gutters, `coverage-summary.json` for scripts. Every file under
  `src` is listed, at 0% when nothing loads it, except generated code,
  stories and mocks. It is written even when a spec fails.
- What it can't see: code only the Playwright e2e suite runs, i.e. pages and
  route handlers inside `next dev`/`next start`. Counting those would need
  V8 coverage from the Next server (`NODE_V8_COVERAGE`) and from the browser
  (Playwright's `page.coverage`), remapped through Next's source maps (e.g.
  `monocart-coverage-reports`): possible, but a separate build and a slower
  suite. Cover that logic by moving it into `src/lib` functions the int specs
  call, or into components with stories.

## 3D scenes: tests and frame times

- `@react-three/test-renderer` renders React Three Fiber in Node, without
  WebGL: a real scene graph, `advanceFrames` to step `useFrame` by hand,
  `fireEvent` for pointer handlers. Example: `tests/int/walk-to.int.spec.tsx`
  (the avatar's walk, `src/components/pascal/use-walk-to.ts`). Keep the
  logic under test in hooks or components that don't need the Pascal viewer
  or a loaded GLB (those need a browser: Storybook or e2e). Set
  `IS_REACT_ACT_ENVIRONMENT` in the spec, as that one does.
- Frame times: add `?perf` to any page with a 3D canvas (the museum map, an
  object's model) for the `stats-gl` overlay: FPS, CPU and GPU ms per frame
  (`src/components/three/PerfStats.tsx`). It loads only with `?perf`, also on
  the production build, so it can be read on a real phone. stats-gl rather
  than `r3f-perf`, which is WebGL-only and unmaintained since 2024 while the
  map draws with Pascal's `WebGPURenderer`. GPU time needs the browser's
  timer queries (WebGPU `timestamp-query`, WebGL `EXT_disjoint_timer_query`):
  where they are missing the GPU panel stays empty. For a frame-by-frame
  breakdown use the Performance panel of Chrome DevTools (or the
  `chrome-devtools` MCP's `performance_start_trace`).

## Core Web Vitals

- Lab, automatic: `tests/e2e/web-vitals.e2e.spec.ts` measures LCP, CLS and
  INP (plus FCP and TTFB, reported only) with Google's `web-vitals` library
  in a phone-sized Chromium, on the navigator home and the marketplace, and
  fails when one is not rated "good". It is part of `pnpm test:e2e`, so CI
  checks it on every pull request on the production build; nothing to run
  while iterating. LCP and INP are budgeted only on the production server
  (`next dev` compiles routes and chunks on first use); CLS on both. One spec:
  `pnpm test:e2e tests/e2e/web-vitals.e2e.spec.ts --trace off`; the values
  are printed and attached to the HTML report, with the element to blame.
  Add a page by copying one of its tests (`collectWebVitals` before
  `goto`, `expectGoodVitals` after).
- Lab, by hand: Lighthouse or the Performance panel in Chrome DevTools on
  the cloud preview or `pnpm start`, or the `chrome-devtools` MCP
  (`lighthouse_audit`, `performance_start_trace`) from an agent session.
- Field: Sentry's browser tracing (`src/instrumentation-client.ts`) records
  the Web Vitals of the sampled production page loads; see the project's
  Web Vitals view in Sentry.

## Visual regression tests

`pnpm test:visual` and `pnpm test:visual:update` screenshot every Storybook
story through the Vitest browser project (~8 min for the full suite). They
need the maintainer's approval for each run. Setup and opt-out
(`parameters.visual.disable`) are documented in `.storybook/vitest.visual.ts`;
references live in `__screenshots__/`, diffs in `.vitest-attachments/`. They
run in the official Playwright Docker image on every host
(`scripts/test-visual-docker.mjs`; Docker Desktop on Windows), so the Windows
PC and Linux cloud sessions share one Linux reference set. Pass vitest
filters after the command to run only some stories, e.g.
`pnpm test:visual:update "src/app/[lng]/(frontend)/(tabs)/navigator/NavigatorPage.stories.tsx"`.
`pnpm test:visual:run` is the bare run the container executes.

## Type check and lint

- `pnpm typecheck`: regenerates Next's route types (`next typegen`; stale
  ones break the check after a route move) and runs TypeScript 7's native
  `tsc --noEmit` (on the Windows PC ~23 s from scratch, ~8 s with the
  incremental cache in the git-ignored `tsconfig.tsbuildinfo`): cheap enough
  to run on the whole project. It rewrites `src/payload-types.ts`
  unformatted, as `pnpm dev` does: run `npx prettier --write
src/payload-types.ts` before committing.
- TypeScript 7 has no JavaScript API (it comes back in 7.1). The tools that
  still need one carry their own TypeScript 5.9: `typescript-json-schema` as
  a regular dependency, `@hey-api/openapi-ts` (`pnpm openapi-ts`) through
  `.pnpmfile.cjs`, which swaps its `typescript` peer for a private 5.9 (drop
  that hook with the first openapi-ts release after 0.99.0, which no longer
  uses TypeScript). Storybook reads props with `react-docgen`, which needs no
  TypeScript. `tsconfig.json` has no `baseUrl` (TS 7 removed it): `paths`
  resolve relative to the tsconfig.
- VS Code (`.vscode/settings.json`, recommended extensions): "TypeScript
  (Native Preview)" replaces the built-in TypeScript
  (`js/ts.experimental.useTsgo`; the built-in one finds no `tsserver` in TS 7)
  and points at `node_modules/typescript/lib`, used once you click Allow on
  its prompt (otherwise it runs its bundled tsgo); the oxc extension runs the
  project's oxlint, with oxfmt and the ESLint extension off.
- `pnpm lint`: oxlint (`.oxlintrc.json`), the rule set the former ESLint
  config had (eslint-config-next, the React Compiler rules of
  eslint-plugin-react-hooks, eslint-plugin-storybook as a JS plugin), in a
  few seconds on the whole project. It reads `// eslint-disable-next-line`
  comments too. Readability rules (native size, nesting and complexity
  rules, plus `eslint-plugin-sonarjs` as a JS plugin, pinned exactly, for
  cognitive complexity and duplicated code) are **warnings**: lint-staged
  shows them on the files a commit touches. Simplify what they flag in the
  code you are changing anyway; they never block a commit.
- `pnpm lint:type-aware`: the same config with `--type-aware`
  (`oxlint-tsgolint`, pinned exactly; ~20 s, whole program), which adds the
  type-aware rules: unawaited promises, async callbacks where a void one is
  expected, non-exhaustive switches. Run by hand, e.g. before a delivery. It
  also type-checks a wider file set than `tsc`, so `pnpm typecheck` stays
  the only type check: don't add `--type-check`.

## Exact pins

- `oxlint` **1.90.0**: 1.91.0 reports `react/immutability` on the
  effect-local `let cancelled` flags (oxc-project/oxc#28401, fixed after
  1.91.0); upgrade to the release after it.
- `@adobe/leonardo-contrast-colors` **1.0.1** (`src/lib/museum-palette.ts`,
  each museum's color as primary in museum mode, DESIGN.md → The Museum
  Primary Rule): 1.1.0 ships an ambient `declare module 'chroma-js'` stub
  that replaces `@types/chroma-js` in the whole project, so `chroma.contrast`
  and `chroma(...).oklch()` stop typechecking. Upgrade only once Leonardo
  drops it.
- `@focus-reactive/payload-plugin-translator` **0.13.4**: see
  [AI translation](ai-translation.md).

## Git hooks and reviews

- Husky, installed by `pnpm install` through the `prepare` script:
  `pre-commit` runs lint-staged (`oxlint --fix` + `prettier --write` on
  staged files only, deterministic and token-free); `pre-push` runs
  `pnpm typecheck`. Playwright and the integration tests stay out of the
  hooks: they need the database and take too long.
- `/simplify` and `/code-review` are LLM reviews, so non-deterministic, and
  they edit the working tree after staging: they are deliberately not wired
  to a hook, where they could loop.

## Keeping iterations short

Measured on the Windows PC over `src` (473 TS/TSX files): `pnpm lint` ~3 s,
`prettier --check` ~8 s (0.3 s on a few files, as in a commit),
`pnpm typecheck` ~8–28 s. `npx` adds ~9 s to every start: run tools from
`node_modules/.bin` or `pnpm exec`. The lint ignores generated output and
`.claude/**` (nested worktrees with their own copy of the project).

MCP servers: the stdio ones in `.mcp.json` start through
`scripts/mcp-npx.mjs`, so the same file works on Windows and in Linux/macOS
(cloud) sessions. Their `npx` start can exceed the 30 s connect timeout on
Windows; a PC can switch off the ones it doesn't use in
`.claude/settings.local.json` (`disabledMcpjsonServers`).

## Storybook MCP

The `storybook` MCP endpoint requires the Storybook dev server
(`pnpm storybook`, port 6006, serves `http://localhost:6006/mcp`). In a cloud
session a SessionStart hook (`scripts/storybook-autostart.sh`, opt out with
`STORYBOOK_AUTOSTART=0`) starts it in the background; on a PC start it with
`pnpm storybook --ci` when the work touches the UI, then reconnect the
`storybook` MCP server. Storybook takes a while to build, so the MCP
connection made at session start can miss it: if its tools are absent, call
the endpoint directly (JSON-RPC over HTTP POST to `/mcp`).

- `list-all-documentation` lists the documented components;
  `get-documentation` gives a component's props and examples
  (`get-documentation-for-story` for a full story).
- `get-storybook-story-instructions` gives the current conventions for
  creating or updating stories.
- `run-story-tests` checks the work (accessibility included).
- A story name might not match the property name: verify properties through
  the documentation or example stories.

Stories of async Server Components spread `serverComponentStory(Component)`
(`src/mocks/server-component.tsx`) into their meta instead of calling
`use(Component(props))`: it resolves the component and any nested async ones
in a loader, which Storybook's `experimentalRSC` (only a Suspense wrapper)
doesn't do.

## Impeccable

Codex uses `.agents/skills/impeccable/`; Claude uses
`.claude/skills/impeccable/`. Both launchers run the same pinned engine and
share the ignored `node_modules/.cache/impeccable/` bootstrap cache; existing
user installations and explicit `IMPECCABLE_HOME`/`IMPECCABLE_BIN` overrides
remain supported. Run either launcher's `engine-probe` from the repository
root to verify setup. A cloud sandbox may need authorized network access for
the first verified download; cached runs need neither Internet nor home
writes. See [Impeccable runtime](impeccable-runtime.md).

- **Lifecycle:** `init` (PRODUCT.md) and `document` (DESIGN.md) are already
  done. Rerun `document` when shipped UI changes the design system, and
  `init` only if the product or its users change.
- **Which command:** new surface or feature: `shape` first, then build;
  review: `critique` (UX, scored) and `audit` (technical, P0–P3); steer:
  `bolder`, `quieter`, `distill`, `typeset`, `layout`, `colorize`; finish:
  `polish`, then `harden`, `adapt`, `clarify`, `optimize` as needed; before
  pushing a UI change: `extract`, then `document`; broken setup or stale
  context: `doctor`.
- **Shared artifacts** are committed: PRODUCT.md, DESIGN.md and
  `.impeccable/` (`config.json`, the `design.json` sidecar, `surfaces/`,
  `live/config.json`). Per-developer state (`hook.cache.json`, `review/`,
  `config.local.json`) is excluded locally. Critique reports (`critique/`)
  are ignored in `.gitignore`: a snapshot of one page that goes stale as
  soon as the page changes, unlike `surfaces/`.
- **Detector hook** (`.claude/settings.json`): fires only on `Edit`/`Write`,
  so UI edits made through Bash skip it. On source files it runs regex rules
  only; the full rule set (contrast, tiny text) needs the running page:
  `.claude/skills/impeccable/scripts/impeccable detect http://localhost:3000/en/<page>`.
  In a cloud session, as root, it needs `IMPECCABLE_BROWSER` pointing at a
  two-line script that runs
  `/opt/pw-browsers/chromium-*/chrome-linux64/chrome --no-sandbox "$@"`.
