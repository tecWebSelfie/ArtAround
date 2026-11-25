# Native and lightweight ways to write a staggered looping SVG loader, and when to use CSS vs Motion vs Lottie/Rive (late 2026)

Context: lucide "Landmark" inline SVG, four columns scaleY 0→1 staggered 0.12s via `nth-of-type`, pediment with its own keyframes, 2.4s infinite, reduced-motion off; the loader runs while the main thread builds a WebGPU scene.

## 1. Stagger via a per-element custom property and via `sibling-index()`: support in 2026

### Takeaway

`animation-delay: calc(var(--i) * 0.12s)` with `style={{'--i': n}}` works everywhere today and replaces the `nth-of-type` rules with one declaration. `sibling-index()` now ships in every engine (Chrome/Edge 138, Safari 26.2, Firefox 154, about 86% global usage), but it is not yet Baseline-wide, so the setup that pays off today is a `--i` fallback plus an `@supports` override, or `--i` alone.

### Cited Findings

- Per caniuse, `sibling-count()`/`sibling-index()` are supported in Chrome 138+, Edge 138+, Firefox 154+, Safari 26.2+ and iOS Safari 26.2+, with 86.34% global usage — [caniuse wf-sibling-count](https://caniuse.com/wf-sibling-count)
- Older sources disagree. The web-features explorer listed Chrome 138 (released 2025-06-24) and Firefox as unsupported, and a SitePoint article says Chrome 137. MDN flagged the feature as not Baseline. These pages predate Firefox 154, and the late-2026 caniuse data above supersedes them. — [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/sibling-count/); [SitePoint](https://www.sitepoint.com/css-siblingindex-and-siblingcount-native-list-staggering-without-javascript/); [MDN sibling-index()](https://developer.mozilla.org/docs/Web/CSS/sibling-index)
- Chrome's official stagger recipe is `animation-delay: calc(sibling-index() * var(--stagger-time))`. It multiplies by a time unit because the function returns a plain integer. For older browsers it puts a declaration based on a JS-set `--sibling-index` first, because older browsers drop the `sibling-index()` declaration and keep the first one. Disabling the animation under `prefers-reduced-motion: reduce` is marked as required. — [Chrome: Creating a stagger animation](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/dynamic-sibling-animations); [Chrome: Styling siblings based on count and index](https://developer.chrome.com/docs/modern-web-guidance/guides/css/dynamic-sibling-styling)
- With `animation-fill-mode: backwards`/`both`, the first keyframe applies during the delay, so staggered items stay hidden until their turn. That is the reason the current loader uses `backwards`. — [Chrome stagger guide via search summary / LogRocket](https://blog.logrocket.com/css-staggered-animations/)
- Josh Comeau describes combining keyframes with CSS variables as what "fully unlocked keyframe animations", including variables read inside keyframes ("partial keyframes") — [Josh Comeau: keyframe animations](https://joshwcomeau.com/animation/keyframe-animations); [partial keyframes](https://joshwcomeau.com/animation/partial-keyframes)
- Changing a CSS variable at runtime triggers paint and, through inheritance, style recalculation. Motion's article recommends scoping variables close to where they are used or registering them with `@property { inherits: false }`. — [Motion: Web animation performance tier list (5 Nov 2025)](https://motion.dev/magazine/web-animation-performance-tier-list)

### Inferences

- A static `--i` set once in the JSX and read only by `animation-delay` is not animated, so the warning about animating CSS variables does not apply. The animated properties remain `transform`/`opacity`.
- `sibling-index()` counts element siblings in the parent, not elements of one class (spec semantics, not confirmed by the sources above). In the lucide markup the base line and the pediment are siblings of the columns, so the index would be offset (e.g. columns at 2–5) unless the columns are wrapped in a `<g>`. Wrapping the four column paths in a `<g>` makes `sibling-index()` (or `nth-child`) map cleanly to 1–4.
- Given about 86% support and the cost of failure (the columns would all animate together), `--i` alone is simplest. `sibling-index()` would let the JSX drop the inline style once older Safari versions (before 26.2) fade out.

### Gaps

- No source confirmed how `sibling-index()` behaves on SVG children. Spec semantics suggest it counts all element siblings, but this is unverified.
- The exact Firefox 154 release date was not retrieved.

## 2. Tailwind v4: colocating keyframes and animation with the component

### Takeaway

Tailwind v4 can define the keyframes plus a named utility in `@theme` (`--animate-*` with nested `@keyframes`). Arbitrary utilities (`animate-[name_2.4s_ease_infinite]`, `[animation-delay:calc(var(--i)*0.12s)]`) and `motion-safe:`/`motion-reduce:` then let all _usage_ sit in the component's JSX. The `@keyframes` still have to live in CSS, in the global stylesheet's `@theme`, so the move is partial colocation.

### Cited Findings

- The `--animate-*` theme variables plus `@keyframes` nested in `@theme` generate an `animate-wiggle` utility. Docs example: `@theme { --animate-wiggle: wiggle 1s ease-in-out infinite; @keyframes wiggle { ... } }`. — [Tailwind: animation](https://tailwindcss.com/docs/animation)
- `animate-[<value>]` sets `animation: <value>` (example `animate-[wiggle_1s_ease-in-out_infinite]`). `animate-(<custom-property>)` is shorthand for `animate-[var(...)]`. — [Tailwind: animation](https://tailwindcss.com/docs/animation)
- `motion-safe:` and `motion-reduce:` conditionally apply animations according to `prefers-reduced-motion` (docs example `motion-safe:animate-spin` on an `<svg>`) — [Tailwind: animation](https://tailwindcss.com/docs/animation)
- Tailwind has no `animation-delay` utility (only `transition-delay`). A delay goes into the shorthand value or an arbitrary property. — [Tailwind: animation](https://tailwindcss.com/docs/animation)

### Inferences

- For this loader, readability probably improves with this split:
  - `@theme`: two short keyframe blocks (`map-column-rise`, `map-pediment`) and two `--animate-*` tokens.
  - JSX: `className="motion-safe:animate-map-column [animation-delay:calc(var(--i)*120ms)] [transform-box:fill-box] origin-bottom"` and `style={{'--i': i}}`.
  - Removed: the `nth-of-type` rules and the reduced-motion media query, since `motion-safe:` replaces it.
- Long arbitrary-value classes such as `[animation-delay:calc(...)]` hurt readability. The project's AGENTS.md already says to avoid long arbitrary `calc()` in Tailwind. A short scoped CSS rule (`.map-loading-column { animation-delay: calc(var(--i) * 120ms) }`) or a single `--animate-*` token may read better.
- With `motion-safe:` used everywhere, reduced-motion users get the static icon automatically, which matches the current behavior.
- A loop that is 2.4s long with multi-phase keyframes (settle, lift, fade) is choreography over time. Keyframe percentages are the natural notation for it, so in any CSS variant the keyframes themselves stay about the same length.

### Gaps

- Whether `@keyframes` inside `@theme` is tree-shaken when its utility is unused was not checked in the docs.

## 3. Web Animations API in a React effect, SMIL `<animate>`, Rive vs Lottie

### Takeaway

WAAPI (`el.animate(keyframes, { delay: i*120, iterations: Infinity })`) gives the same compositor path as CSS. It puts the stagger and timing in JS, but it needs refs plus a `useEffect` and cleanup, and it does not run before hydration. Motion's `useAnimate` mini (3.3 kB) is a thin wrapper over it. SMIL still works in every browser but is legacy and animates SVG attributes (the paint tier). Rive and Lottie are designer-tool formats with large runtimes and are disproportionate for a five-path icon.

### Cited Findings

- WAAPI and CSS can both run transform/opacity/filter/clip-path animations on the compositor, so they keep running regardless of the main thread. JS rAF libraries (e.g. GSAP) run on the main thread and "can jank when it's blocked". — [Motion tier list](https://motion.dev/magazine/web-animation-performance-tier-list); [Motion: React performance](https://motion.dev/docs/react-performance)
- Motion is built on WAAPI. Independent transforms (`x`, `scale`) are hardware accelerated, but animating a CSS variable is not, even when it feeds `transform`. Motion presents acceleration as progressive enhancement. — [Motion: React performance](https://motion.dev/docs/react-performance)
- Motion bundle sizes (gzip): full `motion` component about 43 kB; `m` + `LazyMotion` just over 5 kB initially, plus 24 kB `domAnimation` or 38 kB `domMax`; `useAnimate` mini 3.3 kB (WAAPI only); `useAnimate` hybrid 23 kB — [Motion: Reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size)
- Anime.js notes that custom/JS easing functions passed to WAAPI prevent hardware acceleration — [Anime.js: hardware-accelerated animations](https://animejs.com/documentation/web-animation-api/hardware-accelerated-animations)
- Safari's Core Animation loses acceleration when `playbackRate` is not 1 — [Motion tier list](https://motion.dev/magazine/web-animation-performance-tier-list)
- SMIL: Chrome announced its deprecation in 2015 (Chrome 45 warning) but later suspended it. Caniuse lists SMIL as supported in all current Chrome versions. The W3C wiki states SMIL animation was removed from SVG 2. The SVG WG still discussed SMIL edge cases in May 2026. — [blink-dev Intent to deprecate SMIL](https://groups.google.com/a/chromium.org/g/blink-dev/c/5o0yiO440LM); [MDN SVG animation with SMIL](https://developer.mozilla.org/zh-CN/docs/Web/SVG/SVG_animation_with_SMIL); [caniuse svg-smil](https://caniuse.com/svg-smil); [W3C wiki SVG/Animation](https://www.w3.org/wiki/SVG/Animation); [SVG WG minutes 2026-05-21](https://www.w3.org/2026/05/21-svg-minutes.html)
- WebKit had an open report (Sep 2025) of an `animateTransform` (SMIL) on a non-displayed SVG element still triggering style/layout recalculation about every second — [WebKit bug 298217](https://bugs.webkit.org/show_bug.cgi?id=298217)
- SVG attribute animation (`d`, `cx`, `r`) repaints every frame (tier C); use `transform` where possible — [Motion tier list](https://motion.dev/magazine/web-animation-performance-tier-list)
- Rive web runtime WASM sizes (brotli -9): canvas-lite 222 kB (707 kB raw), canvas 567 kB, webgl2 648 kB. React uses the same runtime. — [Rive: runtime sizes](https://rive.app/docs/runtimes/runtime-sizes.md)
- Rive's (vendor) claims:
  - State machines keep interaction logic in the `.riv` file, with optional scripting.
  - The binary files are "often 10 to 15 times smaller" than Lottie JSON.
  - The GPU Rive Renderer uses WebGL2 on the web.
  - dotLottie now also supports state machines.

  Page updated Oct 2026. — [Rive: Rive as a Lottie alternative](https://rive.app/blog/rive-as-a-lottie-alternative)

- One independent case study puts a Lottie file at about 24 kB and the same Rive file at about 2 kB — [Callstack: Lottie vs Rive](https://callstack.com/blog/lottie-vs-rive-optimizing-mobile-app-animation)
- Lottie player sizes:
  - The dotLottie web player fetches a WASM engine of roughly 500 kB compressed (per search summary of its README).
  - jLottie (a subset player) is 9–15 kB gzipped; the sources conflict.
  - Lottielab's player is under 50 KiB compressed.

  — [dotlottie-web README](https://raw.githubusercontent.com/LottieFiles/dotlottie-web/main/packages/web/README.md); [jLottie](https://lottiefiles.com/blog/working-with-lottie-animations/jlottie-the-ultimate-lottie-player-for-micro-animations); [Lottielab player](https://npmjs.com/package/@lottielab/lottie-player)

### Inferences

- WAAPI pros:
  - Delays and stagger are plain numbers in TS.
  - The keyframes are typed and colocated.
  - `getAnimations()` makes it possible to pause or finish cleanly, e.g. to end on a complete frame when loading finishes.
- WAAPI cons:
  - It needs `useRef`/`useEffect` and cleanup (`anim.cancel()`).
  - It starts only after hydration. A CSS loader animates from the SSR HTML, before JS runs, which matters for a loader.
  - Reduced motion must be checked in JS (`matchMedia`).
- Rive and Lottie render each frame with a JS/WASM player into canvas/WebGL or by mutating SVG, both driven from the main thread (likely rAF). They would therefore stall exactly when the WebGPU scene build blocks the main thread. They also add 50–650 kB to a standalone deploy whose disk is quota-limited. Neither fits this loader.
- SMIL animates attributes (paint tier). It is also outside the CSS/reduced-motion toolchain: `motion-safe` does not apply to it, and a media query cannot disable it short of removing the elements. Not recommended.

### Gaps

- No authoritative source states whether the Rive or dotLottie web runtimes can render from a worker (OffscreenCanvas) so they keep running while the main thread is blocked.
- No verified gzip size for full lottie-web was found.

## 4. Performance: what keeps animating while the main thread is busy, including SVG element transforms

### Takeaway

CSS animations and WAAPI of `transform`/`opacity` (also `filter`, `clip-path` in Chromium) can run on the compositor and survive main-thread blocking. For SVG _child elements_ the support differs by engine:

- **Chromium:** accelerates SVG animations since version 89.
- **Firefox:** runs most SVG transforms on the compositor, except under a nested `viewBox` (`<symbol>`/inner `<svg>`).
- **WebKit/Safari:** still uses its legacy SVG engine, which does not composite SVG element transform animations. The new LBSE engine that would do so is not the default as of July 2026.

So on Safari the column animation likely runs on the main thread and can stutter during the WebGPU build. That is the case whether it is written as CSS, WAAPI or Motion.

### Cited Findings

- Chrome: "As of Chromium 89, Chrome will join the likes of Firefox to enable hardware-acceleration by default on SVG animations". No developer action is needed. `opacity`, `filter`, `transform` are accelerated, and `background-color` and `clip-path` were announced as coming. — [Chrome for Developers: Updates in hardware-accelerated animation capabilities](https://developer.chrome.com/blog/hardware-accelerated-animations)
- A 2016 Chromium review noted that SVG transform animations were not composited because SVG was composited on the main thread. This is historical and was fixed by the 89 change. — [Chromium codereview 2225743002](https://codereview.chromium.org/2225743002)
- Firefox bug 779599 (reopened, unassigned): "Most SVG transforms happen on the compositor now". The remaining cases are a parent with a `viewBox`, such as `<symbol>` or an inner `<svg>`. Opacity already worked. — [Mozilla bug 779599](https://bugzilla.mozilla.org/show_bug.cgi?id=779599)
- WebKit (Igalia, 14 Jul 2026): in the legacy engine, SVG "got none" of the GPU-accelerated transform/animation work HTML received. LBSE, the layer-based SVG engine designed to enable accelerated transform animations, "works well, but it is still not the default" (runtime flag). Compositing among layer-less siblings was still being fixed in June/July 2026. — [Igalia: LBSE conditional layers](https://blogs.igalia.com/nzimmermann/posts/2026-07-14-lbse-conditional-layers/)
- WebKit bug 258122, "[LBSE] Enable accelerated transform animations for SVG renderers", is resolved, but only for LBSE — [WebKit bug 258122](https://bugs.webkit.org/show_bug.cgi?id=258122)
- Motion tier list:
  - S tier (compositor only, "Heavy main thread work won't affect an S-Tier animation"): transform, opacity, filter, clip-path.
  - Browsers may silently drop acceleration.
  - `will-change` should be used sparingly.

  — [Motion tier list](https://motion.dev/magazine/web-animation-performance-tier-list)

- web.dev: "Where possible, restrict animations to `opacity` and `transform`"; avoid properties that trigger layout or paint — [web.dev: animations guide](https://web.dev/articles/animations-guide)

### Inferences

- For this loader the choice of authoring API (CSS, Tailwind, WAAPI, Motion) does not change compositor eligibility. All four end up as the same transform/opacity animation. JS-driven per-frame players (Rive, Lottie, rAF libraries) are strictly worse when the main thread is blocked.
- Engine-agnostic smoothness on Safari: animate HTML elements (e.g. each column as its own absolutely positioned `<svg>` or `<div>` with a `scaleY` transform). HTML transforms composite in all engines. This is a structural trade-off against keeping the original single lucide SVG.
- `transform-box: fill-box; transform-origin: bottom` stays necessary for any approach that transforms SVG children.
- Firefox's `viewBox` caveat names `<symbol>` and inner `<svg>`. Whether the root inline `<svg viewBox>` counts as "a parent with a viewBox" is unclear from the bug. It should be verified in the Firefox profiler.

### Gaps

- No primary 2026 WebKit statement says outright that shipping Safari composites no SVG element transform animations. The conclusion is inferred from the Igalia post (LBSE not default; legacy engine lacks the acceleration).
- Whether a Safari animation on the compositor survives main-thread jank in practice needs a local test, e.g. busy-looping the main thread in a Storybook story.

## 5. General guidance: choosing CSS vs a JS library vs Lottie/Rive for tiny UI loaders

### Takeaway

The reputable sources agree:

- **CSS:** for simple, declarative, looping transform/opacity loops. These animate from SSR HTML at zero bundle cost and stay on the compositor.
- **WAAPI or a library (Motion):** when the animation must react to state or be interrupted, sequenced, spring-driven or orchestrated across components.
- **Lottie/Rive:** when a designer authors complex vector motion or interactive state machines in a tool.

The current loader is squarely in the CSS category. The maintainability gain comes from restructuring the CSS (an index variable, fewer selectors, Tailwind tokens), not from changing technology.

### Cited Findings

- JS overhead is rarely the bottleneck; render cost usually is. rAF libraries are more flexible and interruptible but run on the main thread. — [Motion tier list](https://motion.dev/magazine/web-animation-performance-tier-list)
- Motion's React docs recommend sticking to transform/filter/clipPath/opacity when a busy JS thread causes jank. They give no explicit "use CSS instead" rule. — [Motion: React performance](https://motion.dev/docs/react-performance)
- Motion's smallest WAAPI-only entry is 3.3 kB (`useAnimate` mini); the declarative `motion` component is about 43 kB — [Motion: Reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size)
- Rive's runtime (222–648 kB brotli) and Lottie players (from tens of kB up to about 500 kB WASM for dotLottie) target designer-authored assets and interactivity (state machines) — [Rive runtime sizes](https://rive.app/docs/runtimes/runtime-sizes.md); [Rive vs Lottie](https://rive.app/blog/rive-as-a-lottie-alternative); [dotlottie-web README](https://raw.githubusercontent.com/LottieFiles/dotlottie-web/main/packages/web/README.md)
- Chrome's modern-web guidance treats CSS (`sibling-index()` + `animation-delay`) as the default for staggered sibling animations and requires a reduced-motion opt-out — [Chrome: Creating a stagger animation](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/dynamic-sibling-animations)
- Tailwind's own docs use `motion-safe:animate-spin` on an inline `<svg>` loader as the canonical example — [Tailwind: animation](https://tailwindcss.com/docs/animation)

### Inferences

Decision checklist for this project:

1. **Static loop, transform/opacity only, must start before hydration and survive main-thread work?** Use CSS: `@theme` `--animate-*` + `motion-safe:` + `--i` stagger. This is the current case.
2. **Needs to react to progress, finish gracefully when loading ends, or be sequenced with other UI?** Use WAAPI directly or Motion's `useAnimate` mini (3.3 kB). Acceleration is kept for transform/opacity.
3. **Springs, layout animations, gestures, or orchestration across many components?** Use Motion `m` + `LazyMotion` (5 + 24 kB).
4. **Designer-authored illustration, interactive mascot, or many vector shapes morphing?** Use Rive (state machines, small files, large runtime) or Lottie (JSON/dotLottie; AE workflow). Each is a separate asset pipeline. They are main-thread rendered on the web and add hundreds of kB to the standalone.

Cognitive load argument:

- Today's cost comes from the coupling between `nth-of-type` positions and markup order, plus the separation of the keyframes from the component.
- An explicit `--i` (or a `<g>` wrapper + `sibling-index()`) makes the stagger data-driven and visible in JSX.
- Tailwind tokens put the animation name next to the element.
- About 60 lines of CSS could plausibly shrink to two keyframe blocks plus two tokens. This size estimate is not measured.

Pediment timing tied to the column cycle can be expressed as one shared `--cycle: 2.4s` variable and keyframe percentages. Neither WAAPI nor Motion makes a single fixed loop more readable than keyframe percentages.

### Gaps

- No Material Design or Apple HIG page on this specific choice was retrieved. Their motion guidance (duration, easing, reduced motion) was not consulted in this round.
- No Josh Comeau article explicitly comparing CSS, Motion and Lottie for loaders was found. His keyframe articles only support the CSS-variable pattern.
