# Navigation loading indicator: placement and flows (mobile-first PWA, applied to ArtAround)

Researched 2026-11-28. Web sources plus a read-only inspection of `/home/user/ArtAround`
(Next.js 16.4.6, React 19.2.6, Mantine 9.6.3). Repo facts cite file paths instead of URLs.

## Placement: top-of-viewport bar vs under the header vs in the tab bar; safe area, standalone PWA, overlays, fullscreen views, RTL

### Takeaway

The established web convention is a thin (about 3px) bar fixed to the very top edge of the viewport, laid over the content. It is the pattern Mantine's `NavigationProgress` ships, and it is already a dependency here. In ArtAround the top edge is the one place that is the same on every surface: phones have no sticky top header (the bottom tab bar is the chrome), desktop has a 56px sticky header, and immersive map/scan/editor views have no site header at all. A bar under a header would therefore jump around, and a bar in the bottom tab bar would be missing from immersive views and desktop. The bar should sit above the safe-area inset top (`top: env(safe-area-inset-top, 0px)`) as forward-proofing only: the app does not currently set `viewport-fit=cover`, so the inset resolves to 0 today.

### Cited Findings

- The pattern is described as "a thin line overlaying the content" sitting "right underneath the browser toolbar", used by Medium (green) and YouTube (red with glow). Sites use it because they swap content with JavaScript, which may not trigger the browser's own indicator, and without one "it may appear that the page is stuck" — [UsabilityPost, 2013](https://usabilitypost.com/2013/08/19/new-ui-pattern-website-loading-bars)
- GitHub shows a loading progress bar at the top of the page on navigation. A third-party write-up says its easing resembles the "Fast Power" curve that users perceive as faster — [Logto blog](https://blog.logto.io/loading-progress-bar-and-how-to-build-it). One third-party gist says GitHub's `turbo-progress-bar` is 3px high (unverified) — [gist](https://gist.github.com/tkrotoff/db8a8106cc93ae797ea968d78ea28047)
- Turbo (Hotwire, the library behind GitHub-style navigation) "installs a CSS-based progress bar to provide feedback while issuing a request". It is a `<div class="turbo-progress-bar">` that "appears automatically for any page that takes longer than 500ms to load", and the delay can be changed with `Turbo.setProgressBarDelay` — [Turbo handbook](https://turbo.hotwired.dev/handbook/drive)
- Mantine `@mantine/nprogress` 9.6.3, read from the installed source:
  - Style: `.m_8f2832ae { position: fixed; top: 0; inset-inline: 0; z-index: var(--nprogress-z-index); transition: opacity 150ms; transition-delay: 50ms }`.
  - The glow pseudo-element is positioned with `inset-inline-end`, so it is RTL-aware.
  - Defaults: `size = 3`, `stepInterval = 500`, `withinPortal = true`, `zIndex = getDefaultZIndex("max")`, `color` defaults to the theme primary.
  - API: `nprogress.start/stop/increment/decrement/set/reset/complete`, and `<NavigationProgress />` mounts "anywhere in your app within MantineProvider".
  - Sources: `node_modules/@mantine/nprogress/styles.css`, `esm/NavigationProgress.mjs`, [Mantine docs](https://mantine.dev/x/nprogress/)
- `@mantine/nprogress` is listed in `package.json` (`^9.6.3`, added in commit `e7b69c9`) but is not imported anywhere in `src/` — repo grep
- iOS standalone PWAs need `viewport-fit=cover` for content to reach under the status bar. Developers pair it with `apple-mobile-web-app-status-bar-style: black-translucent` and pad fixed elements with `env(safe-area-inset-top)` — [Apple Developer Forums](https://developer.apple.com/forums/thread/110854); [itnext guide](https://itnext.io/make-your-pwas-look-handsome-on-ios-fd8fdfcd5777)
- When `viewport-fit` is `contain` (the default), `env(safe-area-inset-*)` is 0 — reported in search summaries of WebKit discussions; not independently verified ([WebKit bug 236445](https://bugs.webkit.org/show_bug.cgi?id=236445))
- An open WebKit bug (REOPENED) reports that in Home Screen web apps on iOS 26.1+, the status bar area stays visible and `env(safe-area-inset-top)` returns 0 instead of about 44pt. Recurrences are reported on 26.5.2 and the iOS 27 betas, with no confirmed workaround — [WebKit bug 301994](https://bugs.webkit.org/show_bug.cgi?id=301994)
- Chrome on Android has an edge-to-edge migration guide covering safe-area insets — [Chrome for Developers](https://developer.chrome.com/docs/css-ui/edge-to-edge) (listed in search results; not read in detail)
- Repo, phone chrome (below md, 62em):
  - There is no sticky top header. The tabs layout's top row (wordmark, LanguageSwitcher, MuseumSwitch; `--tabs-top-row: 3rem`) scrolls with the page.
  - The bottom tab bar is Mantine `AppShellFooter component="nav" hiddenFrom="md"`, fixed, `footer={{ height: 64, offset: true }}`. Pages reserve `--tabs-bottom` = footer offset + `env(safe-area-inset-bottom)` + md spacing.
  - Sources: `src/app/[lng]/(frontend)/layout.tsx`, `src/app/[lng]/(frontend)/(tabs)/layout.tsx`
- Repo, desktop chrome:
  - `SiteHeader` is `visibleFrom="md"`, `position: sticky; top: 0; z-index: 150; height: var(--site-header-height)` (56px from md, 0px otherwise). Its z-index sits "above page content and floating carousels, below Mantine overlays (modals, menus and notifications use 200+)".
  - It returns `null` on IMMERSIVE routes: museum navigation map URLs (except a tour's start page), `museum/[id]/edit/mapeditor`, and `/scan`.
  - Sources: `src/components/navigation/SiteHeader.tsx`, `SiteHeader.module.css`, `globals.css`
- Repo, tour navigation (immersive):
  - It is a full-viewport composition. A `rounded-b-xl` header holds the title, a linear `Progress` bar (the tour's own progress) and a Stepper. The main area is `100dvh` with the map. A footer holds the navigation bar.
  - The header pads `pt-[max(var(--mantine-spacing-xs),env(safe-area-inset-top))]`.
  - Floating controls live at `z-20` with `pointer-events: none`.
  - Contextual modals open as Mantine modals on phones and as a docked right panel on desktop.
  - Sources: `DESIGN.md` (Layout → Tour navigation); `src/app/[lng]/(frontend)/museum/[id]/navigation/NavigationHeader.tsx:60`; `docs/tour-navigation.md`
- Repo, PWA status:
  - `src/app/[lng]/layout.tsx` exports `viewport = { themeColor: '#ffffff', colorScheme: 'light' }` with no `viewportFit`.
  - There is no web manifest (no `app/manifest.ts`, nothing in `public/`; `src/proxy.ts` only excludes a `site.webmanifest` path) and no `appleWebApp` metadata. So the app is not installable as a standalone PWA today, and safe-area-top is 0 in the browser.
- Repo, color scheme: `DESIGN.md` "Follow-the-System Rule" says `defaultColorScheme="auto"`, but `viewport` says `colorScheme: 'light'` with a fixed white `themeColor`. The repo's own docs disagree here. It matters for the bar's contrast against the status-bar color.
- Repo, color source: in museum mode the primary becomes the museum's palette ("The Museum Primary Rule": buttons, links, active tab, focus ring…). It is rendered server-side through `museumTheme(chrome.currentMuseum?.palette)` in the frontend layout, so a primary-colored bar inherits the museum color automatically. Primary foreground on the dark page should use `light-dark(<filled>, primary-4)` — `DESIGN.md`
- Repo, languages: `SUPPORTED_LANGUAGES` are the official EU languages (`i18n.config.ts`). None is RTL, so RTL is not a practical concern today. Mantine's use of `inset-inline` still covers it.
- Repo, motion precedent: `MapLoading` applies its animation via `motion-safe:` so reduced motion keeps the icon still — `DESIGN.md`

### Inferences

- **Recommended placement: viewport top, fixed, over everything, one instance.** Mount `<NavigationProgress />` once in the frontend layout inside `AppMantineProvider`, which is where the museum palette is applied. It then picks up the museum primary. Keep the default `withinPortal` and the `max` z-index so the bar is visible above Mantine modals (200+), the desktop SiteHeader (150) and the tour's `z-20` overlay layer. A navigation started from inside a modal (a tour content modal → open object) is still a page navigation, so the bar above the modal's dimming is right.
- **Why not under the header:**
  - Below md there is no fixed top header. The top row scrolls away, so a bar anchored to it would leave the viewport.
  - On desktop it would need `top: var(--site-header-height)`, but IMMERSIVE routes drop the header and the variable goes to 0. That works, but it adds coupling for no benefit, and it would collide with the tour header's own `Progress` bar, which already means "tour progress". A different semantic placed right next to it would confuse.
- **Why not in the bottom tab bar:** the tab bar is absent on desktop, in tour navigation, on the scan page, on quiz pages (their own footer) and in the editors. A bar there would cover only the tab pages. It is also far from where a search/result tap happens near the top. (No authoritative source compares bottom vs top placement; this is reasoning from the layout.)
- **Exception, the tour map:** the tour header (NavigationHeader) is at the top with its own linear `Progress`. Most step changes there are same-layout `router.replace` URL-state updates whose map survives (see the flows section), so the global bar should normally _not_ fire there. When it does (leaving the map for a page), the top bar sits over the rounded header for the duration only, which is acceptable. Make sure its color/height reads differently from the tour progress: it is thinner, uses the primary color, and has no track.
- **Safe area:** today `top: 0` is correct, because the inset is 0 without `viewport-fit=cover`. If a manifest with `display: standalone` and `viewport-fit=cover` is added later, set `top: env(safe-area-inset-top, 0px)` (custom CSS on the root class or via `className`). Otherwise the bar renders under the iOS status bar/notch, where it is invisible. Given WebKit bug 301994, test on a device and keep the env() fallback at 0.
- **theme-color:** with a white `themeColor` status bar on Android/iOS, a primary-colored 3px bar at the top edge has good contrast. If dark mode follows the system (per DESIGN.md), `themeColor` should become a media-keyed pair, and the bar color should use `light-dark(filled, primary-4)`.
- **Reduced motion:** keep the bar (it carries information) but drop the glow/trickle animation under `prefers-reduced-motion`, consistent with `MapLoading`'s `motion-safe:` approach.
- **Accessibility:** the bar is visual only. Consider `aria-busy` on `#main-content` while pending (Turbo sets `aria-busy` during visits, per its handbook), and do not announce it on every navigation.

### Gaps

- Material 3 and Apple HIG placement rules: the M3 search returned only component API pages, and the HIG page did not render for the fetcher. I found no official M3/HIG text saying "put the navigation progress bar at the top edge / under the app bar". The HIG placement summary I received was the model's paraphrase, not page text, so it is not cited.
- No first-party write-up from YouTube, GitHub, Linear, Vercel or Medium explains their placement. Only third-party descriptions exist.
- Whether `env(safe-area-inset-top)` is 0 under `viewport-fit=contain` comes from search summaries, not a spec quote.

## Which flows warrant a global navigation indicator and which should not

### Takeaway

Show a global bar only for **navigations to a new document state that wait on the server**, and only after a delay (about 300–500 ms, Turbo uses 500 ms) so prefetched/instant ones never flash. Leave hash anchors, same-URL clicks, external/new-tab links, downloads, back/forward restores, background refreshes and in-place mutations to native behavior or local button states. In Next 16 the decisive fact is that **dynamic routes without `loading.tsx` are not prefetched**. This app has no `loading.tsx` at all, so nearly every soft navigation currently waits on the server with no feedback.

### Cited Findings

- NN/g thresholds:
  - "Use a progress indicator for any action that takes longer than about 1.0 second."
  - Looped animation under 1 second is distracting.
  - Looped indicators are for about 2–10 s; percent-done indicators for 10 s or more.
  - "Always give some type of immediate feedback."
  - Source: [NN/g, Progress Indicators Make a Slow System Less Insufferable](https://www.nngroup.com/articles/progress-indicators/)
- Turbo shows its bar only past 500 ms — [Turbo handbook](https://turbo.hotwired.dev/handbook/drive). One user reports that the custom delay was not honored on back-button navigation (the bar appeared immediately) — [Hotwire forum](https://discuss.hotwired.dev/t/progressbardelay-not-working-when-back-press/5420)
- Next 16 prefetching:
  - "Static Route: the full route is prefetched. Dynamic Route: prefetching is skipped, or the route is partially prefetched if `loading.tsx` is present." Waiting for a server response "can give the users the impression that the app is not responding."
  - `loading.tsx` gives "Immediate navigation and visual feedback".
  - On slow networks, prefetch may not finish, so use `useLinkStatus`. "You can use other visual feedback patterns like a progress bar", linking to `vercel/react-transition-progress`.
  - Source: `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md` (also [nextjs.org](https://nextjs.org/docs/app/getting-started/linking-and-navigating))
- `useLinkStatus` returns `pending` "true before history updates, false after". "If the linked route has been prefetched, the pending state will be skipped". With rapid clicks only the last link's pending state is shown. It "must be used within a descendant component of a Link". Use it "as a quick patch… then iterate to fix the root cause with prefetching or a loading.js fallback" — `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md`
- `Link onNavigate` "Only executes during SPA navigation" (not on modified-clicks/new tab, unlike `onClick`) and can `preventDefault()` — `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`. This makes it the correct hook to start a global bar for Link clicks: it automatically excludes new-tab, external and modifier-key clicks.
- `react-transition-progress` (Vercel) tracks React Transitions with `useOptimistic`. `startProgress()` is called inside `startTransition`, and it ships an instrumented `Link` wrapper. The README does not mention back/forward — [GitHub](https://github.com/vercel/react-transition-progress)
- The App Router does not emit router events. Community packages (`nextjs-toploader`, `next-nprogress-bar`) patch clicks/history instead — [DEV, tyuen](https://dev.to/tyuen/nextjs-app-router-navigation-indicator-and-the-delay-after-onclick-5aba); [npm next-nprogress-bar](https://www.npmjs.com/package/next-nprogress-bar). `nextjs-toploader` has a `showForHashAnchor` option (default true) — [README](https://app.unpkg.com/nextjs-toploader@3.8.16/files/README.md). That a flag is needed at all shows that hash links are a known false-positive.
- Back/forward in the App Router restores state from the client cache. `useRouter().bfcacheId` "restor[es] state on browser back/forward", and Next's view-transition guide treats "browser back/forward, `router.refresh()`, Suspense reveals" as a separate class of transitions — `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`, `02-guides/view-transitions.md`
- Hash links: `<Link href="/dashboard#settings">` scrolls to the id — `link.md` (Scrolling to an `id`)

### Inferences (decision table, generic)

| Flow                                                                             | Global bar?                                                                                                       | Why / alternative                                                     |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Link/router.push to a dynamic server route (no loading.tsx, not prefetched)      | **Yes**, after ~300–500 ms                                                                                        | Server round trip with no other feedback                              |
| Same, but destination has `loading.tsx` / prefetched                             | Bar won't appear (delay)                                                                                          | The skeleton is the feedback; the delay avoids a flash                |
| Search-result selection → detail page                                            | **Yes**                                                                                                           | Dynamic page, unpredictable latency                                   |
| Filters/pagination writing the URL with `router.replace` (re-render server list) | Prefer **local** (list dimmed/`aria-busy`, or a small loader in the results header); the global bar is acceptable | The user is still on the same page; feedback belongs near the results |
| Form submit that redirects (login, signup, create, delete)                       | **Button `loading` first**; the bar may follow for the redirect phase                                             | NN/g's immediate feedback is at the point of action                   |
| Locale switch (whole tree re-renders server-side)                                | **Yes**                                                                                                           | Full RSC refetch of every layout                                      |
| Auth login/logout `push` + `refresh`                                             | Button loading + bar                                                                                              | Two server trips                                                      |
| `router.refresh()` after an in-place mutation (save, museum switch)              | **No global bar**; local loading (already exists)                                                                 | Not a navigation; a bar would imply leaving                           |
| Hash/same-page anchors, same-URL clicks                                          | No                                                                                                                | Nothing loads                                                         |
| External links, `target=_blank`, modifier-clicks, downloads                      | No                                                                                                                | The browser owns feedback; `onNavigate` already excludes them         |
| Back/forward (router cache/bfcache restore)                                      | No (or only past the delay if it truly refetches)                                                                 | Usually instant; avoid the Turbo-style immediate flash                |
| Background polling, LiveKit/group events, prefetch                               | No                                                                                                                | Not user-initiated                                                    |
| Instant client state (tabs/drawers/modals with data present, map camera)         | No                                                                                                                | Under 100 ms                                                          |

### Gaps

- I found no published primary write-up from Linear, the Vercel dashboard or the Next.js docs site on their indicator policies. I did not verify their current observable behavior directly in a browser in this session.
- I found no sourced recommendation for a specific delay value beyond Turbo's 500 ms default and NN/g's 1 s threshold. A delay of 200–500 ms is an engineering judgment.

## How production apps do it

### Takeaway

GitHub (Turbo), YouTube and Medium all use a thin top-edge bar for in-app navigations. Turbo's documented rule (only past 500 ms) is the clearest published policy. Next.js itself recommends `loading.tsx` first, `useLinkStatus` for inline hints, and a transition-driven progress bar as an option.

### Cited Findings

- YouTube: a red (later red→pink gradient) thin top bar appears on pushState navigations. Its mechanism is described only in community answers — [UsabilityPost](https://usabilitypost.com/2013/08/19/new-ui-pattern-website-loading-bars); [Latenode forum](https://community.latenode.com/t/how-does-youtube-implement-their-page-transition-effect-with-the-loading-bar/24225)
- Medium: a thin green top bar (2013 observation) — [UsabilityPost](https://usabilitypost.com/2013/08/19/new-ui-pattern-website-loading-bars)
- GitHub: a top-of-page bar on navigation ([Logto blog](https://blog.logto.io/loading-progress-bar-and-how-to-build-it)). Turbo's documented behavior is the 500 ms delay and an overridable `.turbo-progress-bar` ([Turbo](https://turbo.hotwired.dev/handbook/drive))
- Next.js team guidance: prefer `loading.js`; use `useLinkStatus` for slow links; a progress bar is allowed via `vercel/react-transition-progress` — Next 16 bundled docs (see above)

### Inferences

- The convergent industry pattern is: top edge, primary/brand color, 2–3 px, delayed start, trickle, then quick complete and fade. Mantine's `NavigationProgress` defaults (3px, primary, fade 150 ms) match it, so no new library is needed. Wiring is the only work.

### Gaps

- Linear and the Vercel dashboard: no sources found. They are unverified, so the report should not claim specifics about them.

## This repository: flow map and where to apply it

### Takeaway

There are **zero `loading.tsx` files** under `src/app` and no global indicator. A few in-page `<Suspense>` boundaries exist (navigator page, navigation layout, login/signup). Every route reads Payload/cookies server-side, so in Next 16 Link prefetch is skipped and each soft navigation blocks silently until the RSC payload arrives. The global bar belongs in `src/app/[lng]/(frontend)/layout.tsx` inside `AppMantineProvider`. It should start from `Link onNavigate` (or a shared wrapper) and from the client `router.push` call sites listed below, and finish on the pathname/search change. It must not start for the URL-state `router.replace` traffic of tour navigation, search filters or group following.

### Cited Findings (repo)

- **Mount point:** `src/app/[lng]/(frontend)/layout.tsx`. Its tree is MswProvider › AuthProvider › `AppMantineProvider theme={museumTheme(...)}` › Notifications › GroupProvider › ModalsProvider › AppShell (footer 64, header auto/offset false) › skip link › `SiteHeader` › `#main-content`. The root `src/app/[lng]/layout.tsx` holds html/body and `viewport`. The (payload) admin is outside `(frontend)`, so it is unaffected.
- **No loading.tsx / template.tsx anywhere**: `find src/app -name loading.tsx` is empty. Suspense appears in: `(tabs)/navigator/page.tsx` (fallback), `museum/[id]/navigation/layout.tsx`, `(auth)/login` and `signup` (for `useSearchParams`), plus components (MuseumFloorplan, ModelViewer, DiscoverSections, RotatingRail, ExpansionText…).
- **Nothing uses** `useLinkStatus`, `prefetch=`, nprogress, nextjs-toploader, or `cacheComponents`/`staleTimes` (next.config has none). `useTransition` appears only in `ProfileMuseumFilter.tsx` and `TourQuiz.tsx`.
- **Routes (frontend)**:
  - tabs: `/navigator` (home), `/marketplace`
  - search: `/search/tours|contents|objects`
  - details: `/tour/[id]`, `/tour/[id]/quiz`, `/tour/[id]/quiz/result/[token]`, `/tour/plan`, `/tour/new`, `/tour/[id]/edit`, `/content/[id]`, `/content/new`, `/content/[id]/edit`, `/object/[id]`, `/subject/[id]`, `/user/[id]`, `/my-museums`
  - museum: `/museum/[id]` (with `@object` intercepted modal), `/museum/new`, `/museum/[id]/members`, `/museum/[id]/edit/mapeditor`
  - museum navigation: `/museum/[id]/navigation` (free map) and `/museum/[id]/navigation/tour/[tourId]/[stepId]`, each with `@modal` parallel/intercepting slots (content/object/open/catchAll) and `/scan`
  - other: `/scan`, `/room/[code]` (group), `(auth)/login|signup`, `/checkout/success|cancel`, `/stripe-test`
- **App shell links (global bar YES, via Link):**
  - `(tabs)/NavBar.tsx` (bottom tab bar: tab items, profile, sign-in) and the tabs top-row wordmark link to `/navigator`
  - `src/components/navigation/SiteHeader.tsx` (desktop wordmark, tab entries, profile, sign-in)
  - Dynamic destinations include marketplace, navigator, `user/[id]` and login.
- **Client navigations by call site:**
  - **Global bar YES:**
    - `LanguageSwitcher.tsx:61` `router.push` to the same path under another `lng`. This re-renders every layout.
    - `NavigatorPage.tsx:126` search result → `router.push(href)`.
    - `MarketplaceControls.tsx:112,311` `router.push` with query/kind/price/page. This is a new server list; the bar is acceptable, or a local results-busy state.
    - `use-plan-visit.ts:176` push to the planned tour.
    - `JoinGroupForm.tsx:63` push to the room.
    - `QrScanPage.tsx:30,46,56` `router.replace` after a scan to a different page/map.
    - `BackButton.tsx:60` `router.back()` (cache restore: usually instant, so only past the delay).
  - **Button loading already exists, bar optional for the redirect phase:**
    - `LoginForm.tsx:61-62` and `SignupForm.tsx:102-103` (`push(returnTo)` + `refresh()`, Button `loading`)
    - `SignOutButton.tsx:30-31` (push navigator + refresh, `loading={pending}`)
    - `DeleteDocumentButton.tsx:40-41` (push + refresh)
    - `TourForm.tsx:348,411` (push after save/cancel); `MuseumCreateForm`, `ContentForm` (router usage)
  - **Global bar NO (in-place or URL-state):**
    - `MuseumSwitch.tsx:73` `router.refresh()` after `setMuseumMode`. The row loader already exists. The tabs layout remounts by museum key.
    - `editing/saving.ts:55` `router.refresh()` after save. FormActions Save shows `loading`, then notifications (DESIGN.md).
    - `SearchShell.tsx:80,89` debounced (400 ms) `router.replace(..., {scroll:false})` for filters and pagination on `/search/*`. Use local results feedback instead.
    - `ProfileMuseumFilter.tsx` (`useTransition` pending). This is already local.
    - `TourQuiz.tsx` (`useTransition` submit). This is a local step flow.
    - `TourForm.tsx:479` `router.replace` editor URL state.
    - **Tour navigation**: `navigation-commands.ts:159-160` (`router.replace` for URL state such as `at`/`to`/step, `router.push` for modals), `use-tour-navigation.ts:343`, `TourProgress.tsx`, `NavigationModal.tsx`, `StepModal.tsx`, `RemovedStopsModal.tsx`, `NavigationObjectActions.tsx`. The museum navigation layout owns `TourNavigationShell`, "so the map survives modal, step and tour transitions" (`docs/tour-navigation.md`). These are same-layout, high-frequency changes with their own UI (stepper, map, modal). A top bar on every step would be noise; a modal opening deserves at most an in-modal loader.
    - **Group following**: `GroupConnection.tsx:267` `router.replace(followHref(...))` when the host moves. This is not user-initiated. Use no bar (or a group-specific notice).
    - `TranslationPending.tsx`, `ContentVersion`/`ContentExpansion`/`ExpansionText` (`router.refresh`/replace for translation/expansion state). This is in-place, and translations already render `TranslationPending`.
    - `MuseumModeOffer.tsx` (switch then refresh). This is in-place.
- **Server `redirect()` (18 call sites):** login/signup when already signed in; content edit → content; mapeditor guard; members guard; navigation interceptors redirecting canonical → contextual URLs; the scan → map redirects; `tour/[tourId]/layout.tsx` guard redirects; `tour/new?copy`; `tour/[id]/edit` → copy. These happen within one soft navigation (the redirect is folded into the RSC response), so the bar started by the click spans them naturally. The finish condition must tolerate the final URL differing from the clicked href (end on any pathname change, or on transition end, not on an exact match).
- **Middleware redirects:** `src/proxy.ts` sets the museum cookie from `?museum=` and redirects. `next.config` redirects `/` and `/:lng` → `/:lng/navigator`. The `tour/[id]/navigation/[[...rest]]/route.ts` route answers 308. These are typically first loads, where the browser's own indicator applies.
- **Immersive surfaces (no SiteHeader):** the museum navigation map, the mapeditor, and `/scan`. `MapLoading` covers the 3D load inside the page (DESIGN.md), so the global bar should end once the route commits, not wait for the 3D scene.
- **Focused task pages:** quiz and results use their own fixed 64px footer with one forward action, and a sticky in-column header at `var(--site-header-height, 0px)` — `DESIGN.md`

### Inferences

- **Implementation shape (for the report writer, not code):**
  1. Mount `<NavigationProgress />` (Mantine, already a dependency) once in the frontend layout inside `AppMantineProvider`. Import `@mantine/nprogress/styles.css` after the core styles.
  2. Use a tiny client controller that starts `nprogress` after about 300–500 ms from a pending signal, and calls `complete()` when `usePathname()`/`useSearchParams()` change or the transition ends.
  3. Sources of the pending signal: (a) `Link onNavigate` in the shell's links, or a shared `AppLink` wrapper (`onNavigate` already excludes new-tab/external/modifier clicks); (b) an opt-in helper wrapping `router.push` in `startTransition` for the YES call sites above. This is the `react-transition-progress` model, which fits React 19 transitions and gives a reliable end signal.
  4. URL-state `router.replace` calls stay outside the helper by default, so tour navigation, search filters and group following never trigger it.
- **Hash links and same-URL:** skip when the target pathname+search equals the current one (hash-only difference), mirroring `nextjs-toploader`'s `showForHashAnchor` concern.
- **Complements, not replacements:** adding `loading.tsx` skeletons to the slowest dynamic routes (tour/content/object/museum details, marketplace, search pages) would make Next prefetch their shells and render instantly, per the Next docs. The bar then shows only on slow networks, which is the ideal division of labour. `useLinkStatus` fits tab-bar items as an inline per-tab pending hint (the active-tab underline/icon dims), which suits the bottom tab bar on phones where the top edge is far from the thumb.
- **Museum mode:** using the default `color` (theme primary) makes the bar the museum's color automatically, consistent with the Museum Primary Rule. Do not hard-code blue or the tour gradient (DESIGN.md's Scoped Playfulness Rule keeps gradients off navigation elements).
- **Interaction with the tour header Progress:** the tour header already has a linear `Progress` (tour completion). The global bar should not trigger for in-tour step/modal changes. If it shows when leaving the map, it overlays the top edge briefly, which is acceptable.

### Gaps

- I did not measure real navigation latencies (no running server in this research). Which routes actually exceed about 500 ms is unknown. A trace on a throttled phone profile would decide where `loading.tsx` is worth adding.
- I did not verify how Next 16.4's router behaves for `router.back()` with partially cached dynamic segments (whether it refetches), so the "back = usually instant" claim for this app is an inference.
- The repo docs conflict on color scheme (DESIGN.md says auto, `viewport` says light-only). The maintainer should settle it before choosing the bar's dark-mode color and `themeColor`.
