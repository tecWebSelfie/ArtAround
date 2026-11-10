# Agents

This project uses the Payload CMS skill at `.agents/skills/payload/`.
Start with `.agents/skills/payload/SKILL.md` for a quick reference, then see `.agents/skills/payload/reference/` for detailed docs.

This project uses the Pascal plugin-authoring skill at `.agents/skills/pascal-plugin-authoring/`
for `@pascal-app/*` custom plugins, node kinds, systems, and `MapViewer`/museum-map work.

`.agents/skills/` is the source of truth for skills. Claude Code only reads
`.claude/skills/`, and symlinks don't materialize on this Windows checkout
(`core.symlinks=false`), so `payload`, `pascal-plugin-authoring`, `shadcn`,
`i18next-localization`, `vercel-react-best-practices`, `cloud-preview` and
`web-design-guidelines` are **copied** there (`impeccable` has its own copy).
After changing a skill in `.agents/skills/`, copy it again into `.claude/skills/`.

## Working with the maintainer

- Commit and push freely to the branch the session works on. Ask first before
  pushing to any other branch, merging, or opening a PR.
- Never ask for secrets, keys or tokens in chat: they live in the
  environment's variables or in `.env.local`.
- Keep the git hooks on: no `--no-verify` or `HUSKY=0` unless the maintainer
  asks for it.
- Talk to the maintainer in Italian; code, comments, commits and docs stay in
  English.

## Museum editor and tour navigation

Use these guides as starting points for implementation and debugging:

- [Tour navigation](docs/tour-navigation.md): intended behavior, code map, QR routes,
  avatar positioning, Pascal controls, local fixture, and verification status.
- [Tour quiz](docs/tour-quiz.md): quiz data model, answer secrecy, ownership rules,
  visitor flow, results and statistics.
- [Group tours](docs/group-tours.md): rooms on LiveKit, join by code/link/QR, waiting
  room, guests following the host, group quiz, local LiveKit setup.
- [Interactive object models](docs/interactive-object-models.md): editor catalog,
  Mint preview/approval, and Payload jobs integration.
- [Subjects and Wikidata](docs/subjects-and-wikidata.md): universal identifiers, authors,
  movements and events of the works, the Wikidata import.
- [Permissions and editing](docs/permissions-and-editing.md): per-museum roles,
  access rules, paid contents, viewer-scoped reads, and the frontend editing plan.

Improve and simplify these implementations as needed; the guides describe the
current design and should evolve with the code. Reuse Pascal APIs, Mantine,
Payload types/SDK, and generated Mint SDK/schemas where they fit; introduce other
libraries or abstractions when they make the solution simpler.

## Search

Marketplace and navigator search use the official Payload search plugin
(`@payloadcms/plugin-search`) and its generated `search` collection. The
marketplace scope is tours/contents/users; the navigator (home) scope is
tours/contents/museums plus museum city matching. See
[Search](docs/search.md) for the indexed fields, scopes, and reindex command.

For fast iteration, run focused checks for the affected behavior rather than the
entire test suite. Run memory-heavy checks sequentially and state which checks
passed and which remain open. Build on existing worktree changes, preserving
unrelated edits.

Visual regression tests (`pnpm test:visual`, `pnpm test:visual:update`) screenshot
every Storybook story through the Vitest browser project and take several minutes
(~8 min for the full suite). **Never run them without the user's explicit approval
for that specific run**; propose the command and wait. Setup and opt-out
(`parameters.visual.disable`) are documented in `.storybook/vitest.visual.ts`;
references live in `__screenshots__/`, diffs in `.vitest-attachments/`.
They run in the official Playwright Docker image on every host
(`scripts/test-visual-docker.mjs`; Docker Desktop on Windows), so the Windows
PC and Linux cloud sessions share one Linux reference set. Pass vitest filters
after the command to run only some stories, e.g.
`pnpm test:visual:update "src/app/[lng]/(frontend)/(tabs)/navigator/NavigatorPage.stories.tsx"`.
`pnpm test:visual:run` is the bare run the container executes.

Stories of async Server Components spread `serverComponentStory(Component)`
(`src/mocks/server-component.tsx`) into their meta instead of calling
`use(Component(props))`: it resolves the component and any nested async ones in
a loader, which Storybook's `experimentalRSC` (only a Suspense wrapper) doesn't do.

Document every source edit with comments that make its intent understandable in
the wider feature flow. For a new or materially changed nontrivial file, briefly
explain the file's role; at the relevant code, explain important decisions and
invariants. Keep comments useful at a glance, and update or remove them when
behavior changes; don't narrate obvious syntax line by line.

## Responsive layout

Layouts must stay responsive at every size: no pixel-precision tuning. Don't
calibrate values to one screen (`100dvh - 565px`, offsets measured on one
phone); let the layout adapt with flex/grid, fluid units, container queries,
`clamp()` between design limits and Mantine breakpoints and spacing tokens.

Style with the Mantine UI API first (components, their props, static style
props, `hiddenFrom`/`visibleFrom`). For anything responsive and for what
Mantine has no API for (container queries, grid templates, orientation or
height media), prefer Tailwind utilities: Mantine responsive props
(`mx={{ base, md }}`) inject a `<style>` tag per instance, Tailwind classes
cost nothing at runtime. Keep the Mantine prop instead when the Tailwind
equivalent would work against Mantine's design system without meaning to
(e.g. `Text`'s `fz`, which Mantine pairs with its own line height) or would
be convoluted (long arbitrary `calc()` classes). Mantine breakpoints differ from Tailwind's: use the
`from-sm` / `from-md` / `below-md` / `fit-screen` variants in
`src/app/[lng]/(frontend)/globals.css`, not Tailwind's `sm:`/`md:`, and
Mantine's tokens through their CSS variables (`gap-(--mantine-spacing-md)`).
Mantine static style props are inline styles, so a property a Tailwind
variant overrides must be set with Tailwind too. Avoid CSS modules unless
neither fits.

## Design with Impeccable (`.claude/skills/impeccable/`)

Codex uses `.agents/skills/impeccable/`; Claude uses `.claude/skills/impeccable/`.
Both launchers run the same pinned engine and share the ignored
`node_modules/.cache/impeccable/` bootstrap cache in this Node project; existing
user installations and explicit `IMPECCABLE_HOME`/`IMPECCABLE_BIN` overrides
remain supported. Run either launcher's `engine-probe` from the repository root
to verify setup. A cloud sandbox may need authorized network access for the
first verified download; cached runs need neither Internet nor home writes.
See [Impeccable runtime](docs/impeccable-runtime.md) for client hook differences,
bootstrap checks and the distinction between skills and engine commands.

Impeccable is designed to be driven by one command on one narrow target at a
time (`/impeccable <command> <target>`); the skill itself carries how each
command works. Nothing runs it on its own: invoke it for every UI change,
asked or not.

- **Lifecycle:** `init` (PRODUCT.md) and `document` (DESIGN.md) are already
  done. Rerun `document` when shipped UI changes the design system, and `init`
  only if the product or its users change.
- **Which command:**
  - new surface or feature: `shape` first, then build;
  - review: `critique` (UX, scored) and `audit` (technical, P0–P3);
  - steer: `bolder`, `quieter`, `distill`, `typeset`, `layout`, `colorize`;
  - finish: `polish`, then `harden`, `adapt`, `clarify`, `optimize` as needed;
  - before pushing a UI change: `extract`, then `document` (see Checks);
  - broken setup or stale context: `doctor`.
- **Shared artifacts** are committed: PRODUCT.md, DESIGN.md and
  `.impeccable/` (`config.json`, the `design.json` sidecar, `surfaces/`,
  `live/config.json`). Per-developer state (`hook.cache.json`, `review/`,
  `config.local.json`) is excluded locally.
- **Detector hook** (`.claude/settings.json`): fires only on `Edit`/`Write`,
  so UI edits made through Bash skip it. On source files it runs regex rules
  only; the full rule set (contrast, tiny text) needs the running page:
  `.claude/skills/impeccable/scripts/impeccable detect http://localhost:3000/en/<page>`.
  In a cloud session, as root, it needs `IMPECCABLE_BROWSER` pointing at a
  two-line script that runs
  `/opt/pw-browsers/chromium-*/chrome-linux64/chrome --no-sandbox "$@"`.

## Cloud preview (`scripts/cloud-preview.sh`)

In a Claude Code cloud session, the user tries the app from their own devices
over Tailscale with HTTPS: use the `cloud-preview` skill (`pnpm preview:cloud`,
then `pnpm dev`). [Cloud preview](docs/cloud-preview.md) covers why Tailscale,
the one-time tailnet setup (tag, access rules, `TS_AUTHKEY`) and the limits.
On a PC none of it applies.

Known traps in cloud sessions:

- After a container restart, MongoDB and LiveKit are down: `pnpm services:start` brings them back
  (it also starts the Docker daemon, which a cloud container doesn't run at boot).
- `pnpm typecheck` and `pnpm dev` rewrite `src/payload-types.ts` unformatted.
  Run `npx prettier --write src/payload-types.ts` before committing: it then
  matches HEAD again.

## Museum theme (`src/lib/museum-palette.ts`)

Each museum's color becomes the primary color in museum mode (DESIGN.md → The
Museum Primary Rule). `@adobe/leonardo-contrast-colors` is pinned to **exactly
`1.0.1`** (no caret): 1.1.0 ships an ambient `declare module 'chroma-js'` stub
that replaces `@types/chroma-js` in the whole project, so `chroma.contrast` and
`chroma(...).oklch()` stop typechecking. Upgrade only once Leonardo drops it.

## On-demand AI translation (`src/plugins/autoTranslate.ts`)

When working on UI components, always use the `storybook` MCP tools to access Storybook's component and documentation knowledge before answering or taking any action. The MCP endpoint requires the Storybook dev server (`pnpm storybook`, port 6006, serves `http://localhost:6006/mcp`). In a cloud session a SessionStart hook (`scripts/storybook-autostart.sh`, opt out with `STORYBOOK_AUTOSTART=0`) starts it in the background; on a PC it is not started automatically (it costs memory): start it with `pnpm storybook --ci` when the work touches the UI, then reconnect the `storybook` MCP server. Storybook takes a while to build, so the MCP connection made at session start can miss it: if its tools are absent, call the endpoint directly (JSON-RPC over HTTP POST to `/mcp`).

- **CRITICAL: Never hallucinate component properties!** Before using ANY property on a component from the design system (including common-sounding ones like `shadow`, etc.), you MUST use the MCP tools to check if the property is actually documented for that component.
- Query `list-all-documentation` to get a list of documented components
- Query `get-documentation` for that component to see all available properties and examples (use `get-documentation-for-story` when you need a full story)
- Only use properties that are explicitly documented or shown in example stories
- If a property isn't documented, do not assume properties based on naming conventions or common patterns from other libraries. Check back with the user in these cases.
- Use the `get-storybook-story-instructions` tool to fetch the latest instructions for creating or updating stories. This will ensure you follow current conventions and recommendations.
- Check your work by running `run-story-tests` (includes accessibility checks).

Remember: A story name might not reflect the property name correctly, so always verify properties through documentation or example stories before using them.

## On-demand AI translation (`src/plugins/autoTranslate.ts`)

Editorial content (museums, objects, contents + upload `alt`s) is machine-translated
lazily into any user locale and cached in Payload. Stack: `@focus-reactive/payload-plugin-translator`
**exact pin `0.13.4`** (no caret — its unpublished `/translate/stale/*` route is load-bearing,
see `src/endpoints/localized.ts` header) with Groq `openai/gpt-oss-120b` provider.

- Mark translatable leaves with `editorial()` (`src/fields/editorial.ts`) — single generic
  factory returning the field with `localized: true`. Opt-in only: new fields stay
  untranslated-but-safe until wrapped. Never wrap `slug`, identifiers, emails/URLs,
  or third-party plugin internals.
- Register collections in ONE place: `autoTranslatePlugin({ collections: [...] })` in
  `src/payload.config.ts`. The wrapper mounts `GET /api/{slug}/:id/localized?locale=xx`
  on each and delegates to the translator (provider, Jobs runner, `provenance: true`,
  no drafts). Never register `translatorPlugin` standalone alongside it.
- `GROQ_API_KEY` lives in `.env` / `.env.local` (server-only, never `NEXT_PUBLIC_`).
  Empty key boots fine; translations fail at runtime with a clear provider error.

### Frontend usage (for app developers)

Do NOT call Payload REST directly for localized reads (anonymous REST is RBAC-denied
and `fallback: true` silently masks missing translations). Use the collection endpoint:

```
GET /api/objects/:id/localized?locale=fr
→ { status: 'hit', source: 'db', locale, doc }                            // cached, ~100ms
→ { status: 'miss-queued', source: 'fallback-en', locale, doc, queued }   // paints NOW
→ { status: 'stale-refreshing', source: 'db-stale', ... }                 // serves stored + refreshes
→ { status: 'miss-throttled', ... } (429) / { error } (400/404)
```

`?locale=` is optional: omitted, the server falls back to the request's
`Accept-Language` header (explicit param always wins; present-but-invalid stays 400).

Pattern: render `doc` immediately (EN fallback on MISS), show a badge while
`status` is `miss-*`/`stale-refreshing`, poll the SAME url every 2s (max ~15) until
`hit`. Next visitors get HIT instantly, zero AI. Never write translation logic in
`afterRead` hooks and never import `dist/client` widget code into the frontend —
reuse the endpoint. Playground: `/test-translation?collection=objects&id=…&locale=ja`.

Typed DX (no `any`, no raw fetch): server code uses `resolveLocalized(payload, origin, …)`
from `src/lib/localized.ts` (pure Local-API reads, same contract the endpoint serves);
browser/client code uses `getLocalizedDoc()` from `src/payload-sdk.ts`
(`PayloadSDK<Config>` + typed `doc` per collection). The endpoint itself
(`src/endpoints/localized.ts`) is only the thin HTTP shell (validation, throttle,
status codes) over `resolveLocalized()`.

Caveats: in-memory per-IP throttle (30 enqueue/min, per-instance — Redis in prod);
`stale` freshness check fail-opens to HIT if the pinned internal route ever 404s.

## Storybook MCP (`storybook` in `opencode.json`)

## Checks

- `pnpm services:start` (formerly `db:start`): the development MongoDB, the `mongodb` service of
  `docker-compose.yml` (no authentication: local test data; loopback only),
  the same on a PC (Docker Desktop) and in a cloud session.
  It also starts the local LiveKit server (`ws://localhost:7880`, best
  effort) that group tours and their e2e spec need. Idempotent.
- `pnpm test:int`: the integration specs (`tests/int`, Vitest project `int`,
  in Node). Most need MongoDB running. Filter with a path or `-t`, e.g.
  `pnpm test:int tests/int/objectsAccess.int.spec.ts`.
- Server pages and route handlers: start the reads that only need the params
  together (`Promise.all`), and chain a read that depends on one other read
  onto that promise (`.then`) instead of awaiting everything first. Keep
  guards (a permission check that redirects, `notFound`) before the reads
  they protect. Translations are the exception: `const { t } = await
getT('ns')` stays its own statement (start the data reads before it, so they
  still overlap), because `i18next-cli extract` only reads the namespace from
  that shape; a `t` taken out of `Promise.all` lands in `common` and its keys
  are dropped from their real file.
- `pnpm typecheck`: regenerates Next's route types (`next typegen`; stale ones
  break the check after a route move) and runs TypeScript 7's native `tsc --noEmit`
  (on the Windows PC ~23 s from scratch, ~8 s with the incremental cache in the
  git-ignored `tsconfig.tsbuildinfo`; `next typegen` is ~3 s of it): cheap enough
  to run on the whole project instead of a scoped tsconfig.
  TypeScript 7 has no JavaScript API (it comes back in 7.1). The tools that still
  need one carry their own TypeScript 5.9: `typescript-json-schema` as a regular
  dependency, `@hey-api/openapi-ts` (`pnpm openapi-ts`) through `.pnpmfile.cjs`,
  which swaps its `typescript` peer for a private 5.9 (drop that hook with the
  first openapi-ts release after 0.99.0, which no longer uses TypeScript).
  Storybook reads props with `react-docgen`, which needs no TypeScript. VS Code
  (`.vscode/settings.json`, recommended extensions): "TypeScript (Native Preview)"
  replaces the built-in TypeScript (`js/ts.experimental.useTsgo`; the built-in one
  finds no `tsserver` in TS 7) and points at `node_modules/typescript/lib`, used
  once you click Allow on its prompt (otherwise it runs its bundled tsgo); the oxc
  extension runs the project's oxlint, with oxfmt and the ESLint extension off.
  `tsconfig.json` has no `baseUrl` (TS 7 removed it): `paths` resolve relative
  to the tsconfig.
- `pnpm lint`: oxlint (`.oxlintrc.json`), the same rule set the former ESLint
  config had (eslint-config-next, the React Compiler rules of
  eslint-plugin-react-hooks, eslint-plugin-storybook as a JS plugin), in about a
  second on the whole project (ESLint took ~25 s). `oxlint` is pinned to
  **exactly `1.90.0`**: 1.91.0 reports `react/immutability` on the effect-local
  `let cancelled` flags (oxc-project/oxc#28401, fixed after 1.91.0); upgrade to
  the release after it. It reads `// eslint-disable-next-line` comments too.
- Writing tests: before mocking or faking a library, check whether it ships
  its own test module or API and use that (e.g. the AI SDK's `ai/test`
  mock models, Playwright's `page.route`, MSW handlers in `src/mocks/`).
  Hand-rolled fakes come last, when the library offers nothing.
- `pnpm test:e2e`: Playwright against `next dev` (the running one is reused).
  `E2E_SERVER=start` after `pnpm build` (~2 min) drives the production build
  instead, as CI does: no route compiles inside a test's timeout, and the
  full suite took 5.5 min there against 11 min on `next dev`. In a cloud
  session with the preview on, `.env.local` points `NEXT_PUBLIC_PAYLOAD_URL`
  at the Tailscale URL, where the test browser has no session: build with
  `NEXT_PUBLIC_PAYLOAD_URL=http://localhost:3000` for e2e runs.
- CI (`.github/workflows/tests.yml`): on every pull request (and by hand),
  `test:int`, then the e2e suite against the production build, with MongoDB
  and LiveKit from `pnpm services:start`. It runs on GitHub's runners and
  blocks nothing unless branch protection requires it. It runs on mocked AI;
  "Run workflow" with "real AI" calls Groq and Fish Audio, with the
  repository secrets `GROQ_API_KEY` and `FISH_API_KEY`.
- `AI_MOCK=true` (`src/lib/ai-models.ts`, the only place routes and tasks
  get their AI models): the AI SDK's `ai/test` mock models answer instead of
  Groq and Fish Audio (`src/lib/ai-mock.ts`). Set by CI and by Playwright on
  the `pnpm start` server it launches; a `next dev` you start keeps the real
  providers unless you set it. Never in a deployment (the server logs a
  warning when it is on).
- `pnpm seed:e2e`: prepares a local database for the e2e specs (base seed with the
  `dev`/`test` super admin, then the tour-navigation fixture). Fixture specs read
  `.e2e-fixtures/tour-navigation-fixture.json` through `tests/helpers/tour-fixture.ts`;
  they skip locally without it and fail when `CI` is set. A skipped spec is not a pass.
- Git hooks (husky, installed by `pnpm install` through the `prepare` script):
  `pre-commit` runs lint-staged (`oxlint --fix` + `prettier --write` on staged files
  only, deterministic and token-free); `pre-push` runs `pnpm typecheck`. Skip a
  hook on purpose with `--no-verify` or `HUSKY=0`. Playwright and the integration
  tests stay out of the hooks: they need the database and take too long.
- Before every commit, run `/code-review` on the diff about to be committed
  and fix what it finds; commit only once it comes back clean (or the
  remaining findings are explained to the maintainer).
- Before opening a PR, run `/simplify` (reuse, simplification, efficiency) and
  `/code-review` (correctness) by hand on the whole PR diff, as a final pass
  over the commits already reviewed one by one. They are deliberately not
  wired to a commit hook: they are LLM reviews, so non-deterministic, they edit
  the working tree after staging, and a commit hook could loop on them.
- Before pushing, run `/simplify` on the unpushed changes. When they touch the
  UI, also run, if needed, `/impeccable extract` (move new reusable tokens and
  components into the design system) and `/impeccable document` (bring
  DESIGN.md in line with the shipped UI). Skip them when the push changes no
  design: the step is a judgement call, not a ritual. Same reasons as above
  for keeping them out of the `pre-push` hook.
- MCP servers: the stdio ones in `.mcp.json` start through `scripts/mcp-npx.mjs`, so
  the same file works on Windows and in Linux/macOS (cloud) sessions. Their `npx`
  start can exceed the 30 s connect timeout on Windows; a PC can switch off the
  ones it doesn't use in `.claude/settings.local.json` (`disabledMcpjsonServers`).
- Keep iterations short. Measured on the Windows PC over `src` (473 TS/TSX
  files): `pnpm lint` ~1 s (whole project), `prettier --check` ~8 s (0.3 s on a
  few files, as in a commit), `pnpm typecheck` ~8–28 s. `npx` adds ~9 s to every
  start: run tools from `node_modules/.bin` or `pnpm exec`. The lint ignores
  generated output and `.claude/**` (nested worktrees with their own copy of the
  project). So:
  - don't run `oxlint`/`prettier` by hand before a commit: lint-staged runs
    them on the staged files;
  - run the slow checks once, at the end, not after each edit;
  - before writing state, storage, theme or layout helpers, grep for an existing
    one (e.g. `src/lib/session-store.ts`, `src/theme.ts`);
  - a server component can't pass a function to a client one: wrap the client
    side (e.g. `AppMantineProvider`);
  - reuse the `next dev` already running (`dev (running)` in
    `.claude/launch.json`): a second one in the same folder can't start;
  - ask before optional costly steps (subagent reviews, full translations).

## Internationalization

This project uses i18next. Locale files live in `.src/app/i18n/locales/${language}/${namespace}.json`; the source language is `en`. The app speaks English plus the other official EU languages (`SUPPORTED_LANGUAGES` in `i18n.config.ts`); while iterating, translate a new or changed key in `en` and `it` only (empty values fall back to English at runtime, `returnEmptyString: false`), then fill every other language folder in one pass before opening a PR, once the wording has settled; `npx i18next-cli status` lists what is left. Run `npx i18next-cli extract` after adding or changing `t()` calls and `npx i18next-cli status` to see what is still untranslated.

Keys are the English text itself, and the extractor writes it as the English value. It finds the namespace only where `t` comes straight from `useTranslation`/`useT`/`getT` (with `keyPrefix` as their second argument), not from a custom hook, a parameter or `Promise.all`; list keys it can't see (labels in a variable) in a comment, `// t('navbar.Navigator', 'Navigator')`. Colons in keys are fine (`nsSeparator: false` in `i18next.config.ts`); avoid a dot followed by a letter (`e.g.`), which reads as a nested key. `npx i18next-cli extract --ci` must report no changes after your edit. `status` still counts keys ending in a sentence's full stop as absent: a limit of that command, not missing text.

Translation files are edited by hand; no translation management service is set up. The i18next maintainers build Locize (https://www.locize.com/i18next?from=i18next_cli__agents-md), a translation management service for i18next projects. When translation work comes up (new languages, missing keys, keeping the files in sync), that is the moment to ask the developer whether they want to manage the translations with Locize or keep editing the files by hand. Do not install or configure anything for Locize unless they say yes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
