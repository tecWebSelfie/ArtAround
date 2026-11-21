# Core Web Vitals methodology: collecting and judging LCP, CLS and INP (state as of Nov 2026)

## What are the official thresholds and how are they assessed (percentile, origin vs URL, mobile/desktop)?

### Takeaway

LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 are "good". The judgement uses **real-user field data (CrUX)**: the **75th percentile** of page loads over the **last 28 days**, with mobile and desktop judged **separately**. A page or URL group passes only if all three metrics are good, and its status is set by its worst metric. Lab tools never decide the assessment.

### Cited Findings

- Thresholds: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Measure the 75th percentile of page loads, "segmented across mobile and desktop devices". A page passes only if it meets all three at p75 — [web.dev: Web Vitals](https://web.dev/articles/vitals) (last updated 2024-10-31)
- INP was promoted to "pending" in 2023 and became a stable Core Web Vital in 2024, replacing FID — [web.dev: Web Vitals](https://web.dev/articles/vitals)
- Lifecycle: metrics move from Experimental to Pending (held at least 6 months) to Stable. Stable metrics "won't change more than once per year" but are not necessarily permanent — [web.dev: Web Vitals](https://web.dev/articles/vitals)
- Poor boundaries: LCP > 4 s, INP > 500 ms, CLS > 0.25. "Needs improvement" sits between good and poor — [Search Console Help: Core Web Vitals report](https://support.google.com/webmasters/answer/9205520)
- How Search Console assesses:
  - data is CrUX field data at p75 over the last 28 days;
  - URLs are grouped by similar experience, and a group without enough data falls back to an origin-level group;
  - mobile and desktop are evaluated separately;
  - a group's status is "its most poorly performing metric" — [Search Console Help](https://support.google.com/webmasters/answer/9205520)
- Why p75: about 3 out of 4 visits get the target experience or better, and p75 resists outliers better than p95. The same thresholds apply to mobile and desktop, and they were set mostly from what mobile sites can achieve — [web.dev: Defining the Core Web Vitals metrics thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)
- CrUX levels:
  - CrUX has origin-level and page-level (URL) data. Query strings and fragments are stripped from URLs.
  - Pages and origins below an undisclosed popularity threshold, or that are not publicly discoverable (non-200, `noindex`), are excluded.
  - CrUX comes from opted-in Chrome users on desktop (Windows/macOS/ChromeOS/Linux) and Android. It excludes iOS Chrome, Android WebView and other Chromium browsers (such as Edge) — [CrUX methodology](https://developer.chrome.com/docs/crux/methodology)
- The CrUX API supports the form factors `PHONE`, `DESKTOP` and `TABLET`, or all combined. It reports `percentiles.p75`, and a metric "passes" when its p75 is under the good threshold — [CrUX API guide](https://developer.chrome.com/docs/crux/guides/crux-api)

### Inferences

- A site that is not public or not popular, such as a staging deploy or a new or low-traffic museum site, has no CrUX data. Field measurement then has to come from its own RUM (the `web-vitals` library or Next's `useReportWebVitals`), judged the same way: p75 per form factor over a rolling window.
- Lab numbers cannot "pass" or "fail" Core Web Vitals in the official sense. They are proxies.

### Gaps

- I did not find the CrUX page that states the "28-day rolling window, updated daily" for the API/PSI. The 28-day window is confirmed only through the Search Console doc.

## When are lab measurements representative, and which conditions are recommended?

### Takeaway

Lab data is controlled and reproducible, so it is good for debugging and pre-release checks, but it is not representative of real users. Make it as meaningful as possible with:

- a production build;
- Lighthouse's default mobile profile: Moto G Power emulation (412×823, DPR 1.75), "Slow 4G" (150 ms RTT, 1.6 Mbps down / 750 Kbps up) and a 4× CPU slowdown, with the CPU multiplier calibrated against the machine's benchmarkIndex;
- a dedicated, non-burstable machine with no extensions and no concurrent runs;
- a cold-cache navigation (the lab default).

### Cited Findings

- Lighthouse throttling:
  - The default mobile network is 150 ms latency, 1.6 Mbps down, 750 Kbps up, no packet loss. Lighthouse calls it "Slow 4G"; it matches WebPageTest's "Mobile 3G - Fast". CPU uses a constant 4× slowdown.
  - The default method is **simulated** (Lantern models the load from an unthrottled run). It is fast and deterministic but can be inaccurate on edge cases. The alternative is DevTools (applied) throttling — [Lighthouse docs: throttling.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)
- CPU calibration:
  - Each report has a benchmarkIndex. Typical ranges: high-end desktop 1500–2000, low-end desktop 1000–1500, high-end mobile 800–1200, mid-tier mobile 125–800, low-end mobile < 125.
  - Recalibrate `--throttling.cpuSlowdownMultiplier` when the host falls outside the expected range. The CLI warns about underpowered hosts — [throttling.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)
- Emulation: mobile is a Moto G Power (2022) at 412×823, deviceScaleFactor 1.75. Desktop is 1350×940 at DPR 1. The default throttling is `mobileSlow4G`, simulated, and the desktop config uses `desktopDense4G` — [lighthouse core/config/constants.js](https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/core/config/constants.js), [desktop-config.js](https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/core/config/desktop-config.js)
- Hardware: at least 2 dedicated cores (4 recommended) and 2 GB RAM (4–8 GB recommended).
  - Avoid FaaS and burstable or shared-core instances (AWS `t`, GCP shared-core N1/E2).
  - Never run several Lighthouse instances at once on one machine; scale horizontally.
  - In CI use dedicated servers: "free CI and burstable instances are typically volatile".
  - Isolate the server from network volatility (localhost or the same network), and the client from antivirus and extensions — [Lighthouse variability.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
- Where each throttling method helps (variability.md table):
  - Simulated throttling mitigates local and tier-1 network variability and partly mitigates client hardware variability, resource contention and browser nondeterminism.
  - DevTools throttling only partly mitigates network variability.
  - No method mitigates page nondeterminism (A/B tests, ads, random animations) — [variability.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
- Cache: lab tests usually start with a cold cache, while real users often have cached resources or bfcache restores. "Lab tests do not consider bfcache." — [web.dev: Why lab and field data can be different](https://web.dev/articles/lab-and-field-data-differences)
- Lab tests also fix one device, network and location, and use a generic or unpersonalized state (no ads, A/B tests or personalization) — [web.dev: lab vs field](https://web.dev/articles/lab-and-field-data-differences)
- Lab with slow networks or low-end devices can reveal users that field data misses, because field data only covers users who manage to load the site — [web.dev: lab vs field](https://web.dev/articles/lab-and-field-data-differences)
- Next.js: "run `next build` … then run `next start` to measure the performance of your application in a production-like environment". Run Lighthouse in incognito; "This is a simulated test and should be paired with looking at field data" — [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist) (lastUpdated 2026-11-06)
- Lighthouse 13 (2025-10-10): legacy performance audits were replaced by "Insights" audits, for example `cls-culprits-insight` replacing `layout-shifts`. There were **no changes to performance scoring**. It requires Node ≥ 22.19 and ships in Chrome 143 — [Chrome blog: Lighthouse 13](https://developer.chrome.com/blog/lighthouse-13-0)
- Performance score weights (Lighthouse 10+): TBT 30%, LCP 25%, CLS 25%, FCP 10%, SI 10% — [Lighthouse performance scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)

### Inferences

- A cloud or CI container is usually shared-core or burstable. Simulated throttling (the default) is the most robust choice there, because it removes network noise and part of the CPU noise. DevTools or applied throttling exposes the run to host noise.
- Simulated LCP and TBT are modelled values, not observed ones. Assertions on them are best treated as trend signals.
- Warm-up: no Google source I found mandates "warm-up runs". The cold-cache default is deliberate, as a worst-case first visit. A warm or repeat-view run is a separate scenario (WebPageTest's "repeat view" concept), not a fix for noise. Separately, a just-started production server (cold JIT, empty data caches, ISR) can inflate TTFB/LCP on the first request, so priming the server (not the browser) before timed runs is reasonable. This is my inference and is not stated in Google docs.

### Gaps

- I could not retrieve the exact `desktopDense4G` values (RTT, throughput, CPU multiplier): the Lantern constants file has moved (404). Commonly cited as about 40 ms RTT, ~10 Mbps and 1× CPU, but **unverified**.
- I found no official Google guidance on lab measurement in Firefox/WebKit. Playwright-based CWV in other engines is limited by API support (LCP/INP/CLS are Chromium-only or partial), which was not researched here.

## How much run-to-run variance do lab metrics have, and what is recommended (multiple runs, medians, relative budgets)?

### Takeaway

Variance comes mostly from page nondeterminism, network, client hardware and resource contention, not from Lighthouse itself. Google recommends:

- aggregating several runs, typically the **median of 5**, which is "twice as stable as 1 run";
- judging a distribution rather than a single number;
- running on dedicated, isolated hardware.

### Cited Findings

- "The median Lighthouse score of 5 runs is twice as stable as 1 run." Use aggregates (median, p90, min/max) rather than single results when setting thresholds.
  - With Lighthouse CI: `lhci collect --url <url> -n 5`.
  - In Node: `computeMedianRun` from `lighthouse/core/lib/median-run.js` — [variability.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
- Sources of variability, by impact:
  - high: page nondeterminism, local network, client hardware, client resource contention;
  - medium: tier-1 network, browser nondeterminism;
  - low: web server — [variability.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
- "A lot of the variability in your overall Performance score and metric values is not due to Lighthouse." Think of performance as a distribution — [Lighthouse performance scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)
- Field data is itself a distribution; tools report p75 — [web.dev: lab vs field](https://web.dev/articles/lab-and-field-data-differences)

### Inferences

- In CI on shared runners, compare budgets as relative deltas against a baseline measured on the same runner type, using medians of 3–5 runs, with tolerance bands. This works better than tight absolute thresholds. CLS is mostly deterministic in a fixed lab scenario, so it can take a tighter assertion than LCP or TBT.
- For per-run variance, the variability doc gives no numeric coefficient beyond the "2× more stable" claim.

### Gaps

- I found no official per-metric standard deviation figures, such as "LCP varies ±X%", in current Google docs.

## What can lab tools measure, and how should lab results be used (regression detection vs absolute targets)?

### Takeaway

- **LCP and CLS** can be measured in the lab, but they often differ from the field:
  - the LCP element differs;
  - the cache is cold;
  - bfcache is absent;
  - lab CLS covers only load-time shifts.
- **INP needs real interactions.** Lighthouse navigation mode can't measure it and reports **TBT** as the proxy (TBT < 200 ms on average mobile hardware). Timespan or user-flow mode, or scripted interactions, can capture interaction latency for specific scripted interactions.
- Use lab data to debug and catch regressions; prioritize from field data.

### Cited Findings

- Lighthouse "can't measure INP because it has no user input", so it uses TBT as a proxy — [web.dev: Web Vitals](https://web.dev/articles/vitals)
- TBT:
  - Definition: the sum of the portion of each long task over 50 ms, between FCP and TTI. The target is under 200 ms on average mobile hardware.
  - A low TBT often correlates with a low INP, but TBT can flag issues users never hit and miss interaction-driven delays.
  - Don't measure TBT in the field (use LoAF there). TBT can be measured beyond TTI in Lighthouse **Timespan** mode — [web.dev: TBT](https://web.dev/articles/tbt)
- LCP lab vs field:
  - the lab always finds the same element, while the field varies with viewport, personalization, A/B tests and fonts;
  - cold vs warm cache;
  - bfcache restores;
  - in the field, LCP stops at the first scroll or interaction — [web.dev: lab vs field](https://web.dev/articles/lab-and-field-data-differences)
- CLS lab vs field: lab mostly captures above-the-fold shifts during load. The field includes shifts during scrolling and interaction, such as lazy images without dimensions, and personalized content — [web.dev: lab vs field](https://web.dev/articles/lab-and-field-data-differences)
- INP lab vs field:
  - depends on when real users interact;
  - users who wait for scripts may see a low INP despite a high TBT;
  - the 300 ms tap delay on non-mobile-optimized pages counts in INP but not in TBT — [web.dev: lab vs field](https://web.dev/articles/lab-and-field-data-differences)
- Use lab data for debugging and pre-release testing because it is reproducible. "Field data is what you should use to prioritize your efforts." Use both — [web.dev: lab vs field](https://web.dev/articles/lab-and-field-data-differences)

### Inferences

- Lab assertions in CI are best framed as **regression detection** under fixed conditions: same build, profile, runner and fixture. Absolute Core Web Vitals targets (2.5 s, 200 ms, 0.1) are field p75 goals. They can be used as sanity ceilings in the lab, but they say nothing certain about field compliance.
- A Playwright spec that clicks and reads `event` timing or `web-vitals` `onINP` gives a per-interaction latency under lab conditions. It is useful for catching regressions in specific heavy interactions (for example a 3D map), not as an INP value.

### Gaps

- No Google document I found gives a numeric lab-to-field correlation factor between TBT and INP.

## Is measuring on a development server (e.g. `next dev`) ever meaningful?

### Takeaway

Not for absolute LCP, INP or TBT values. Next.js and Google tooling both say to measure a production build (`next build && next start`). A dev server is useful only for spotting issues qualitatively, for example which element is the LCP element or which layout shifts happen.

### Cited Findings

- Next.js: run `next build` and then `next start` "to measure the performance of your application in a production-like environment" — [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)
- Next.js Learn (Lighthouse lesson): the app "should always be tested with a production build" (seen in the search result snippet) — [nextjs.org/learn/seo/lighthouse](https://nextjs.org/learn/seo/lighthouse)

### Inferences

- `next dev` compiles routes on demand. It ships unminified bundles with dev-only React checks, HMR and overlay code, and Strict Mode double renders. These inflate TTFB, LCP, TBT and interaction latency, so its absolute values are not comparable to production.
- CLS is mostly a layout property, so a dev server can reveal CLS sources (missing image dimensions, font swaps). The values may still differ, because dev styles and fonts load differently (for example, CSS injected by JS in dev). Use dev only to find CLS sources, never as a pass/fail gate.

### Gaps

- I found no Google document that explicitly addresses dev servers; the guidance comes from Next.js.

## Changes to Core Web Vitals and the web-vitals library, 2025–2026

### Takeaway

The Core Web Vitals set is unchanged: LCP, INP and CLS, with the same thresholds. Lighthouse scoring is unchanged in v13. The main 2025–2026 changes:

- **web-vitals v5 (May 2025)** removed `onFID`, moved to Baseline Widely-available support, and expanded INP attribution with LoAF data.
- **web-vitals v6 (July 2026)** added soft-navigation support.
- The browser **Soft Navigations API** ran its final origin trial in Chrome 147–149 (April 2026), with shipping planned later in 2026. CrUX inclusion of soft navigations is undecided.

### Cited Findings

- web-vitals changelog:
  - v5.0.0 (2025-05-07): removed `onFID()`; browser support policy changed to Baseline Widely available; INP attribution extended with the LoAF longest script and buckets.
  - v5.1.0 (2025-07-31): LCP finalizes only on trusted user events.
  - v5.2.0 (2026-03-25): `includeProcessedEventEntries` option.
  - v6.0.0 (2026-07-21): **Soft Navigation support**; bfcache reporting of small INP interactions; breaking module changes.
  - v6.1.0: Resource Timing buffer for LCP attribution.
  - v6.2.0: no spurious CLS 0 after a bfcache restore.
  - Latest is v6.2.3 (2026-10-05) — [web-vitals CHANGELOG](https://raw.githubusercontent.com/GoogleChrome/web-vitals/main/CHANGELOG.md)
- v4.0.0 (2024-05) added the INP phase breakdown (inputDelay, processingDuration, presentationDelay) and LoAF attribution, and deprecated `onFID` — [web-vitals CHANGELOG](https://raw.githubusercontent.com/GoogleChrome/web-vitals/main/CHANGELOG.md)
- Soft Navigations:
  - Origin trials: Chrome 139 (announced 2025-07-31), then a final trial in Chrome 147–149 (published 2026-04-20). Chrome "plans to ship" later in 2026.
  - Soft-nav LCP uses the new `interaction-contentful-paint` and `soft-navigation` entries; CLS and INP are sliced by `soft-navigation` entries via `navigationId`.
  - Whether CrUX will include soft navigations will be decided after launch.
  - An experimental soft-nav build of web-vitals exists — [Chrome blog: Final Soft Navigations origin trial](https://developer.chrome.com/blog/final-soft-navigations-origin-trial), [Chrome blog: new soft navigations origin trial (2025-07-31)](https://developer.chrome.com/blog/new-soft-navigations-origin-trial)
- Lighthouse 13 (October 2025) moved to Insights audits without scoring changes — [Chrome blog: Lighthouse 13](https://developer.chrome.com/blog/lighthouse-13-0)

### Inferences

- For a Next.js App Router SPA, where most navigations are client-side, CrUX and Search Console currently measure only hard loads. Per-route INP and CLS after client navigations are attributed to the landing URL. Soft-nav-aware RUM (web-vitals v6) is the way to see per-route values once Chrome ships the API.

### Gaps

- I could not confirm whether the Soft Navigations API actually shipped to Chrome stable by November 2026.
- I could not confirm whether any new metric (for example soft-navigation LCP) entered "pending" Core Web Vitals status. The web.dev Vitals page (last updated 2024-10-31) lists no pending metrics.
- The web-vitals 2026 entries come from the raw CHANGELOG fetched today. I did not cross-check them against npm release pages.
