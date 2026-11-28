# Navigation progress bar: @mantine/nprogress 9.6.3 + Next.js 16.4.6 App Router (React 19.2.6)

Verified against installed packages: `@mantine/nprogress` 9.6.3, `@mantine/core` 9.6.3, `@mantine/store` 9.6.3, `next` 16.4.6, `react` 19.2.6 (repo `package.json`). Local paths below are relative to `/home/user/ArtAround/`. Community library sources were read from the npm tarballs (`react-transition-progress` 0.0.4, `nextjs-toploader` 3.9.17, `@bprogress/next` 3.2.12).

## 1. @mantine/nprogress v9 API (component, store, styles, a11y, reduced motion)

### Takeaway

`@mantine/nprogress` 9.6.3 is a thin imperative store (`nprogress.start/complete/...`) plus a `NavigationProgress` component that renders a Mantine `Progress` fixed at the top; it has no notion of routing, an always-in-DOM `role="progressbar"`, and no reduced-motion handling of its own. It is already a dependency of the repo but not used or styled yet.

### Cited Findings

- Already installed: `"@mantine/nprogress": "^9.6.3"` in `package.json`, resolved 9.6.3; no file in `src/` references `nprogress` and `globals.css` does not import its styles — [package.json](file:///home/user/ArtAround/package.json), [globals.css](<file:///home/user/ArtAround/src/app/[lng]/(frontend)/globals.css>)
- `NavigationProgressProps extends ElementProps<'div'>`: `store?: NprogressStore`, `initialProgress?: number` (default 0), `color?: MantineColor` (default `theme.primaryColor`), `size?: number` (height px; runtime default 3), `stepInterval?: number` (default 500 ms), `withinPortal?: boolean` (default true), `portalProps?: Omit<BasePortalProps,'withinPortal'>`, `zIndex?` (default `getDefaultZIndex('max')` = 9999) — [lib/NavigationProgress.d.ts](file:///home/user/ArtAround/node_modules/@mantine/nprogress/lib/NavigationProgress.d.ts), [esm/NavigationProgress.mjs](file:///home/user/ArtAround/node_modules/@mantine/nprogress/esm/NavigationProgress.mjs)
- Rendering: `OptionalPortal > Progress radius=0 value={state.progress} data-mounted={state.mounted || undefined}`, z-index via CSS var `--nprogress-z-index`; remaining props (`...others`, e.g. `aria-label`, `className`) are forwarded to `Progress`. On unmount it calls `resetNavigationProgressAction(store)` — [esm/NavigationProgress.mjs](file:///home/user/ArtAround/node_modules/@mantine/nprogress/esm/NavigationProgress.mjs)
- `store.initialize({... stepInterval ...})` runs on render but the Mantine store's `initialize` only applies the first time (`if (!initialized)`), so changing `stepInterval`/`initialProgress` props after first mount has no effect on the shared store — [@mantine/store esm](file:///home/user/ArtAround/node_modules/.pnpm/@mantine+store@9.6.3_react@19.2.6/node_modules/@mantine/store/esm/store.mjs)
- Store uses `useSyncExternalStore` (server snapshot = module state), so it is SSR-safe — same source.
- Store API (default singleton): `nprogress.{start, stop, reset, set(value), increment, decrement, complete, cleanup}`, aliases `startNavigationProgress`, `completeNavigationProgress`, etc., `nprogressStore`, `useNprogress(store)`, and `createNprogress()` → `[store, actions]` for isolated bars (pass `store` to `<NavigationProgress store={store}/>`). Low-level `*Action(store)` functions and `createNprogressStore` are also exported — [lib/nprogress.store.d.ts](file:///home/user/ArtAround/node_modules/@mantine/nprogress/lib/nprogress.store.d.ts)
- Semantics from source ([esm/nprogress.store.mjs](file:///home/user/ArtAround/node_modules/@mantine/nprogress/esm/nprogress.store.mjs)):
  - `start()`: sets `mounted: true`, bumps progress once, then a `setInterval` every `stepInterval` with trickle increments (+10 below 20%, +4 to 50%, +2 to 80%, +1 to 99%, then 0 — never reaches 100 by itself). Calling `start()` again clears the previous interval (idempotent-ish, but it also bumps progress).
  - `complete()`: `cleanup()` (clears interval and timeouts), sets progress 100, after 50 ms `mounted: false`, after `stepInterval + 50` ms progress 0. NB: `cleanup` clears `interval` via `clearInterval` but does not reset `interval` to -1.
  - `reset()`: cleanup + stop + `progress: 0, mounted: false` (hides immediately without the 100% flourish).
  - `stop()`: clears the interval only (bar stays visible at current value).
  - `set(v)`: clamps 0–100 and sets `mounted: true`. `increment()` that reaches 0/100 schedules a reset.
- Accessibility: `NavigationProgress` uses single-section `Progress`; `ProgressSection` defaults `withAria: true` and renders `role="progressbar" aria-valuemin=0 aria-valuemax=100 aria-valuenow={value} aria-valuetext="{value}%"`; `Progress` moves its `aria-label` prop onto that section. The root is always rendered (hidden with `opacity: 0` when not `[data-mounted]`), so a `progressbar` with `aria-valuenow=0` is permanently in the accessibility tree — [Progress.mjs](file:///home/user/ArtAround/node_modules/@mantine/core/esm/components/Progress/Progress.mjs), [ProgressSection.mjs](file:///home/user/ArtAround/node_modules/@mantine/core/esm/components/Progress/ProgressSection/ProgressSection.mjs)
- Styles: `styles.css` and `styles.layer.css` (wrapped in `@layer mantine`). Root `.m_8f2832ae`: `position: fixed; top: 0; inset-inline: 0; opacity: 0; transition: opacity 150ms ease 50ms`, `[data-mounted]` → `opacity: 1`. Section `.m_7a0fe999`: `transition: width 150ms ease` plus a `::before` glow (box-shadow in `--progress-section-color`) — [styles.css](file:///home/user/ArtAround/node_modules/@mantine/nprogress/styles.css)
- Mantine docs: import nprogress styles after core styles; render `NavigationProgress` anywhere inside `MantineProvider`; functions shown are start/stop/increment/decrement/set/reset/complete. Docs page has no a11y notes and no `createNprogress` example — [mantine.dev/x/nprogress](https://mantine.dev/x/nprogress/)
- Reduced motion: Mantine core only disables transitions under `@media (prefers-reduced-motion: reduce) { [data-respect-reduced-motion] [data-reduce-motion] {transition:none; animation:none} }`; neither `NavigationProgress` nor `ProgressSection` sets `data-reduce-motion`, so the app's `respectReducedMotion: true` (src/theme.ts) does not affect the bar's width/opacity transitions — [core/styles.css](file:///home/user/ArtAround/node_modules/@mantine/core/styles.css), [src/theme.ts](file:///home/user/ArtAround/src/theme.ts)

### Inferences

- In this repo, add `@import '@mantine/nprogress/styles.layer.css';` to `src/app/[lng]/(frontend)/globals.css` after `@mantine/core/styles.layer.css` (all Mantine imports there use the `.layer` variant and the `mantine` layer is already declared).
- For a11y, pass a translated `aria-label` (e.g. `t('Loading page')`) and hide the idle bar from AT: read `useNprogress(nprogressStore).mounted` and pass `aria-hidden={!mounted}` (forwarded to the Progress root). Optionally pair with a visually hidden `aria-live="polite"` status only for long loads; announcing every navigation is noisy.
- For reduced motion, add a rule targeting the stable Mantine class names (e.g. `.mantine-Progress-section` inside the bar via a `className` on `NavigationProgress`) under `motion-reduce:`/`@media (prefers-reduced-motion: reduce)` to drop the width transition and glow; the opacity fade is fine.
- Use `color="museum"` (or omit: default is `theme.primaryColor`, which museum mode swaps) so the bar follows The Museum Primary Rule.

### Gaps

- Mantine v9 docs did not document `createNprogress` or accessibility; behaviour above comes from source only.

## 2. Detecting navigation start/end in Next.js 16 App Router

### Takeaway

There are no router events. Every App Router navigation (Link, `router.push/replace`, back/forward, server-action `redirect`) runs inside a React `startTransition`; the precise "pending" signal is therefore transition state: `useLinkStatus()` for Links and an own `startTransition` (with `useTransition`/`useOptimistic`) around `router.push`. `usePathname`/`useSearchParams` changes are the documented coarse "page changed" signal.

### Cited Findings

- `router.events` "has been replaced": listen for page changes by composing `usePathname` + `useSearchParams` in a client component (wrapped in `<Suspense>` because `useSearchParams` bails out of prerendering) — [use-router.md](file:///home/user/ArtAround/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md)
- `router.push(href, { scroll, transitionTypes })`/`replace(...)`; `transitionTypes` are passed to `React.addTransitionType` "inside the navigation Transition"; `router.back/forward` are plain `window.history.back/forward` — [use-router.md](file:///home/user/ArtAround/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md), [app-router-instance.js](file:///home/user/ArtAround/node_modules/next/dist/client/components/app-router-instance.js)
- Source: "The navigator owns the startTransition for its operations"; `navigate`, `traverse`, `restore`, `refresh` each call `React.startTransition`; the action queue sets state to a deferred promise inside `startTransition`, which resolves when the navigation finishes (restore/popstate is handled synchronously) — [navigator.js](file:///home/user/ArtAround/node_modules/next/dist/client/components/navigator.js), [sequential-router-queue.js](file:///home/user/ArtAround/node_modules/next/dist/client/components/sequential-router-queue.js), [app-router-instance.js](file:///home/user/ArtAround/node_modules/next/dist/client/components/app-router-instance.js)
- `<Link onNavigate={(e) => …}>`: called only during client-side SPA navigation, can `e.preventDefault()` to cancel; not called for modifier-key clicks (Ctrl/Cmd/Shift/Alt, middle click, `target` ≠ `_self`), external URLs, or `download` links — [link.md](file:///home/user/ArtAround/node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md); confirmed in `linkClicked()` which checks `isModifiedEvent`, `download`, `isLocalURL`, then calls `onNavigate` synchronously before `navigate(...)` — [app-dir/link.js](file:///home/user/ArtAround/node_modules/next/dist/client/app-dir/link.js)
- `useLinkStatus()` (`next/link`, since v15.3) returns `{ pending }`: "`true` before history updates, `false` after"; must be used in a descendant of `<Link>`; most useful with `prefetch={false}`; "If the linked route has been prefetched, the pending state will be skipped"; with quick successive clicks "only the last link's pending state is shown" — [use-link-status.md](file:///home/user/ArtAround/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md)
- Implementation: each Link holds `useOptimistic(IDLE_LINK_STATUS)`; `setLinkForCurrentNavigation` sets previous link idle and the clicked link `PENDING` inside the navigation `startTransition`, so pending lasts exactly as long as the navigation transition — [links.js](file:///home/user/ArtAround/node_modules/next/dist/client/components/links.js), [app-dir/link.js](file:///home/user/ArtAround/node_modules/next/dist/client/app-dir/link.js)
- Docs recommend debouncing the pending UI with an initial ~100 ms delay to avoid flashes on fast navigation, and point to a progress-bar example: vercel/react-transition-progress — [use-link-status.md](file:///home/user/ArtAround/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md), [linking-and-navigating.md](file:///home/user/ArtAround/node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md)
- Programmatic pattern in the docs: a component calls `changeAction` (which does `router.push`) inside `startTransition(async () => { setIsPending(true) /* useOptimistic(false) */; await changeAction(v) })`; "the board dims while the filtered data loads, then updates" — i.e. the optimistic pending flag stays true until the router navigation completes — [interactive-apps.md](file:///home/user/ArtAround/node_modules/next/dist/docs/01-app/02-guides/interactive-apps.md)
- `loading.js`: fallback is prefetched, "making navigation immediate unless prefetching hasn't completed"; dynamic routes without `loading.tsx` make the client wait for the server response ("impression that the app is not responding") — [loading.md](file:///home/user/ArtAround/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md), [linking-and-navigating.md](file:///home/user/ArtAround/node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md)
- On slow networks prefetch may not finish before the click, so even `loading.js` fallbacks may not appear immediately; `useLinkStatus` is suggested for immediate feedback — [linking-and-navigating.md](file:///home/user/ArtAround/node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md)
- Native `history.pushState/replaceState` calls are integrated into the router (`usePathname`/`useSearchParams` update) without any server fetch — same source.
- Server actions: "In a Server Action, `redirect` performs a client-side navigation when JavaScript is available" and defaults to `push` there — [redirect.md](file:///home/user/ArtAround/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md)
- Repo context: 0 `loading.tsx` files under `src/app`; 30 files import `next/link`, 27 use Mantine `component={Link}`, 36 files call `useRouter()`, 48 `router.push/replace` call sites; `typedRoutes: true` (links typed with `Route`, e.g. `SeeAllLink`); no custom Link wrapper exists — repo grep of [src/](file:///home/user/ArtAround/src), [next.config](file:///home/user/ArtAround/next.config.ts)

### Inferences

- Because the repo has no `loading.tsx`, Link navigations to dynamic pages block until the RSC payload arrives — exactly the case where a global bar helps, and where `useLinkStatus` pending is not skipped.
- `onNavigate` is a reliable _start_ signal (already filters modifiers/download/external), but it cannot wrap the navigation in your own transition (it runs synchronously before Next's `startTransition`), so it gives no end signal by itself.
- `useLinkStatus` gives both start and end for Links; a prefetched static route that commits synchronously never flips to pending, which is the desired "no flash" behaviour.
- For `router.push`, `const [isPending, startTransition] = useTransition(); startTransition(() => router.push(href))` yields `isPending` that covers the navigation (Next's inner transition with a pending promise is entangled with the outer one); the docs' `useOptimistic` variant is equivalent and works from a shared hook.
- Server-action `redirect` navigations are covered by the action's own pending state (`useActionState`/`useFormStatus`/`useTransition` around the action), so the same `useTransition` wrapper can drive the bar.
- Back/forward (`popstate` → `restore`/`traverse`) is usually served from the client cache; a bar there is optional.

### Gaps

- No official doc states explicitly that an outer `useTransition` `isPending` stays true through `router.push`'s server fetch; it is inferred from the docs' ChipGroup example and the source (deferred promise set in a transition). Verify with the e2e test below.
- `experimental.concurrentRouterQueue` swaps in a different queue implementation; not checked (the repo does not appear to enable it).

## 3. Community patterns and their pitfalls

### Takeaway

Libraries detect start by a global `click` listener on `<a>` (toploader, bprogress) or a wrapped Link/`router.push` inside `startTransition` (react-transition-progress); they detect completion by patching `history.pushState/replaceState` (toploader) or by `usePathname`/`useSearchParams` changes (bprogress), or by transition end via `useOptimistic` (react-transition-progress). Only the transition-based approach completes correctly on cancelled/same-URL navigations without heuristics.

### Cited Findings

- **react-transition-progress 0.0.4 (Vercel)**: `useProgressInternal` keeps `const [loading, setLoading] = useOptimistic(false)`; `startProgress()` must be called inside a transition; the bar hides automatically when the transition ends. Its `next` `Link` wrapper `onClick`: skips modified events (`isModifiedEvent` copied from Next), `e.preventDefault()`, then `startTransition(() => { startProgress(); router.push/replace(url, { scroll }) })`. It depends on framer-motion and does not check `download` or external URLs — npm tarball [react-transition-progress](https://www.npmjs.com/package/react-transition-progress), [GitHub](https://github.com/vercel/react-transition-progress)
- **nextjs-toploader 3.9.17**: `document.addEventListener('click')`, finds the closest `<a>`; for same URL, `target` attribute set, `tel:/mailto:/sms:/blob:/download:` schemes, hash-anchor-of-current-URL, Ctrl/Meta/Shift/Alt, or non-http hrefs it does `start(); done()` (flash) instead of start; completion by monkey-patching `window.history.pushState`/`replaceState` to call `done()`, plus `popstate` → `done()` and `pagehide` → `done()`. Programmatic navigation needs its own `useRouter` from `nextjs-toploader/app`; prop `showForHashAnchor` (default true) — npm tarball [nextjs-toploader](https://www.npmjs.com/package/nextjs-toploader), [GitHub README](https://github.com/TheSGJ/nextjs-toploader)
- **@bprogress/next 3.2.12** (successor of next-nprogress-bar): `AppProgress` calls `useAnchorProgress(props, [pathname, searchParams])` — anchor clicks start, a pathname/searchParams change stops; its `useRouter` wrapper starts the bar with optional `delay`, and for a same URL stops after the delay (`disableSameURL` skips it); options `delay`, `stopDelay`, `startPosition`, `shallowRouting`, `i18nPath`, `basePath` — npm tarball [@bprogress/next](https://www.npmjs.com/package/@bprogress/next), [GitHub](https://github.com/imskyleen/bprogress)
- Reported issues: users fix a never-finishing toploader on `router.push` by switching to its `useRouter`; a changelog entry mentions preventing the loader from getting stuck on hash-URL anchor navigation — [search summary of nextjs-toploader sources](https://socket.dev/npm/package/nextjs-toploader), [dev.to](https://dev.to/sabbir_zz/how-to-add-router-progress-bar-in-next-js-13-3do6) (secondary sources; not independently verified)
- Mantine's own v5/v6 docs showed a Pages Router `RouterTransition` using `router.events`; a Mantine issue reports an App Router `usePathname` attempt failing at build because of a missing Suspense boundary — [v6.mantine.dev/others/nprogress](https://v6.mantine.dev/others/nprogress/), [mantine#4927](https://www.github.com/mantinedev/mantine/issues/4927)

### Inferences

Pitfalls to design against (from the above):

- Click-capture approaches must replicate Next's own filters (modifiers, middle click, `target`, `download`, external, `mailto:` etc.); `onNavigate`/`useLinkStatus` get these for free.
- Completion keyed on URL change never fires for: same-URL clicks, `onNavigate` `preventDefault`, a newer navigation superseding, navigation errors (error boundary / hard reload), `notFound` on the same path; hence the need for a safety timeout.
- History patching is fragile (other code calls pushState, e.g. Next's native-history integration or the app's own `replaceState`), and is global mutable state; avoid it.
- Programmatic navigation is invisible to click capture: every library needs a router wrapper.
- `useSearchParams` in a layout-level listener needs a `<Suspense>` boundary.
- Unmounting sources: if the clicked Link unmounts mid-navigation (Drawer/menu closing on click), a `useLinkStatus`-based reporter unmounts with it; its cleanup must not end the bar prematurely.

### Gaps

- next-view-transitions was not inspected (it targets View Transitions, not progress); Next 16's `transitionTypes` + React `<ViewTransition>` cover that space natively.
- GitHub source/issues could not be read directly (GitHub API access not enabled in this session); library internals come from published npm builds.

## 4. Recommended design for ArtAround

### Takeaway

Mount one Mantine `NavigationProgress` in the frontend layout and drive it from a tiny controller module with a ~150 ms show delay, a counter of active navigations and a safety timeout; feed it from transition state (`useLinkStatus` inside a `Link` wrapper, `useTransition` around `router.push`) and use pathname/search changes only as a fallback completer.

### Cited Findings

- Frontend layout (server component) renders `AppMantineProvider` → `Notifications` → `GroupProvider` → `ModalsProvider` → `AppShell`; client-only providers go inside `AppMantineProvider` — [layout.tsx](<file:///home/user/ArtAround/src/app/[lng]/(frontend)/layout.tsx>), [AppMantineProvider.tsx](file:///home/user/ArtAround/src/components/mantine/AppMantineProvider.tsx)
- AGENTS.md: comment every edit, grep for existing helpers first, Mantine first, Tailwind variants, i18n keys in `en`/`it`, regression tests via `page.route` — [AGENTS.md](file:///home/user/ArtAround/AGENTS.md)

### Inferences (proposed design, not yet implemented)

1. **Controller** `src/lib/navigation-progress.ts` (client): `begin(): () => void` returns an `end` token; keeps `active` count; first `begin` schedules `nprogress.start()` after `SHOW_DELAY_MS = 150`; last `end` clears the timer and calls `nprogress.complete()` if shown (else nothing, so fast navigations never flash); each `begin` also arms a safety timeout (~10–15 s) that force-ends; `end` tokens are idempotent.
2. **Bar** `src/components/navigation/NavigationProgressBar.tsx` (`'use client'`): `<NavigationProgress color="museum" size={3} aria-label={t('Loading page')} aria-hidden={!mounted} />` (`mounted` from `useNprogress(nprogressStore)`), plus a `<Suspense fallback={null}>` child that watches `usePathname()`/`useSearchParams()` and, on change, calls a `settle()` that ends any orphaned navigations (fallback for unmounted reporters). Render it right after `<Notifications />` in the frontend layout.
3. **Links**: a `ProgressLink` (typed `LinkProps<Route>` passthrough of `next/link`) that renders `{children}<LinkPendingReporter/>`, where the reporter does `const { pending } = useLinkStatus(); useEffect(() => pending ? begin-and-store-token : end(), [pending])`; on unmount while pending, leave the token to the pathname fallback/safety timeout instead of ending. Usable with Mantine's `component={ProgressLink}`. Alternative with less coupling: `onNavigate={() => begin()}` + pathname fallback + timeout (no exact end on same-URL/cancelled navigations).
4. **Programmatic**: `useProgressRouter()` returning `{...router, push, replace}` where `push = (href, opts) => startTransition(() => router.push(href, opts))` and an effect maps `isPending` → `begin/end`. Server actions with `redirect()` can reuse the same hook's `startTransition`.
5. Skip back/forward (served from cache); optionally `begin` on `popstate` with pathname fallback completion.
6. Styles: `@import '@mantine/nprogress/styles.layer.css'` after core in `globals.css`; reduced-motion rule as in §1; z-index default 9999 sits above AppShell header — keep it, or lower below Mantine modals only if it should be hidden by them.

### Gaps

- Whether to replace all 30 `next/link` imports / 27 `component={Link}` usages with `ProgressLink` versus a global approach is a product decision; a global click-capture would avoid touching call sites but brings the pitfalls of §3.

## 5. Testing approach

### Takeaway

Unit-test the controller with Vitest fake timers (delay, nesting, safety timeout) and the hooks with Testing Library in a jsdom spec; e2e-test with Playwright by delaying only the non-prefetch RSC request for a target page and asserting the bar's `data-mounted` appears then disappears.

### Cited Findings

- Vitest int config uses `environment: 'node'`; "A DOM spec opts in with `@vitest-environment jsdom`"; specs live in `tests/int/**/*.int.spec.{ts,tsx}`; `@testing-library/react` 16.3.0, vitest 4.0.18, `@playwright/test` 1.63.0 — [vitest.int.config.mts](file:///home/user/ArtAround/vitest.int.config.mts), [package.json](file:///home/user/ArtAround/package.json)
- Existing e2e specs already use `page.route(...)` to intercept requests (e.g. `tests/e2e/mapeditor.e2e.spec.ts`) — [mapeditor.e2e.spec.ts](file:///home/user/ArtAround/tests/e2e/mapeditor.e2e.spec.ts)
- Next request headers: `RSC_HEADER = 'rsc'`, `NEXT_ROUTER_PREFETCH_HEADER = 'next-router-prefetch'`, `NEXT_ROUTER_SEGMENT_PREFETCH_HEADER = 'next-router-segment-prefetch'`, cache-busting query `_rsc` — [app-router-headers.js](file:///home/user/ArtAround/node_modules/next/dist/client/components/app-router-headers.js)
- The bar's root carries `data-mounted` only while visible; the `progressbar` role is always present with `aria-valuenow` — [esm/NavigationProgress.mjs](file:///home/user/ArtAround/node_modules/@mantine/nprogress/esm/NavigationProgress.mjs), [ProgressSection.mjs](file:///home/user/ArtAround/node_modules/@mantine/core/esm/components/Progress/ProgressSection/ProgressSection.mjs)

### Inferences

- Unit (jsdom, `vi.useFakeTimers()`): `begin(); advance(100)` → store `mounted` false; `advance(60)` → true; `end()` → progress 100 then `mounted` false after 50 ms; two overlapping begins need two ends; safety timeout completes a forgotten begin; fast `begin/end` < 150 ms never mounts. Hook: `vi.mock('next/link', …useLinkStatus)` / `vi.mock('next/navigation', …useRouter)` with a `push` that returns, and `renderHook`, or render `<NavigationProgress/>` inside `MantineProvider` and assert `getByRole('progressbar', { hidden: true })` `aria-valuenow`.
- E2E: `await page.route('**/<target-path>*', async (r) => { const h = r.request().headers(); if (h['rsc'] && !h['next-router-prefetch'] && !h['next-router-segment-prefetch']) { await new Promise(res => setTimeout(res, 1500)) } await r.continue() })`; click the link; `await expect(page.locator('.mantine-Progress-root[data-mounted]')).toBeVisible()` (or a `data-testid` on the bar); then `await expect(...).toBeHidden()` and the URL/heading updated. Add negative cases: Ctrl+click / `target=_blank` never shows the bar; an instant navigation (no delay) never mounts it (sample `data-mounted` with `page.waitForFunction` polling or a MutationObserver flag). Run with `-g "<test>" --trace off` against the running dev server per AGENTS.md; CI runs on the production build where prefetching is active, so the prefetch-header filter matters.

### Gaps

- Whether Turbopack dev prefetches (affecting which requests carry `next-router-prefetch`) was not verified; the header filter makes the test robust either way.
