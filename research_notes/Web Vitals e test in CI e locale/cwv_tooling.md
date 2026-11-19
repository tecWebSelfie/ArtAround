# Core Web Vitals tooling for a Next.js 16 App Router app: field collection vs lab tests in CI (as of 2026-11)

Context checked in this repo (2026-11-18): `next` 16.4.6, `@sentry/nextjs` ^10.70.0 (installed 10.74.0), `@playwright/test` 1.63.0, `web-vitals` 6.2.3, Sentry `tracesSampleRate: 0.1` in production (`src/instrumentation-client.ts`), and a Playwright spec `tests/e2e/web-vitals.e2e.spec.ts` that injects the web-vitals IIFE build through `addInitScript` (`tests/helpers/web-vitals.ts`).

## Is `useReportWebVitals` a replacement for a test that measures vitals in CI? What do the Next.js docs say it is for?

### Takeaway

No. `useReportWebVitals` (from `next/web-vitals`) is a thin client-side hook around a copy of Google's `web-vitals` library bundled inside Next.js. The docs present it only as a way to report metrics from real users to an analytics endpoint (field/RUM). It makes no assertions, has no thresholds, and never fails anything. A CI test could listen to it, but it would measure no more than injecting `web-vitals` directly.

### Cited Findings

- The docs define it like this: "The `useReportWebVitals` hook allows you to report Core Web Vitals, and can be used in combination with your analytics service." It reports TTFB, FCP, LCP, CLS and INP, each with `id`, `name`, `delta`, `value`, `rating` ("good" / "needs-improvement" / "poor"), `entries`, `navigationType` (including `"soft-navigation"`), `navigationId`, `navigationURL`, `navigationStartTime` and `navigationInteractionId`. The page was updated 2026-11-18. — [Next.js: useReportWebVitals](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals)
- It must run in a Client Component (`'use client'`) that is mounted in the root layout. The docs say the callback reference must stay stable to avoid duplicate reports ("New functions passed to `useReportWebVitals` are called with the available metrics up to that point."). — [Next.js: useReportWebVitals](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals)
- The docs' stated purpose is to "send results to any endpoint to measure and track real user performance on your site" with `navigator.sendBeacon`/`fetch(keepalive)`, or to Google Analytics. — [Next.js: useReportWebVitals](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals)
- The analytics guide offers two options: "use the `useReportWebVitals` hook to manage reporting yourself, or alternatively, Vercel provides a managed service to automatically collect and visualize metrics". It names `instrumentation-client.ts` as the place for global analytics, error tracking and performance monitoring. Testing and CI are not mentioned. — [Next.js: Analytics guide](https://nextjs.org/docs/app/guides/analytics)
- Source (canary): `packages/next/src/client/web-vitals.ts` imports `onLCP, onCLS, onINP, onFCP, onTTFB` from `next/dist/compiled/web-vitals` (a vendored copy, not the npm package). Inside a `useEffect` it calls `onCLS/onLCP/onINP/onFCP(fn, { reportSoftNavs: true })` and `onTTFB(fn)`. It uses neither `reportAllChanges` nor the attribution build. — [next.js source on GitHub](https://github.com/vercel/next.js/blob/canary/packages/next/src/client/web-vitals.ts)

### Inferences

- Without the attribution build, the hook cannot say which element or script caused a bad LCP or INP. It also cannot be configured with `reportAllChanges`. For diagnostics, use `web-vitals/attribution` directly.
- Because of `reportSoftNavs: true`, App Router client-side navigations are reported as separate metric sets on Chromium builds that support soft navigations. Field dashboards should therefore group by `navigationType`/`navigationURL`.
- In this app, Sentry's browser tracing already collects the same vitals (see below). Adding `useReportWebVitals` only pays off if there is a separate destination for the data, such as a custom endpoint or GA, or if unsampled (100%) collection is wanted.

### Gaps

- The Next.js docs do not explicitly say "this is not a testing tool". That conclusion comes from the hook's design (report-only, no assertions) and from the docs describing it only for analytics.
- I did not check which `web-vitals` version Next 16.4.6 vendors. The `reportSoftNavs` option and the `soft-navigation` navigationType point to v5 or later.

## The `web-vitals` library directly (attribution build, reportAllChanges)

### Takeaway

`web-vitals` is Google's field measurement library. The attribution build adds diagnostic data (about 1.5 KB brotli). `reportAllChanges` is a debugging option that is not recommended for production. INP is reported only after a real interaction, and CLS/INP are finalized when the page is hidden. Lab use (e.g. Playwright) therefore has to script an interaction and force a visibility change or navigation.

### Cited Findings

- Import from `web-vitals/attribution` to get an extra `attribution` property. It costs about 1.5K brotli and is "only recommended if you're actually using these features". — [GoogleChrome/web-vitals README](https://github.com/GoogleChrome/web-vitals)
- `{reportAllChanges: true}` fires the callback whenever the value changes. It is useful for debugging and not needed or recommended in production. "reportAllChanges only reports when the metric changes, not for each input to the metric." — [web-vitals README](https://github.com/GoogleChrome/web-vitals)
- `{reportSoftNavs: true}` measures SPA soft navigations (Chromium 151+). TTFB is 0 for soft navs, and INP/CLS reset after a soft nav. — [web-vitals README](https://github.com/GoogleChrome/web-vitals)
- "`callback` is always called when the page's visibility state changes to hidden". The callback can fire multiple times (use `id`/`delta`). The library re-reports after a bfcache restore. CLS, FCP and LCP are not reported for pages loaded in the background. "INP is not reported if the user never interacts with the page." — [web-vitals README](https://github.com/GoogleChrome/web-vitals)
- The README's CDN examples load `web-vitals@5`, while this repo pins 6.2.3, so the README's version labelling looked out of date when fetched. — [web-vitals README](https://github.com/GoogleChrome/web-vitals)

### Inferences

- In a Playwright test, use `reportAllChanges: true` to read provisional LCP/CLS values without waiting for page hide, or trigger `visibilitychange`/navigate away. INP needs a scripted click or keypress.

### Gaps

- I did not fetch a v6 changelog, so the differences between v5 and v6 are not covered here.

## Does Sentry (@sentry/nextjs v10) already collect LCP/CLS/INP in production by default, and under which config?

### Takeaway

Yes. Once tracing is enabled (`tracesSampleRate` or `tracesSampler` set), `browserTracingIntegration` is on by default in `@sentry/nextjs`. It captures LCP, CLS and TTFB (plus FCP, FP and other measurements) on the pageload transaction, and INP as standalone web-vital spans (`enableInp` defaults to true since v8). All of this is sampled, so with `tracesSampleRate: 0.1` you get vitals from about 10% of page loads. v11 (released; the repo is still on v10) moves to span streaming and a `webVitals` option.

### Cited Findings

- "BrowserTracing automatically captures Web Vitals". The table lists LCP, CLS and TTFB for page loads and INP for responsiveness. browserTracing "is enabled by default once you set up tracing", and "To enable tracing, simply set either a `tracesSampleRate` or a `tracesSampler`." — [Sentry Next.js automatic instrumentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/tracing/instrumentation/automatic-instrumentation/)
- `enableInp` "Defaults to `true` in SDK 8 and later". It is deprecated in SDK 11 in favour of `webVitals: { ignore: ["inp"] }` (added in 11.0.0). — [Sentry browser automatic instrumentation](https://docs.sentry.io/platforms/javascript/tracing/instrumentation/automatic-instrumentation)
- INP span sampling: `interactionsSampleRate` (default 1.0) applies on top of `tracesSampleRate`. The docs' example is 0.5 × 0.1 ≈ 5% of interactions. — [Sentry SvelteKit automatic instrumentation](https://docs.sentry.io/platforms/javascript/guides/sveltekit/tracing/instrumentation/automatic-instrumentation) (same shared browser SDK)
- Installed code (`@sentry/browser` 10.74.0): BrowserTracing's `afterAllSetup` adds `webVitalsIntegration({ ignore: enableInp ? [] : ['inp'], _experiments: { enableStandaloneClsSpans, enableStandaloneLcpSpans } })`. INP is emitted through `startStandaloneWebVitalSpan` → `startInactiveSpan({ experimental: { standalone: true } })`, so it goes through normal trace sampling. — local `node_modules/.pnpm/@sentry+browser@10.74.0/.../tracing/browserTracingIntegration.js` and `@sentry+browser-utils@10.74.0/.../metrics/{inp,utils}.js` (read 2026-11-18)
- v11 migration: "BrowserTracing now automatically adds the WebVitals integration". "CLS and LCP are recorded as measurements on the pageload span, or as dedicated spans in stream mode". "INP is always sent as a Web Vital span". "Tracing moves to span streaming in v11 … Stream mode is the new default". The `_experiments.enableStandalone*Spans` flags were removed. Soft-navigation vitals are on by default in stream mode. — [Sentry migration v10→v11](https://docs.sentry.io/platforms/javascript/migration/v10-to-v11/); release announcement: [Sentry changelog: JavaScript SDK v11](https://sentry.io/changelog/javascript-sdk-v11/)

### Inferences

- In this app, with `^10.70.0` and `tracesSampleRate` 0.1 in production, Sentry already provides sampled field LCP/CLS/INP/TTFB. It is the RUM source to watch (p75 per route in the Web Vitals module), so a separate `useReportWebVitals` beacon would be largely redundant.
- Vitals are tied to the trace sampling decision, so low-traffic routes will have few samples at 0.1. Raise the rate with `tracesSampler` per route if field data is too thin.
- The SDK skips bots (`_isBot` check in BrowserTracing), so headless Playwright traffic may not report vitals to Sentry. I did not verify how the bot check works.

### Gaps

- The Sentry Web Vitals product page did not give the performance-score weights or confirm FCP in the Next.js docs table. The local code and the sampling interpretation are my reading of the 10.74.0 source, not documented guarantees.
- The exact release date of Sentry JS SDK v11 was not found.

## Vercel Speed Insights / other RUM

### Takeaway

Next.js docs point to Vercel's managed service (Speed Insights) as the alternative to building your own reporting with `useReportWebVitals`. Like Sentry, it is field data. This app is not deployed on Vercel (standalone Docker deploy), and Sentry already covers RUM.

### Cited Findings

- "Vercel provides a managed service to automatically collect and visualize metrics for you." — [Next.js: Analytics guide](https://nextjs.org/docs/app/guides/analytics)
- DebugBear combines scheduled lab tests (Lighthouse) with CrUX field data and supports budgets for CI builds. — [DebugBear performance budgets docs](https://www.debugbear.com/docs/performance-budgets)

### Inferences

- Speed Insights' pricing and non-Vercel hosting support were not researched. Given the standalone Docker deploy, Sentry plus CrUX/PageSpeed Insights for public URLs is the natural field stack.

### Gaps

- I did not fetch Vercel Speed Insights, SpeedCurve or Calibre docs.

## What do Lighthouse CI docs recommend for stable results (numberOfRuns, median, throttling, hardware)?

### Takeaway

Run several times (LHCI default 3, Lighthouse recommends 5), assert on the median, keep simulated throttling (the default), and use dedicated, non-burstable hardware with at least 2 and ideally 4 cores. Lighthouse's own docs call free CI environments "typically quite volatile", and the shipped `lighthouse:recommended` preset only warns on performance metrics.

### Cited Findings

- `numberOfRuns` "helps mitigate fluctuations due to natural page variability". The default is 3. LHCI computes a representative median run per URL. Assertion aggregation can be `median`, `optimistic` (the default when unset), `pessimistic` or `median-run`. Levels are `off`/`warn`/`error`, and only `error` fails with a non-zero exit. — [LHCI configuration docs](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md)
- `lighthouse:recommended` is "a more realistic base that disables hard failures for flaky audits". Performance metrics only warn below 90. `lighthouse:all` "is extremely difficult". A `budgetsFile` cannot be combined with other assert options. — [LHCI configuration docs](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md)
- GitHub Actions example: `ubuntu-latest`, `npm install -g @lhci/cli@0.16.x && lhci autorun`, optional `LHCI_GITHUB_APP_TOKEN` for status checks, and `temporary-public-storage` uploads (public URLs, no history or diffing) or a self-hosted LHCI server for history and diffs. "The bigger the machine the more stable the performance results will be." — [LHCI getting started](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md)
- Variability: client hardware and resource contention are "high" sources of variance. Simulated throttling mitigates network effects and partially mitigates hardware and contention; DevTools (applied) throttling mitigates less. "The median Lighthouse score of 5 runs is twice as stable as 1 run". Other advice from the same doc:
  - Use at least 2 dedicated cores (4 recommended) and 2 GB RAM (4–8 GB recommended).
  - Avoid burstable or shared-core instances.
  - Never run concurrent Lighthouse runs on one machine.
  - "Free CI environments and 'burstable' instances are typically quite volatile."
    — [Lighthouse variability docs](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)

### Inferences

- On a shared GitHub-hosted runner, the LHCI recipe that best fits Google's guidance is: 3–5 runs, median aggregation, simulated throttling, warn-level performance assertions (or error only on generous thresholds), and `error` reserved for deterministic audits (accessibility, byte-weight budgets).

### Gaps

- The LHCI docs give no quantified false-failure rate on GitHub-hosted runners.

## Playwright-based approaches, and is a hard "good" threshold on lab LCP/INP in a blocking CI job recommended?

### Takeaway

Playwright can measure lab vitals in Chromium in a few ways: injecting `web-vitals` or raw `PerformanceObserver`s, CDP throttling (`Emulation.setCPUThrottlingRate`, `Network.emulateNetworkConditions`), Chrome traces, or running Lighthouse over CDP (`playwright-lighthouse`). Lab INP is only meaningful for a scripted interaction, and TBT is the usual lab proxy. Authoritative sources treat lab numbers as regression signals, not predictors of field CWV. Shared CI runners are noisy, so hard "good" thresholds (LCP ≤ 2.5 s, INP ≤ 200 ms) in a blocking job either flake or are set so loosely that they only catch gross regressions. The better patterns are:

- Generous absolute ceilings or relative/baseline budgets.
- Medians over multiple runs.
- Deterministic budgets that block: CLS on a stable fixture, bundle or byte size, request counts.
- Warn-only or scheduled jobs on dedicated hardware for timing metrics.
- Field data (Sentry RUM) for the real "good" target.

### Cited Findings

- Checkly's Playwright guide reads LCP (last `largest-contentful-paint` entry), CLS (`layout-shift` entries without recent input) and TBT (long tasks over 50 ms) through `page.evaluate`, uses a CDP session for network throttling and runs Lighthouse via `connectOverCDP`. It says "Interaction to Next Paint relies on user interactions, and it's best measured using real user monitoring" and "Use Total Blocking Time as an interactivity metric in a lab setting". CDP is Chromium-only. — [Checkly: Playwright performance](https://www.checklyhq.com/learn/playwright/performance/)
- web.dev on lab vs field:
  - Lab tools are useful "when debugging issues or testing features before deploying", but "field data is what you should use to prioritize your efforts".
  - Lab LCP differs from field LCP because of cold cache, a fixed viewport and no early stop on scroll.
  - Lab CLS covers only above-the-fold shifts during load.
  - INP depends on when users choose to interact, which the lab "cannot accurately predict", and low TBT does not guarantee good INP.
    — [web.dev: Why lab and field data can be different](https://web.dev/articles/lab-and-field-data-differences)
- Noise on GitHub-hosted runners: a CodSpeed measurement found a coefficient of variation of 2.66% on hosted runners vs 0.56% on dedicated machines, with an estimated 45% false-alarm rate for a 2% regression gate on hosted runners. This is a vendor with a commercial interest, and the numbers are for CPU micro-benchmarks, not browser vitals. — [CodSpeed: benchmarks in CI without noise](https://codspeed.io/blog/benchmarks-in-ci-without-noise)
- Each GitHub Actions workflow may land on a different VM, which shifts results across runs. Within one VM, runs differed by about 1.5%. — [pythonspeed: Reliable benchmarking in noisy environments](https://pythonspeed.com/articles/consistent-benchmarking-in-ci)
- The lighthouse-ci-action README warns that asserting on a single run gives flaky performance assertions and suggests `runs: 3`. — [treosh/lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action)
- Lighthouse variability doc: "running on inconsistent hardware will lead to inconsistent results", and free CI environments are "typically quite volatile". — [Lighthouse variability docs](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)

### Inferences

Recommendation for this repo (Playwright on ubuntu runners without GPU; the 3D/WebGL pages render through SwiftShader software GL there, which inflates main-thread time far beyond real devices):

1. Keep the existing Playwright vitals spec as a regression guard. Make it robust:
   - Assert CLS strictly, since it is mostly deterministic on a seeded fixture.
   - Give LCP a generous ceiling (well above 2.5 s, or relative to a stored baseline) using the median of N loads.
   - Assert lab INP only for a specific scripted interaction, against a loose ceiling, or as warn/annotation-only.
2. Make the deterministic budgets blocking: JS bytes per route, image weight, request count (Next build output or LHCI `resource-summary`/budgets). These do not flake.
3. If you add Lighthouse CI, use 3–5 runs, median aggregation, simulated throttling and the `lighthouse:recommended` style (performance metrics at `warn`). Prefer a scheduled or nightly run, or a self-hosted dedicated runner, for timing-based gating.
4. Use Sentry RUM (already on, 10% sample) for the actual CWV "good" targets at p75 per route, optionally with alerts.

### Gaps

- I did not find primary posts from Shopify, SpeedCurve or Calibre engineers in this pass. The "relative/baseline budget" recommendation rests on the Lighthouse variability docs, the LHCI presets and benchmark-noise studies, not on a named CWV-specific practitioner article.
- No source quantified run-to-run variance of browser LCP/INP specifically on GitHub-hosted runners.
- I did not fetch the `playwright-lighthouse` package docs. It is known to run Lighthouse against Playwright's Chromium via a remote debugging port, but the version and maintenance status as of 2026 are unverified.
