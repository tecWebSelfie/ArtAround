# Which tests run in CI vs on the developer machine (modern web app, late 2026)

Context assumed: Next.js 16 + Payload CMS; Vitest integration specs (MongoDB) + Storybook browser tests via `@storybook/addon-vitest`; visual regression (~8 min, Docker); Playwright e2e (13-30 min on CI, MongoDB + LiveKit + seeded DB, WebGL 3D map); husky pre-commit (oxlint + prettier on staged) and pre-push (typecheck); GitHub Actions ubuntu runners without GPU; nightly adversarial QA job.

## Q1. What do Playwright, Vitest, Storybook and Next.js docs recommend for CI vs local?

### Takeaway

The tool docs converge on: locally, reuse a running dev server and run only what changed (`vitest` watch / `--changed` / `related`, `playwright --only-changed` / `--last-failed`); in CI, start a fresh server (ideally the production build, per Next.js), run headless on Linux, use `--forbid-only`, a global timeout, traces only on retry, sharding for wall-clock, and blob reports merged afterwards. Playwright's docs recommend `workers: 1` in CI for stability (parallelism via sharding instead), and visual baselines must be produced in the same environment where they are compared.

### Cited Findings

**Playwright**

- CI guide: "We recommend setting workers to "1" in CI environments to prioritize stability and reproducibility" (`workers: process.env.CI ? 1 : undefined`); parallel workers are optional on "a powerful self-hosted CI system"; "For wider parallelization, consider sharding - distributing tests across multiple CI jobs." — [Playwright CI](https://playwright.dev/docs/ci)
- CI guide: "Always set a global timeout in CI"; install with `npx playwright install --with-deps`; "Caching browser binaries is not recommended" (restore takes about as long as download); upload the HTML report as an artifact (examples use `retention-days: 30`); headless by default, headed on Linux needs Xvfb (`xvfb-run`). — [Playwright CI](https://playwright.dev/docs/ci)
- Best practices: run tests on CI on each commit/PR; use Linux on CI (cheaper); shard with `--shard=1/3`; install only needed browsers (`npx playwright install chromium --with-deps`); lint with `@typescript-eslint/no-floating-promises` and run `tsc --noEmit` on CI; traces recorded "on the first retry" on CI, not `on` for every test because it is "very performance-heavy"; locally use `--trace on` + `show-report`. — [Playwright best practices](https://playwright.dev/docs/best-practices)
- webServer: `reuseExistingServer` "should be commonly set to `!process.env.CI` to allow the local dev server when running tests locally"; `timeout` default 60000 ms, can be raised because "Webservers can sometimes take longer to boot up" (example 120 s). — [Playwright webServer](https://playwright.dev/docs/test-webserver)
- CLI flags: `--only-changed [ref]` "Only run test files that have been changed between 'HEAD' and 'ref'. Defaults to running all uncommitted changes"; `--last-failed` "Only re-run the failures"; `--fail-on-flaky-tests` "Fail if any test is flagged as flaky (default: false)"; `--repeat-each <N>`; `--forbid-only` "Fail if `test.only` is called ... Useful on CI." — [Playwright CLI](https://playwright.dev/docs/test-cli)
- Docker: `--init` recommended (PID 1), `--ipc=host` recommended with Chromium (otherwise can run out of memory and crash); "always pin your Docker image to a specific version"; a mismatched image version means Playwright "will be unable to locate browser executables" (example tags like `v1.64.1-noble`). — [Playwright Docker](https://playwright.dev/docs/docker)
- Snapshots: rendering varies with "the host OS, version, settings, hardware" (also power source, headless mode); baseline names include browser+platform (e.g. `chromium-darwin`); "run tests in the same environment where the baseline screenshots were generated"; refresh with `--update-snapshots`. — [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)

**Next.js**

- "We recommend running your tests against your production code to more closely resemble how your application will behave. Run `npm run build` and `npm run start`, then run `npx playwright test`"; the dev server via `webServer` is offered as an alternative. In CI Playwright runs headless; `npx playwright install-deps`. Also new for Next 16/Cache Components: `@next/playwright`'s `instant()` helper, and hidden preserved routes remain in the DOM so tests need visibility-aware locators. — [Next.js Playwright guide (updated 2026-11-18)](https://nextjs.org/docs/app/guides/testing/playwright)

**Vitest**

- `vitest` "Will enter the watch mode in development environment and run mode in CI (or non-interactive terminal) automatically." `--changed` "Run tests that are affected by the changed files" (optional `since`); `vitest related <files>` runs "only tests that cover a list of source files" (follows static imports, not dynamic ones — relevant to lint-staged/pre-push use); `--shard <index>/<count>` (not with watch); `--merge-reports` merges blob reports from `.vitest/blob/`; `--bail` default 0; `--project` repeatable with wildcards and `!pattern`; `--silent passed-only` shows logs only from failing tests. — [Vitest CLI](https://vitest.dev/guide/cli)
- Coverage is off by default (`coverage.enabled: false`, enable per run with `--coverage`); `coverage.reportOnFailure` default false; V8 is the default/recommended provider (faster, less memory, accuracy matching Istanbul since v3.2.0); uncovered files appear only with `coverage.include`. In AI coding agent environments Vitest auto-sets `skipFull: true` on the `text` reporter and adds `text-summary`. — [Vitest coverage guide](https://vitest.dev/guide/coverage)
- Coverage config: `coverage.changed` "Collect coverage only for files changed since a specified commit or branch" (inherits `test.changed`); `thresholds.autoUpdate` raises stored thresholds when coverage improves (a built-in ratchet; can pass a rounding function); `thresholds.perFile`; per-glob thresholds (do not inherit global ones); `thresholds.100` shortcut. — [Vitest coverage config](https://vitest.dev/config/coverage)

**Storybook (addon-vitest)**

- CI: add a script like `"test-storybook": "vitest --project=storybook"` — the same command as locally — and run it in a workflow; "For the fastest experience, you should use a machine image that has Playwright already installed" (most examples use the Playwright Docker image, kept current); `--coverage` can be added; publish Storybook and pass `SB_URL` as the `storybookUrl` plugin option so failures link to the published story (GitHub example triggers on `deployment_status`); other tests run with separate `--project` filters or one combined `vitest` command. — [Storybook: testing in CI](https://storybook.js.org/docs/writing-tests/in-ci)

### Inferences

- For this repo: locally keep `reuseExistingServer: !CI` against `next dev` and use `--only-changed`/`-g`/`--last-failed`; in PR CI run e2e on `next build && next start` (the repo's `E2E_SERVER=start` matches the Next.js recommendation and the standalone deploy).
- Playwright's `workers: 1` in CI recommendation conflicts with wanting short wall-clock on a 13-30 min suite; the docs' own answer is sharding across jobs (each with its own MongoDB/LiveKit service containers and seeded DB) plus `--merge-reports` / blob reporter, rather than many workers on one 4-vCPU runner.
- The same `vitest --project=storybook` command can serve local iteration (watch / Storybook test widget) and CI; run it in the pinned Playwright container so browser versions match.
- Because Vitest `related` ignores dynamic imports, it is a heuristic for hooks, not a substitute for the full CI run.

### Gaps

- The Playwright CI page fetched did not discuss `retries` defaults; the standard generated config (`retries: process.env.CI ? 2 : 0`) is widely known but I did not re-verify it on the fetched page.
- Storybook's in-CI page gave no explicit guidance on local watch mode or Chromatic vs self-hosted visual tests.
- Next.js docs do not discuss CI time budgets or sharding.

## Q2. What do respected sources say about which checks block a PR vs run nightly (pyramid/trophy, fast feedback, flakiness, coverage, performance, visual, WebGL)?

### Takeaway

Pipeline stages should be ordered by speed and scope, not by test type: fast static checks and unit/integration first, few slow e2e journeys later (Fowler); most effort in integration tests, static analysis as the base, no 100% coverage mandates (Dodds). Flakiness is endemic to UI/WebDriver-style tests (Google: ~10% of Java WebDriver tests flaky vs 1.65% overall), so retries should be scoped and flaky tests surfaced (Playwright's "flaky" category, `--fail-on-flaky-tests`), with quarantine as an industry practice (mostly vendor-documented). Performance budgets (Lighthouse CI) belong on a production build, with multiple runs and assertions introduced gradually. WebGL in GPU-less CI works through software rendering (SwiftShader bundled; llvmpipe faster) with flag pitfalls.

### Cited Findings

**Pyramid / trophy / pipeline staging**

- "A good build pipeline tells you that you messed up as quick as possible"; stages are "not driven by the types of tests but rather by their speed and scope"; "you put the longer running tests - usually the ones with a broader scope - in the later stages"; e2e tests "require a lot of maintenance and run pretty slowly", reduce them "to a bare minimum" of core user journeys; "Everything more than that will likely be more painful than helpful." — [Fowler/Vocke, The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- Testing Trophy is "A general guide for the return on investment of the different forms of testing"; "Static typing and linting tools like TypeScript and ESLint can get you a remarkable amount of confidence"; "Integration tests strike a great balance on the trade-offs between confidence and speed/expense"; mandating 100% coverage is "a really bad idea", diminishing returns around "70%" (a number he admits is made up). — [Kent C. Dodds, Write tests](https://kentcdodds.com/blog/write-tests)

**Flaky tests and retries**

- Playwright categorizes results as passed / flaky (failed then passed on retry) / failed; retries are off by default; a failed retry discards the worker and browser; `testInfo.retry` lets a test reset server-side state; `test.describe.configure({ retries: 2 })` scopes retries; isolated tests are "usually better". — [Playwright retries](https://playwright.dev/docs/test-retries)
- `--fail-on-flaky-tests` exists to turn flaky results into failures. — [Playwright CLI](https://playwright.dev/docs/test-cli)
- Google: pre-submit tests gate submission, post-submit tests run after; "the same 15 or so failing tests block submission"; mitigations include re-running only failing tests and auto re-run on failure (summary from search snippet of the 2016 Micco post; the fetched page body was not available). A Google reply in that post's comments: "Our rerun mechanism is only used for tests that are marked as flaky or when users specifically request it." — [Google Testing Blog, Flaky Tests at Google and How We Mitigate Them (2016)](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)
- Google 2017: 1.65% of all tests flaky vs 10.45% of Java WebDriver tests (from search snippet of the post's table). — [Google Testing Blog, Where do our flaky tests come from? (2017)](https://testing.googleblog.com/2017/04/where-do-our-flaky-tests-come-from.html)
- Quarantine (moving tests below a consistency threshold out of gating into a non-blocking reliability suite) is described in that Google post's comments by non-Google commenters, and vendors claim Google, Slack, Dropbox, Reddit, etc. quarantine flaky tests — vendor claim, not primary. — [Google Testing Blog 2016 comments](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html); [Trunk.io (vendor)](https://trunk.io/blog/eradicating-flaky-tests)

**Coverage**

- Vitest offers `thresholds.autoUpdate` (ratchet), `perFile`, per-glob thresholds, and `coverage.changed` (coverage for changed files only). — [Vitest coverage config](https://vitest.dev/config/coverage)
- Dodds argues against 100% mandates (see above). — [Kent C. Dodds](https://kentcdodds.com/blog/write-tests)

**Performance budgets (Lighthouse CI)**

- LHCI collects "3 times on each HTML file"; prerequisite: "Your CI process can build your project into production assets"; custom servers should run in production mode; PRs gated via GitHub status checks (checkout the PR head SHA, full git history); for sites with much room for improvement "we recommend skipping this step [assertions] for now"; failing assertions are "a burndown list"; "The bigger the machine the more stable the performance results will be." — [Lighthouse CI getting started](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md)

**WebGL/3D on GPU-less runners**

- Microlink: switching from `--use-angle=swiftshader` (Chrome's bundled default) to `--use-angle=gl` (Mesa llvmpipe) took a 3D page from ~24 s to ~6 s (~4x isolated, ~2x under load); `--disable-gpu` forces SwiftShader back on; `--in-process-gpu` breaks ANGLE's GL surface; without an X display WebGL silently falls back to flat 2D, fixed with Xvfb + `LIBGL_ALWAYS_SOFTWARE=1`. (Undated vendor blog, production screenshot service rather than tests.) — [Microlink, WebGL without a GPU](https://microlink.io/blog/webgl-without-a-gpu)
- Chromium documents SwiftShader as the software WebGL fallback with switches like `--use-gl=angle --use-angle=swiftshader`. — [Chromium: Using Chromium with SwiftShader](https://chromium.googlesource.com/chromium/src.git/+/lkgr-ios-internal/docs/gpu/swiftshader.md)
- Secondary/unverified: `--disable-gpu` breaks WebGL on Chrome 130+ and Playwright uses `--enable-unsafe-swiftshader` (from a mirror repo commit seen only in search snippets; verify against the pinned Chromium). — [search result, mirror repo](https://gitea.oimcloud.myaddr.tools/oimwiodev/chrome-use/src/commit/486e1b341fbe1e1a6bbf9bfc885ec0e2d34eb45c/cli)
- Chrome headless on ARM Macs used SwiftShader by default with WebGL support disabled on Arm (2023 thread). — [chromium-dev thread](https://groups.google.com/a/chromium.org/g/chromium-dev/c/8eR2GctzGuw)

### Inferences

- Blocking PR set (fast, deterministic): lint, typecheck, Vitest unit/integration (MongoDB service container), Storybook interaction tests, build, a small e2e smoke/critical-journey subset on the production build. Non-blocking or nightly: full e2e matrix, visual regression across all stories, adversarial QA, Lighthouse/Web Vitals trend runs, coverage reports with full stories.
- Software-rendered WebGL makes 3D frame times meaningless and slow on CI: assert functional state of the 3D map (scene loaded, objects present, interactions) rather than FPS; keep any frame-time/perf assertions to local GPU machines or a dedicated runner. Keep `--disable-gpu` out of Chromium args.
- Visual regression baselines must be generated in the same pinned Docker image used for comparison (Playwright guidance); running them on-demand/label-triggered or nightly rather than on every PR fits an ~8 min cost.
- Treat retries as a diagnostic, not a fix: CI retries (e.g. 1-2) with trace on first retry, report flaky counts, and either fix or explicitly quarantine (tag + non-blocking job) with an owner.

### Gaps

- Could not fetch the full text of the Google 2016/2017 posts; statistics are from search snippets.
- No authoritative (non-vendor) primary source found that prescribes a specific quarantine policy; Shopify/GitHub engineering blog posts on this were not retrieved.
- No official Playwright doc found on WebGL/GPU flags; Chrome flag behavior changes across versions.
- No authoritative source on bundle-size budget tooling placement (size-limit, Next.js bundle analyzer) was retrieved.

## Q3. What are recommended pre-commit/pre-push contents and time limits?

### Takeaway

There is no authoritative standard; community and tool-vendor sources agree on a tiered split: pre-commit = formatter + linter on staged files only (seconds, roughly <5-10 s), pre-push = typecheck and possibly fast/related unit tests (tens of seconds to ~2 min), CI = everything else. Slow hooks get bypassed with `--no-verify`, which is the main argument for keeping them short.

### Cited Findings

- Budget examples: "pre-commit takes under ten seconds, pre-push takes under two minutes"; another guide says keep pre-commit hooks under 5 seconds; another targets pre-push (structural gates + typecheck + build) at ≤30 s; another holds "tests are CI, not pre-push". These are blogs/guides, not authoritative. — [search summary over: inventivehq git hooks guide](https://inventivehq.com/blog/git-hooks-automation-guide); [codercops pre-commit hooks 2026](https://blog.codercops.com/blog/pre-commit-hooks-code-quality-2026); [agents-playbook pre-push pattern](https://agents-playbook.vercel.app/docs/pillars/quality/pre-push-pattern); [Steve Kinney, git hooks with lefthook](https://stevekinney.com/courses/self-testing-ai-agents/git-hooks-with-lefthook)
- Playwright recommends `tsc --noEmit` on CI (i.e. typecheck must also run in CI, not only in a hook). — [Playwright best practices](https://playwright.dev/docs/best-practices)
- `vitest related <files>` is designed for running only tests that cover given source files (usable from lint-staged/pre-push); static imports only. — [Vitest CLI](https://vitest.dev/guide/cli)

### Inferences

- The repo's current split (oxlint + prettier on staged in pre-commit; typecheck in pre-push) matches the consensus. Adding `vitest related --run` for staged files is optional; integration specs that need MongoDB should not be in hooks.
- Hooks are a convenience; CI must re-run lint, format check and typecheck because hooks can be skipped.

### Gaps

- No primary source (e.g. husky/lint-staged official docs) found stating explicit time budgets.

## Q4. How to handle long/flaky/expensive suites (nightly, merge queue, path filters, sharding, concurrency)?

### Takeaway

Use sharding + report merging for wall-clock, `concurrency` with `cancel-in-progress` to kill superseded PR runs, path filters to skip irrelevant suites, a merge queue (`merge_group` trigger) to test against the latest base, and move the most expensive/least deterministic suites (visual, full matrix, adversarial QA, perf trends) to scheduled or on-demand workflows.

### Cited Findings

- Playwright: sharding across CI jobs (`--shard=x/y`), workers 1 per CI job for stability, global timeout, traces on first retry. — [Playwright CI](https://playwright.dev/docs/ci); [Playwright best practices](https://playwright.dev/docs/best-practices)
- Vitest: `--shard <index>/<count>` and `--merge-reports` for blob reports. — [Vitest CLI](https://vitest.dev/guide/cli)
- GitHub concurrency example: `concurrency: group: ${{ github.head_ref || github.run_id }}` with `cancel-in-progress: true` cancels in-progress runs of the same PR. — [GitHub Docs: control workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- Merge queue: "You must use the merge_group event to trigger your GitHub Actions workflow when a pull request is added to a merge queue"; the queue tests each PR combined with the latest base and PRs ahead of it; build concurrency is 1-100 to throttle CI load. The doc does not say to run long tests only in the queue. — [GitHub Docs: managing a merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
- Google runs pre-submit (gating) and post-submit tests; rerun mechanism limited to tests marked flaky or on request. — [Google Testing Blog 2016](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)
- Fowler: order stages by speed and scope; slow broad tests later. — [Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)

### Inferences

- Concrete split for this project:
  - Local iteration: `vitest` watch / `--changed`, Storybook test widget, one e2e spec with `-g` against the running `next dev`, `--only-changed`/`--last-failed`; no coverage by default.
  - Pre-commit: oxlint + prettier on staged (seconds). Pre-push: typecheck.
  - PR CI (blocking, with concurrency cancel + path filters): lint/format check, typecheck, Vitest unit + integration (MongoDB service), Storybook tests in the pinned Playwright image, `next build`, e2e on the production build sharded (MongoDB + LiveKit services, seeded per shard), retries 1-2 with traces on retry, `--forbid-only`; coverage collected but not hard-gated, or ratcheted with `autoUpdate`/diff coverage.
  - On-demand (label / workflow_dispatch) or nightly: visual regression in the pinned Docker image (baselines regenerated only there), full browser matrix, `--repeat-each` flake hunting, `--fail-on-flaky-tests` reports, Lighthouse CI / Web Vitals trends, adversarial QA, full coverage including stories.
- A merge queue is mostly valuable with many concurrent contributors; for a single-maintainer repo, concurrency + path filters + nightly give most of the benefit.

### Gaps

- No primary source fetched for GitHub Actions `paths` filters (well-documented feature, but not verified in this session) or for how required checks interact with path-filtered skipped workflows.
- No Shopify/GitHub engineering blog posts retrieved on their own CI tiering; sources here are tool docs, Fowler, Dodds and Google's testing blog.
