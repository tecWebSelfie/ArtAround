# UX principles for navigation-loading (route transition) indicators

Scope: when and how a navigation-progress indicator should appear, behave and disappear in a mobile-first web app or PWA (museum-tour PWA on phones, also desktop). Researched 2026-11-28. Older sources are flagged with their dates.

## 1. Response-time thresholds and their implications (delay before showing, minimum display time)

### Takeaway

Classic thresholds (0.1 s feels instant, 1 s keeps flow, 10 s keeps attention) say a fast navigation needs no indicator. Current practice is therefore to delay the indicator by about 100–500 ms and, once it shows, keep it up for a minimum of about 200–400 ms so it never flashes. Turbo, the most widely deployed navigation-progress bar, waits 500 ms by default.

### Cited Findings

- Nielsen (1993, with a 2014 addendum saying the limits are unchanged): 0.1 s is "about the limit for having the user feel that the system is reacting instantaneously"; 1.0 s is "the limit for the user's flow of thought to stay uninterrupted"; 10 s is "the limit for keeping the user's attention focused". Delays of 0.1–1 s need no special feedback, delays over 1 s should show the system is working, and delays over 10 s need percent-done plus a way to interrupt. The 2014 addendum maps the limits to direct manipulation (0.1 s), free navigation (1 s) and attention (10 s). — [NN/g, Response Times: The 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/)
- NN/g, progress indicators (2014, older guidance): "Always give some type of immediate feedback". Use a progress indicator for anything over about 1 s. A looped animation suits 2–10 s and should be avoided under 1 s ("distracts"). Use percent-done for 10 s or more. — [NN/g, Progress Indicators Make a Slow System Less Insufferable](https://www.nngroup.com/articles/progress-indicators/)
- RAIL: complete input-driven transitions within 100 ms, process input within a 50 ms budget, and "always provide feedback" for actions taking longer than 50 ms. 100–1000 ms reads as a continuous progression; beyond 1 s users lose focus; beyond 10 s they get frustrated and may abandon. Subsequent loads should finish within 2 s. Loading-indicator animation must fit the 10 ms frame budget. The page itself says Core Web Vitals is now "the recommended approach for defining performance goals over RAIL", so RAIL is legacy framing. — [web.dev, RAIL](https://web.dev/articles/rail)
- Doherty threshold (Doherty and Thadani, IBM, 1982): about 400 ms system response. Laws of UX recommends feedback within 400 ms and notes that progress bars make waits tolerable even when they are not precise. — [Laws of UX, Doherty Threshold](https://lawsofux.com/doherty-threshold/)
- GitHub Primer: under 1 s, show no loading indicator ("a brief flash can feel distracting and make the product seem slower"). 1–3 s: indeterminate. 3–10 s: determinate if possible. Over 10 s: determinate, ideally as a background task. — [Primer, Loading pattern](https://primer.style/ui-patterns/loading/)
- Queensland Health design system: avoid spinners for near-instant actions and show them after a delay of about 200 ms. NSW and the EU component library put the "no indicator" threshold at about 1 s. — summarized via search from [Queensland Health DS](https://www.design-system.health.qld.gov.au/components/loading-spinner/tabs/overview), [NSW DS loader](https://designsystem.nsw.gov.au/components/loader/index.html), [EU component library](https://ec.europa.eu/component-library/ec/components/spinner/usage/). I did not open these pages directly; verify before quoting.
- Turbo (Hotwire) shows its navigation progress bar only "for pages that take more than 500ms to load", configurable with `Turbo.setProgressBarDelay`. — [Turbo Handbook, Drive](https://turbo.hotwired.dev/handbook/drive)
- Next.js `useLinkStatus` docs: to avoid "an unnecessary flash" on fast navigations, start the pending hint invisible (`opacity: 0`) and add an animation delay of about 100 ms (example: fade in over 200 ms after a 100 ms delay, then pulse with a 1 s cycle). — [Next.js, useLinkStatus](https://nextjs.org/docs/app/api-reference/functions/use-link-status)
- Delay-plus-minimum ("spin-delay") pattern: the `spin-delay` React library defaults to a 500 ms delay and a 200 ms minimum duration. The Epic React Suspense workshop uses about 300 ms delay and about 350 ms minimum. Mozilla's Acorn design system is reported to recommend a 400 ms minimum display and no spinner under 200 ms (page is JS-rendered, so I could not verify it directly). The rationale: with a 300 ms delay and a 400 ms load, the spinner would flash for 100 ms without a minimum. — [spin-delay](https://github.com/smeijer/spin-delay); [Epic React, pending flash](https://www.epicreact.dev/workshops/react-suspense/pending-flash); [Firefox Acorn, Loading indicators](https://acorn.firefox.com/latest/foundations/global-patterns/loading-indicators-SKyqf3Lj)

### Inferences

- Navigation is the "free navigation" (1 s) band, not the 0.1 s band. A global bar is not needed for navigations that finish within a few hundred ms. A **show delay of about 150–300 ms** for a global top bar is consistent with all sources (Next.js 100 ms for an inline hint, Queensland 200 ms, Epic React 300 ms, Turbo 500 ms). Phones in museums often have weak connectivity, so a shorter delay (closer to 150–250 ms) is safer than Turbo's 500 ms.
- Once shown, keep the bar for a **minimum of about 300–400 ms**, including its completion animation, so it reads as intentional rather than a glitch.
- Immediate feedback (under 100 ms) should come from the trigger itself (pressed or pending state), not from the global indicator. See section 4.
- A navigation over 10 s is effectively a failure state on mobile. Pair a long-running indicator with a text message or retry, not just a bar that keeps trickling.

### Gaps

- No primary-source study validates a specific show delay or minimum duration for navigation bars. The figures above are design-system and library conventions.
- The Doherty 1982 paper was not available; only secondary summaries were found.

## 2. Determinate vs indeterminate vs "fake/trickle" progress (perceived speed and honesty)

### Takeaway

Navigation progress is almost never truly measurable, so web top bars (NProgress, Turbo, YouTube-style) are pseudo-determinate. They jump to a small start value, trickle toward but never reach 100%, then snap to 100% and fade on completion. Research shows bar dynamics change perceived duration: speeding up near the end feels faster, and stalling near the end feels slower. That argues for a slow trickle followed by a fast finish, and never a stall at 90%.

### Cited Findings

- Harrison, Amento, Kuznetsov and Bell, "Rethinking the Progress Bar", UIST '07, pp. 115–118: real progress is often non-linear, and an experiment classified bar behaviors that make a process feel faster or slower. Understanding them lets designers build a bar that "appears faster, even though the actual duration remains unchanged". — [chrisharrison.net project page](https://www.chrisharrison.net/index.php/Research/ProgressBars); [Wikipedia, Progress bar](https://en.wikipedia.org/wiki/Progress_bar)
- Reported findings (via secondary summaries; I could not open the PDF, core.ac.uk returned 403): bars "with the fastest progress occurring near the end of the process" were perceived faster than bars "with pauses near the process conclusion". Bars with increasing pulsation were more likely to be perceived as shorter. — summarized in search results referencing [Harrison 2007 PDF](http://chrisharrison.net/projects/progressbars/ProgBarHarrison.pdf) and [UX Movement](https://uxmovement.com/buttons/how-to-make-progress-bars-feel-faster-to-users/)
- Harrison, Yeo and Hudson, "Faster Progress Bars", CHI '10, pp. 1545–1548: visual augmentations change perceived duration. Backwards-moving ribbing was perceived faster than forwards-moving ribbing. — [FIGLAB, Faster Progress Bars](https://www.figlab.com/research/2010/faster-progress-bars); [Wikipedia, Progress bar](https://en.wikipedia.org/wiki/Progress_bar)
- 2022 replication (arXiv 2211.13909, "The Magic of Slow-to-Fast and Constant"): constant and speed-up bars were perceived as faster, and the final part of the bar matters most for time perception. It notes that earlier literature conflicts, with some studies favoring fast-to-slow. — [arXiv 2211.13909](https://web3.arxiv.org/abs/2211.13909)
- NN/g (2014): start percent-done animations slowly and speed up near the end. "Rushing to 90% and then stalling" frustrates users. For surveys the opposite holds (fast-then-slow reduces drop-off). — [NN/g Progress Indicators](https://www.nngroup.com/articles/progress-indicators/)
- Myers (CHI '85): participants with a percent-done indicator reported a more positive experience; it "reduced anxiety and was more efficient" (older guidance, desktop era). — [Wikipedia, Progress bar](https://en.wikipedia.org/wiki/Progress_bar)
- NN/g cites a University of Nebraska-Lincoln study: users who saw a continuously animated progress bar were willing to wait about 3 times longer than users with no indicator. — [NN/g Progress Indicators](https://www.nngroup.com/articles/progress-indicators/)
- NProgress (the reference "trickle" bar): starts at `minimum: 0.08` (8%), easing `ease`, `speed: 200` ms, `trickle: true` auto-increments, `inc()` "never reaches 100%", and `done()` completes it. Default color is `#29d`, and `showSpinner` defaults to true. Recommended wiring: `start()` on navigation click, `done()` on render. — [NProgress README](https://github.com/rstacruz/nprogress)
- Primer: indeterminate for 1–3 s, because determinate indicators "need more time to be read". Determinate works best for processes of about 3 s or longer. — [Primer Loading](https://primer.style/ui-patterns/loading/)
- Carbon: start indeterminate while no progress data exists, then switch to determinate when completion can be calculated. — [Carbon Progress bar usage](https://carbondesignsystem.com/components/progress-bar/usage/)
- Laws of UX: progress bars make waits tolerable "even when they aren't precise". — [Laws of UX, Doherty Threshold](https://lawsofux.com/doherty-threshold/)

### Inferences

- For route transitions, use either a truly indeterminate animation or an NProgress-style trickle that is honest about its nature. It shows that work is ongoing and never claims completion: it decelerates asymptotically (for example toward about 80–90%) and only reaches 100% on real completion. Per Harrison and NN/g, avoid a visible long stall near the end. Keep the trickle slow and make the completion jump fast and decisive (speed-up at the end).
- Honesty: a trickle bar is acceptable because it encodes "still working", not a fake ETA. It becomes misleading if it reaches 100% before content is ready, or keeps trickling forever after an error. On error or timeout, the bar should stop and hand over to an explicit message.
- Use percent-done or determinate only where real data exists, for example offline pre-download of a tour's media in a PWA, not for page navigations.

### Gaps

- I could not read the primary Harrison 2007 PDF. Effect sizes and the exact list of the nine progress functions tested are unverified here.
- No study specifically on thin top-of-page navigation bars (YouTube, GitHub, Medium style) and perceived speed was found.

## 3. Top bar vs spinner vs skeleton vs placeholders: when each applies, combining them, avoiding double indicators

### Takeaway

Guidance converges on a few rules. Skeletons are for full-page or large-area content loads of up to about 10 s. Spinners are for a single module. Progress bars are for long, measurable processes. Show no indicator under about 1 s, and one indicator per area, never one per element. A thin global top bar for the transition, then the destination's skeleton (`loading.js`) once the new route renders, is a reasonable split if the two are sequential, not simultaneous. Evidence that skeletons beat spinners on perceived speed is mixed.

### Cited Findings

- NN/g, Skeleton Screens 101 (2023, reviewed 2026-09): under 1 s, skeletons and spinners are unnecessary, and flashing placeholders frustrate users. Skeletons suit waits under 10 s and **full-page** loads. Spinners suit a single component (a video, a card). Progress bars suit uploads, downloads and conversions. Over 10 s, use a progress bar with a duration estimate. Content-placeholder skeletons are recommended. A "frame-display" skeleton (header, footer, background only) is not recommended: it can look broken, and with a pulsing background it is "essentially equivalent to a spinner". Animated (pulse or shimmer) skeletons "can be distracting or cause accessibility problems". Skeletons don't replace performance work. — [NN/g, Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/)
- Primer: place indicators close to the content they replace and avoid layout shift on load. Replace indicators with content or error feedback as soon as possible. "Avoid showing an indicator for every loading element"; replace a group of adjacent indicators with one. Use interstitial loading screens sparingly (about 3 s or more, major changes). Load incrementally, most important data first. After navigating to a new page, rely on default browser focus. — [Primer Loading](https://primer.style/ui-patterns/loading/)
- NSW and Queensland design systems: one loader or spinner per page. For several loading sections, use one larger loader for the whole section. — [NSW Design System, Loader](https://designsystem.nsw.gov.au/components/loader/index.html) (via search summary)
- Carbon: use the Loading (spinner) component when the process takes under 5 s, and skeleton states when the load reveals expanded information. — [Carbon Progress bar usage](https://carbondesignsystem.com/components/progress-bar/usage/)
- Viget (2017) mobile test, 136 participants: the skeleton performed worst. 59% of skeleton users felt the content loaded quickly vs 74% for the spinner, and estimated waits were 2.82 s vs 2.41 s. The groups were small (39/39/58). Possible reasons: novelty, and skeletons draw attention. — [Viget, A Bone to Pick with Skeleton Screens](https://viget.com/articles/a-bone-to-pick-with-skeleton-screens)
- Mejtoft et al. (ECCE 2018) is reported second-hand as favoring skeletons on perceived speed (not verified). A 2024 Drexel thesis (n=134) found "Looped Animation + Skeleton Screen" most effective at shortening perceived wait. — [AWS Builder Center summary](https://builder.aws.com/content/3M2CqltW6KlyigfOOolCKaohj0D/stop-treating-a-spinner-as-a-default-design-loading-feedback-by-how-long-the-wait-is); [Drexel thesis record](https://researchdiscovery.drexel.edu/esploro/outputs/graduate/991021889414404721)
- Next.js: prefer route-level fallbacks (`loading.js`) and prefetching for instant transitions. `useLinkStatus` is "a quick patch" for slow transitions when prefetch is off or the dynamic route has no `loading.js`. If a route was prefetched, the pending state is skipped. When several links are clicked quickly, only the last link's pending state shows. — [Next.js, useLinkStatus](https://nextjs.org/docs/app/api-reference/functions/use-link-status)

### Inferences

- Recommended layering for the PWA:
  1. Tap: immediate pressed or pending state on the trigger (0 ms).
  2. If the navigation is still pending after the delay: a thin global top bar.
  3. When the destination's `loading.js` or Suspense skeleton renders, finish or hide the top bar. The skeleton now carries "loading". Showing both a trickling bar and a shimmering skeleton is a double indicator.
  4. Within the page, use one skeleton group per region, not per card.
- Avoid a full-screen spinner or interstitial for navigation. It hides context and is the "frame-display" anti-pattern.
- Keep skeleton animation subtle or static, given NN/g's distraction and accessibility note and Viget's attention result.

### Gaps

- No source explicitly prescribes "complete the top bar when the skeleton appears". This is an inference from the one-indicator rule.
- Material Design 3 and Apple HIG pages are JS-rendered and could not be fetched. Their exact wording on navigation and loading is not captured.

## 4. Immediate feedback on the trigger vs a global indicator

### Takeaway

Feedback must be immediate (under about 100 ms, RAIL; "always give some type of immediate feedback", NN/g). The trigger itself (pressed or active style, then a subtle pending hint) is the cheapest way to deliver it and confirms which tap registered. The global bar is a delayed, secondary signal for slow cases.

### Cited Findings

- NN/g: "Always give some type of immediate feedback". Avoid "don't click again" warnings; instead show that the first click was accepted. — [NN/g Progress Indicators](https://www.nngroup.com/articles/progress-indicators/)
- RAIL: respond to input within 100 ms, and always give feedback for actions over 50 ms. — [web.dev RAIL](https://web.dev/articles/rail)
- Next.js `useLinkStatus`: use it for "subtle, inline feedback, for example a shimmer effect over the clicked link". Prefer a fixed-size, always-rendered hint toggled by opacity to avoid layout shift. Its sample hint is `aria-hidden`. — [Next.js useLinkStatus](https://nextjs.org/docs/app/api-reference/functions/use-link-status)
- Primer's loading lifecycle runs initiated, then in progress, then success or failure. On failure, explain what went wrong and offer a next step such as retry. Don't put `aria-disabled` on the button that starts loading. — [Primer Loading](https://primer.style/ui-patterns/loading/)
- Laws of UX and UX Toast: past about 400 ms, a loading state should show the user their action registered. — [Laws of UX](https://lawsofux.com/doherty-threshold/); [UX Toast](https://www.uxtoast.com/ux-laws/doherty-threshold)

### Inferences

- On touch devices, `:active` styles can be short or swallowed during scrolling. A pending state driven by navigation state (for example `useLinkStatus` or a router transition flag) that persists until the navigation commits is more reliable than CSS `:active` alone.
- Combining the trigger pending state with the global bar is fine because they appear at different times: the trigger at once, the bar after the delay. Both should clear on commit.

### Gaps

- No controlled study comparing trigger-local feedback with a global bar for navigation was found.

## 5. Accessibility (WCAG 2.2.2, 2.3.x, 4.1.3, aria-busy, progressbar, live regions, reduced motion, 1.4.11)

### Takeaway

A route change is a change of context, not a WCAG 4.1.3 status message. In a client-side router, though, screen readers often announce nothing, so frameworks add a route announcer (a live region that announces the new page title) and/or move focus. A short top bar usually falls outside 2.2.2 (under 5 s, or an "essential" preload). It should be decorative (`aria-hidden`) or a labelled indeterminate `progressbar`, never a chatty live region. Under reduced motion, keep a subtle, non-sweeping indication rather than removing it. The bar's fill likely needs 3:1 contrast against what is behind it (1.4.11).

### Cited Findings

- WCAG 4.1.3 Status Messages: a status message is a "change in content that is not a change of context". "Going to a new page" is a change of context, so it is outside 4.1.3, since changes of context take focus and AT announces them. Relevant examples: a busy icon announced as "application busy", and a progress bar with intermittent announcements (techniques ARIA22 role=status, ARIA23 role=log, ARIA25 live region for a progress bar). When a "busy" message disappears, a hidden "system available" message can convey it. — [W3C, Understanding 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- WCAG 2.2.2 Pause, Stop, Hide applies to moving content that starts automatically, lasts more than 5 s and is presented in parallel with other content. Note 4: a preload-phase animation "can be considered essential" if users can't interact and the absence of progress would make content seem frozen. A preloader that is the only content on the page is exempt. — [W3C, Understanding 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- WCAG 1.4.11 Non-text Contrast: 3:1 for "parts of graphics required to understand the content", not rounded (2.999:1 fails). The example is status icons without text. The criterion does not explicitly mention progress bars; applying it to a bar's fill is an inference. — [W3C, Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- `aria-busy="true"` tells AT that an element is being modified, so it waits before announcing updates. Set it while several parts of a live region load, then set it to `false`. MDN does not document AT support differences. — [MDN, aria-busy](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy)
- Primer: give indicators an accessible name (visually hidden is fine) and use specific labels. Use one announcement for a group of skeletons. The `role="status"` element must always be in the DOM, even when empty. Set `aria-busy` during partial updates. After navigating to a new page, rely on default browser focus. On reduced motion: "Don't disable animated indicators… keep the animation as subtle as possible". — [Primer Loading](https://primer.style/ui-patterns/loading/)
- Carbon: a progress bar's label must be defined (it may be visually hidden), and references the ARIA `progressbar` role. — [Carbon Progress bar](https://carbondesignsystem.com/components/progress-bar/usage/)
- Material Web `md-linear-progress`: add an `aria-label` (for example "Download progress"). An indeterminate mode exists for unknown durations. — [material-web progress docs](https://github.com/material-components/material-web/blob/main/docs/components/progress.md)
- Gatsby and Fable Tech Labs user testing (Marcy Sutton, 2019) compared focus strategies on client-side route change (live region only, focus wrapper, focus heading with `tabindex="-1"`, and so on). In 2020 Gatsby found NVDA+Firefox and VoiceOver+Safari announced nothing on client-side route changes, and added a persistent live region that receives the new page's text on each route change. React Router's accessibility docs cite this research. — [Gatsby, user testing 2019](https://www.gatsbyjs.com/blog/2019-07-11-user-testing-accessible-client-routing); [Gatsby, 2020 improvements](https://www.gatsbyjs.com/blog/2020-02-10-accessible-client-side-routing-improvements)
- Helsinki accessibility model: screen readers announce the title only on a full page load, so SPA route changes need explicit handling. WCAG does not explicitly require title announcement; it is best practice. — [Helsinki, SPA notes](https://saavutettavuusmalli.hel.fi/toteutus-ja-ohjelmistotestaus/single-page-applications-spas-notes-on-accessibility/)

### Inferences

- The visual top bar should be `aria-hidden` (or a named indeterminate `role="progressbar"` with no value). Navigation outcome is announced by the router's route announcer (Next.js App Router includes one) and focus management, not by the bar. Announcing "Loading…" on every navigation would be noisy. A polite "Loading" status only after a longer wait (for example over 1–2 s), then a "failed, retry" message on error, is a proportionate option.
- Set `aria-busy="true"` on the main content region while the destination streams in (skeleton visible) and clear it on completion.
- Reduced motion (`prefers-reduced-motion: reduce`): replace sweeping or shimmering animation with a static or slowly fading bar, or an opacity pulse. Keep some indication (Primer). The bar rarely exceeds 5 s, so 2.2.2 is mostly moot. A stuck, forever-animating bar after a failure, though, would be moving content beyond 5 s in parallel with other content.
- Flashing (2.3.1, under 3 flashes per second) is not triggered by a smooth bar. Avoid rapid blinking or pulsing faster than 3 Hz.
- Contrast: a 2–3 px brand-primary bar over a header or app-bar must reach 3:1 against the surface it overlaps, in both light and dark themes. In a museum-themed app where the primary color varies per museum, check it per theme.

### Gaps

- No W3C or ARIA APG guidance specific to global navigation progress bars was found. Whether a thin decorative bar is "required to understand content" for 1.4.11 is an interpretation.
- No WCAG 2.3.3 (Animation from Interactions, AAA) text was fetched. Its applicability to loading bars, which are not interaction-triggered motion in the parallax sense, is unverified.

## 6. Visual specs: thickness, color, z-index, completion and fade-out

### Takeaway

Conventions: 2–5 px tall, fixed at the very top of the viewport above all chrome, brand or primary color, start at a small visible value (about 8%), trickle, then on completion snap to 100% quickly (about 200 ms) and fade out. Design systems specify 4 px for component-level linear progress (Material, Carbon small) and 8 px for large Carbon bars. Thin web top bars are typically 2–3 px.

### Cited Findings

- Material Web linear progress: default track height 4 px, active indicator 4 px, square corners, track color `surface-container-highest`. Indeterminate "four-color" mode cycles primary, primary-container, tertiary and tertiary-container. — [material-web progress docs](https://github.com/material-components/material-web/blob/main/docs/components/progress.md)
- Carbon: big 8 px, small 4 px for restricted spaces. States are active (blue), success (green, full width with checkmark), and error (red, stays visible with an inline notification). After completion the bar "either stays visible as confirmation or auto-dismisses". — [Carbon Progress bar usage](https://carbondesignsystem.com/components/progress-bar/usage/)
- Turbo navigation bar: a `<div class="turbo-progress-bar">`, default height 3 px, restylable (the handbook example uses 5 px). Shown after 500 ms. — [Turbo Handbook, Drive](https://turbo.hotwired.dev/handbook/drive); [Rails Designer, Customize the Turbo progress bar](https://railsdesigner.com/turbo-progress-bar)
- NProgress: color `#29d`, start at 8%, 200 ms transition speed, `ease` easing, and an optional spinner (on by default). — [NProgress README](https://github.com/rstacruz/nprogress)

### Inferences

- For the PWA:
  - Height: about 3 px (2–4 px range). On notched phones, position below `env(safe-area-inset-top)` or within the status-bar area of a standalone PWA so it stays visible.
  - Color: museum primary at 3:1 against the surface.
  - `position: fixed; top: 0` with a z-index above the app header and Mantine overlays used during navigation.
  - Completion: quick jump to 100% (about 150–250 ms), then fade out (about 200–300 ms).
  - Disable NProgress's default spinner: it is a second indicator.
  - Errors: stop the bar and show a message instead of a red bar alone (color-only status conflicts with 1.4.1).
- Use transforms (`scaleX`) for movement so the animation stays within RAIL's 10 ms frame budget on low-end phones.

### Gaps

- NProgress's CSS (height 2 px, z-index 1031 in its stylesheet) was not fetched directly in this session. Treat those values as unverified.
- Apple HIG and Material 3 web pages (m3.material.io) could not be rendered. Their guidance on placement under app bars and on show and hide timing is not captured. Material's older (M2) "linear indicator attached to the top app bar" guidance is likewise unverified here.
- No GOV.UK Design System guidance on loading indicators was found. GOV.UK has no spinner component; other government systems were used instead.
