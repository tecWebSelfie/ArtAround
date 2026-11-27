# Agents

Skills: `.agents/skills/` is the source of truth; Claude Code reads copies in
`.claude/skills/` (no symlinks on the Windows checkout), so copy a changed
skill there again (`impeccable` has its own copy). Use `payload` for Payload
CMS (start from its `SKILL.md`, then `reference/`) and `pascal-plugin-authoring` for `@pascal-app/*` plugins, node kinds and
`MapViewer`/museum-map work.
Playwright's own skills (`pnpm exec playwright init-skills --loop agents`
after a Playwright upgrade, then copy): `playwright-cli` to drive a browser
(`pnpm exec playwright cli`, the local version), `playwright-trace` to read
a failing e2e trace, `playwright-component-testing` (we test components with
Storybook instead: use it only if asked).

## Working with the maintainer

- Talk to the maintainer in Italian; code, comments, commits and docs stay in
  English.
- Commit and push freely to the session's branch. Ask first before pushing to
  any other branch, merging, or opening a PR.
- Never ask for secrets, keys or tokens in chat: they live in the
  environment's variables or in `.env.local`.
- Keep the git hooks on: no `--no-verify` or `HUSKY=0` unless asked.
- Patching a dependency (`pnpm patch`, `patches/`, `patchedDependencies`) is a
  last resort, applied only with the maintainer's consent: first look for the
  library's own API, a wrapper or a workaround in our code; if none fits,
  explain why a patch is needed and what it changes, and wait for approval.
  This covers changes to existing patches too.
- Ask before optional costly steps (`/code-review` and `/simplify`, see below;
  full translations), and
  never run the visual regression tests (`pnpm test:visual*`, ~8 min) without
  approval for that specific run: propose the command and wait.
- Build on existing worktree changes, preserving unrelated edits.

## Deploy constraints (read first)

Production imposes hard limits on every change ([Standalone
deploy](docs/standalone-deploy.md)):

- The deploy folder's disk quota is too small to build in: `pnpm build` runs
  elsewhere and only `.next/standalone` (app, assets, bundled seed/reindex
  scripts) is copied there, symlinks preserved. Watch its size when adding
  dependencies or assets.
- The Docker container can't be entered; its only entrypoint is
  `node standalone/scripts/standalone-boot.mjs` (the standalone is copied into
  the mounted `html` folder). No shell, `pnpm`, `tsx`, `payload` CLI or
  second command.
- The database is reachable only from inside that container. `next build`
  must succeed with no database (no `generateStaticParams` or build-time
  reads that connect), and any task that writes data (seed, reindex,
  migrations, imports) must be bundled into the standalone and run by the
  boot script.

## Feature guides

Read the guide for the area you touch. Improve and simplify these
implementations as needed; the guides describe the current design and evolve
with the code.

- [Tour navigation](docs/tour-navigation.md): behavior, code map, QR routes,
  avatar, directions, Spotlight and voice commands, local fixture.
- [Tour quiz](docs/tour-quiz.md), [Group tours](docs/group-tours.md)
  (LiveKit rooms), [Interactive object models](docs/interactive-object-models.md),
  [Subjects and Wikidata](docs/subjects-and-wikidata.md),
  [Permissions and editing](docs/permissions-and-editing.md),
  [Search](docs/search.md): Typesense (Cloud in deployments, the compose
  node of `pnpm services:start` locally and in CI), one collection written by
  Payload hooks through the Next server (`src/lib/search/*`; the browser
  never holds a key, an outage is shown as such); marketplace scope
  tours/contents/objects/users, navigator (home) scope tours/contents/museums
  (museum mode: tours/contents/objects of that museum); reindex command.
- [AI translation](docs/ai-translation.md): editorial content translated on
  demand; read it before any localized read, `editorial()` field or
  translator change. In short: mark translatable fields with `editorial()`
  (never slugs, identifiers, emails/URLs or plugin internals); register
  collections only in `autoTranslatePlugin` in `src/payload.config.ts`;
  never call Payload REST for localized reads (use `/api/{slug}/:id/localized`,
  `resolveLocalized()` on the server, `getLocalizedDoc()` in the browser);
  no translation logic in `afterRead` hooks; server pages queue translations
  with `requestTranslations` and render `TranslationPending`.
- [Development](docs/development.md): checks in detail, exact pins, Storybook
  MCP, Impeccable, timings.
- [Cloud preview](docs/cloud-preview.md): in a cloud session the maintainer
  tries the app over Tailscale (`cloud-preview` skill).

Reuse Pascal APIs, Mantine, Payload types/SDK and the generated Mint
SDK/schemas where they fit, and introduce other libraries or abstractions
when they make the solution simpler. Before writing state, storage, theme or layout
helpers, grep for an existing one (e.g. `src/lib/session-store.ts`,
`src/theme.ts`).

## Code conventions

- Comment every source edit so its intent is clear in the wider feature
  flow: a new nontrivial file says what it is for; important decisions and
  invariants are explained where they live. No line-by-line narration; update
  comments when behavior changes.
- Server pages and route handlers: start the reads that only need the params
  together (`Promise.all`) and chain dependent reads with `.then`; keep
  guards (permission redirects, `notFound`) before the reads they protect.
  `const { t } = await getT('ns')` stays its own statement (after starting
  the reads), or `i18next-cli extract` loses the namespace.
- A server component can't pass a function to a client one: wrap the client
  side (e.g. `AppMantineProvider`).
- Tests: use a library's own test module before faking it (`ai/test`,
  Playwright's `page.route`, MSW handlers in `src/mocks/`).
- Every bug found, by hand or by nightly QA, first becomes a regression
  spec: see it fail on the buggy code, then fix it and commit both together.
  Until the fix is merged that spec stays red on the branches without it.
- Exact pins, don't upgrade without reading why ([Development](docs/development.md#exact-pins)):
  `oxlint` 1.90.0, `@adobe/leonardo-contrast-colors` 1.0.1 (turns each
  museum's color into the primary in museum mode, DESIGN.md → The Museum
  Primary Rule),
  `@focus-reactive/payload-plugin-translator` 0.13.4.

## UI

- Responsive at every size, no pixel tuning to one screen: flex/grid, fluid
  units, container queries, `clamp()`, Mantine breakpoints and spacing.
- Mantine first (components, props, static style props,
  `hiddenFrom`/`visibleFrom`). For responsive styles and what Mantine lacks
  (container queries, grid templates, orientation/height media) use Tailwind,
  not Mantine responsive props (each injects a `<style>` tag), unless the
  Tailwind form fights Mantine's design system (`Text`'s `fz`) or is a long
  arbitrary `calc()`. Use the `from-sm`/`from-md`/`below-md`/`fit-screen`
  variants of `src/app/[lng]/(frontend)/globals.css`, not `sm:`/`md:`, and
  Mantine tokens through CSS variables (`gap-(--mantine-spacing-md)`). A
  property a Tailwind variant overrides must be set with Tailwind too
  (static style props are inline). Avoid CSS modules.
- Storybook MCP (`storybook`, needs `pnpm storybook` on port 6006; a cloud
  session starts it at boot, a PC with `pnpm storybook --ci`; if its tools
  are missing, POST JSON-RPC to `http://localhost:6006/mcp`): on UI
  components, consult it before answering or acting, and never use a
  component property you haven't seen in `get-documentation` or an
  example story; if it isn't documented, ask the maintainer. Follow
  `get-storybook-story-instructions` for stories and check with
  `run-story-tests`. Async Server Component stories spread
  `serverComponentStory(Component)` (`src/mocks/server-component.tsx`).
- Impeccable (`/impeccable <command> <target>`, one narrow target at a time)
  for every UI change, asked or not: `shape` before a new surface, then
  `critique`/`audit`, steering and finishing commands; before pushing a
  design change, `extract` then `document`. Details in
  [Development](docs/development.md#impeccable).

## Internationalization

i18next; locale files in `src/app/i18n/locales/<language>/<namespace>.json`,
source language `en`, plus the other official EU languages
(`SUPPORTED_LANGUAGES` in `i18n.config.ts`). Keys are the English text.

- While iterating, translate new or changed keys in `en` and `it` only; fill
  every other language in one pass before opening a PR
  (`npx i18next-cli status` lists what is left; keys ending in a full stop
  always show as absent there).
- After changing `t()` calls run `npx i18next-cli extract`;
  `extract --ci` must then report no changes. The extractor sees the
  namespace only where `t` comes straight from `useTranslation`/`useT`/`getT`
  (`keyPrefix` as second argument); list keys it can't see in a comment,
  `// t('navbar.Navigator', 'Navigator')`. Colons in keys are fine; avoid a
  dot followed by a letter (`e.g.`).
- Translation files are edited by hand: the maintainer declined Locize
  (2026-11), don't ask again.

## Checks and pushing

- Iterate with focused checks, and run the slow ones once at the end, not
  after each edit: `pnpm test:int --changed` or one spec file,
  one e2e spec with `-g "<test>" --trace off` against the running `next dev`
  (reuse it: a second one can't start). Full suites run in CI on the pull
  request (`tests.yml`; a new push cancels the stale run): leave them to it
  instead of running them locally, and run one locally only to reproduce a
  CI failure. Run memory-heavy checks one at a time and
  say which passed and which remain.
- `pnpm services:start` brings up MongoDB, Typesense and LiveKit (needed again after a
  cloud container restart). `pnpm seed:e2e` prepares the e2e fixture; a
  skipped spec is not a pass. `E2E_SERVER=start` after `pnpm build` runs e2e
  on the production build, as CI does; with the cloud preview on, build with
  `NEXT_PUBLIC_PAYLOAD_URL=http://localhost:3000` for e2e runs.
- Coverage (`pnpm test:coverage`, `test:coverage:all` with the stories),
  React Three Fiber specs (`@react-three/test-renderer`), the `?perf`
  frame-time overlay and the Core Web Vitals spec: [Development](docs/development.md#coverage).
- `AI_MOCK=true` swaps Groq and Fish Audio for mock models (CI, tests);
  never in a deployment.
- Don't run `oxlint`/`prettier` by hand: the pre-commit hook runs them on
  staged files; pre-push runs `pnpm typecheck`. `pnpm typecheck` and
  `pnpm dev` rewrite `src/payload-types.ts` unformatted: run
  `npx prettier --write src/payload-types.ts` before committing. Lint
  warnings never block a commit, but simplify what they flag in code you
  touch. `pnpm lint:type-aware` (CI runs it) adds the type-aware rules; `pnpm typecheck` stays the only type check. Run tools
  from `node_modules/.bin` or `pnpm exec`, not `npx` (~9 s per start).
- `/simplify` and `/code-review` cost a lot of the maintainer's usage limit:
  don't run them routinely before a push or a PR. Run them when the
  maintainer asks, and propose them (ask first) only for broad changes or
  critical areas: permissions and access control, data writes and
  migrations, seed/boot/deploy scripts. Otherwise the hooks and CI are the
  check; push often so each diff stays small.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
