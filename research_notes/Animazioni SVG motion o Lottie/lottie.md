# Lottie for a small looping loading indicator (React 19 / Next.js 16), as of late 2026

Context checked in the repo (2026-11-25): the current loader is `src/components/pascal/MapLoading.tsx` (1.8 KB TSX, lucide `Landmark` paths) plus about 60 lines of CSS in `src/app/[lng]/(frontend)/globals.css` (`.map-loading-column` / `.map-loading-roof`, keyframes `map-loading-rise` (scaleY + opacity) and `map-loading-settle` (translateY + opacity), staggered `animation-delay`s, `animation: none` under `prefers-reduced-motion: reduce`). Color comes from `currentColor`.

Method note: package versions, dates and byte sizes below were measured directly from the npm registry and the published tarballs on 2026-11-25 (`npm view`, `npm pack`, `gzip -9`). Where a figure comes from a web page it is cited. GitHub API access was not available in this session, so repo activity comes from web pages.

## Current players and packages: maintenance status and sizes

### Takeaway

Two families exist: airbnb `lottie-web` (pure JS, SVG/canvas/HTML renderers, last npm release 5.13.0 in May 2025, slow-moving) and LottieFiles `@lottiefiles/dotlottie-web` (ThorVG compiled to WASM, canvas only, released weekly, 0.83.2 on 2026-11-12, still 0.x). The lightest realistic option costs about 46 KB gzip of JS (lottie-web light); dotLottie costs about 31 KB gzip JS plus a ~1.2 MB WASM file (~490 KB gzip), against roughly 0 KB extra for the current CSS.

### Cited Findings

- npm registry, 2026-11-25 (measured): `lottie-web` latest 5.13.0, published 2025-05-21; previous release 5.12.2 was 2023-06-13 (a ~2-year gap). — [npm lottie-web](https://www.npmjs.com/package/lottie-web)
- npm registry (measured): `@lottiefiles/dotlottie-web` 0.83.2, published 2026-11-12 (0.83.0 on 2026-11-11, 0.83.1 and 0.83.2 on 2026-11-12): very frequent releases, still pre-1.0. `@lottiefiles/dotlottie-react` 0.22.3, modified 2026-11-18, depends on `dotlottie-web` 0.83.2 exactly, peer `react ^17 || ^18 || ^19`. — [npm dotlottie-web](https://www.npmjs.com/package/@lottiefiles/dotlottie-web), [npm dotlottie-react](https://www.npmjs.com/package/@lottiefiles/dotlottie-react)
- npm registry (measured): `lottie-react` (Gamote) 3.1.2, published 2026-09-07; it is a thin wrapper that depends on `lottie-web ^5.13.0`, peers `react`/`react-dom ^18.2.0 || ^19.0.0`. `@lottiefiles/react-lottie-player` 3.6.0 (2026-08-04) also exists. — [npm lottie-react](https://www.npmjs.com/package/lottie-react)
- lottie-web GitHub page (fetched 2026-11-25): 792 open issues, 71 open PRs, 32.6k stars; renderers `svg`/`canvas`/`html`; no runtime color API described (only `updateDocumentData` for text layers). — [airbnb/lottie-web](https://github.com/airbnb/lottie-web)
- The original Airbnb authors left Airbnb but remained core contributors (2020 post); the maintainer's sponsor page says he is self-employed and maintains Lottie on his own. Snyk showed conflicting "Sustainable" vs "Inactive" ratings; a third-party tracker lists a last commit of Sep 1, 2025. — [Airbnb Engineering](https://medium.com/airbnb-engineering/continuing-our-support-of-lottie-open-source-community-9e50e66ebb04), [GitHub Sponsors buba447](https://www.github.com/sponsors/buba447), [Snyk advisor](https://snyk.io/advisor/npm-package/lottie-web), [goodfirstissue](https://www.goodfirstissue.org/airbnb/lottie-web)
- lottie-web 5.13.0 build sizes (measured, minified / gzip -9): full `lottie.min.js` 305.7 KB / 76.1 KB; `lottie_svg.min.js` 242.6 KB / 62.3 KB; `lottie_light.min.js` (SVG only, no expressions) 168.4 KB / 46.4 KB; `lottie_light_canvas.min.js` 203.0 KB / 54.3 KB. The package also ships `lottie_worker.min.js` and `lottie_canvas_worker.min.js`. Unpacked npm package is 25.4 MB (irrelevant for the browser but relevant to `node_modules`). — [npm lottie-web 5.13.0 tarball](https://www.npmjs.com/package/lottie-web)
- `lottie.min.js` and `lottie_svg.min.js` contain an `eval(` call (expressions support); `lottie_light.min.js` does not (measured with grep). Inference: the light build avoids needing `unsafe-eval` in a CSP.
- dotlottie-web 0.83.2 sizes (measured): `dist/index.js` 161 KB / 31.3 KB gzip; `dotlottie.worker.js` 75.5 KB / 14.8 KB gzip; `dotlottie-player.wasm` 1,225,695 B / ~492 KB gzip; separate `webgl/` (1.36 MB) and `webgpu/` (1.41 MB) WASM builds. dotlottie-react's own `index.js` is 3.4 KB / 1.3 KB gzip and starts with `"use client"`. — [npm dotlottie-web](https://www.npmjs.com/package/@lottiefiles/dotlottie-web)
- LottieFiles docs: "the WASM engine (roughly 500 KB compressed) is fetched from a CDN the first time a player is constructed"; nothing renders until it is downloaded and compiled; the performance guide recommends preloading it. — [How the web player works](https://docs.lottiefiles.com/en/runtimes/distributions/js/v0.x/core-concepts.md)
- The bundled code falls back to `cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web@0.83.2/dist/dotlottie-player.wasm` and `unpkg.com/...`; `DotLottie.setWasmUrl(url)` self-hosts it, and "Setting an explicit URL also disables the built-in jsdelivr/unpkg fallback" (from `index.d.ts`, measured). — [dotlottie-web README](https://raw.githubusercontent.com/LottieFiles/dotlottie-web/main/README.md)
- Blog estimates conflict with measured numbers: a dev.to comparison cites lottie-web "about 240 KB gzipped" and dotLottie "around 50 KB"; measured gzip is 76 KB (full lottie-web) and 31 KB JS + ~490 KB WASM (dotLottie). The 240 KB figure matches minified, not gzipped size. — [dev.to CSS vs Lottie 2025](https://dev.to/fazalshah/css-animation-vs-lottie-which-should-you-use-in-2025-55p7)
- Animation file size: the same source gives 10–200 KB JSON for typical Lottie animations vs 0 KB for CSS; LottieFiles cites a 1.3 MB JSON shrinking to 58 KB as `.lottie` (zip). — [dev.to](https://dev.to/fazalshah/css-animation-vs-lottie-which-should-you-use-in-2025-55p7), [LottieFiles blog](https://lottiefiles.com/blog/working-with-lottie-animations/difference-png-svg-lottie)

### Inferences

- For a 4-columns-plus-pediment motion, the animation JSON itself would likely be a few KB (simple shape layers, a handful of keyframes), but the player is the cost: +46 KB gzip at minimum (lottie-web light, SVG) or +31 KB JS +~490 KB WASM (dotLottie). For a loader whose job is to appear _before_ a heavy 3D scene, that is a regression in time-to-first-paint of the loader itself, since the player must load before anything is drawn.
- dotLottie's WASM adds ~1.2 MB to `.next/standalone` assets if self-hosted (needed: production should not depend on jsdelivr/unpkg; CSP too). Relevant to the deploy-quota constraint in AGENTS.md.
- dotLottie is 0.x with near-daily releases: exact pinning and frequent re-verification would be needed; lottie-web is stable but slow (2 years between 5.12.2 and 5.13.0) with a large open-issue backlog.

### Gaps

- No primary source on lottie-web's roadmap or an official maintenance statement in 2025-2026; GitHub API was not reachable from this session.
- Brotli sizes (what Next.js actually serves) not measured; gzip -9 was used.

## Authoring workflow, editing in code, git diffs, maintenance when the icon changes

### Takeaway

A Lottie animation is authored in a design tool (After Effects + Bodymovin, or LottieFiles' browser-based Lottie Creator) and exported as JSON or a zipped `.lottie`; it is not meant to be hand-edited. Every change to the Landmark icon or the timing becomes a round trip through a tool and an opaque JSON (or binary zip) diff, whereas the current CSS is ~60 readable lines a developer can tweak in place.

### Cited Findings

- lottie-web README: animations are exported from After Effects with the Bodymovin plugin; "This is real time rendering", and it recommends keeping AE projects lean. — [airbnb/lottie-web](https://github.com/airbnb/lottie-web)
- Lottie Creator (LottieFiles, browser editor) supports defining color slots and themes; exports go through the LottieFiles Handoff panel; themes are embedded in the `.lottie` container, "allowing runtime theme switching without re exporting"; docs recommend that all color changes rely on slots, not raw colors, before exporting. — [Lottie Creator theming](https://docs.lottiefiles.com/en/creator/16_theming), [Theming export](https://docs.lottiefiles.com/en/creator/16_theming/export)
- Themes only work in `.lottie` files; plain Lottie JSON does not support embedded themes; "JSON-only CDN files cannot switch themes." — [Theming and slots (native)](https://docs.lottiefiles.com/en/runtimes/distributions/native/v0.x/theming-and-slots), [Lottie Creator theming](https://docs.lottiefiles.com/en/creator/16_theming)
- Theme files live in a `t/` directory inside the `.lottie` archive and are referenced from `manifest.json`. — [dotLottie theming](https://docs.lottiefiles.com/en/format/dotlottie/interactivity/theming.md)
- Comparison articles: CSS suits spinners/simple effects with "no libraries, no extra assets"; Lottie fits when "a designer hands you a file" or when CSS would take hundreds of lines. — [dev.to CSS vs Lottie](https://dev.to/fazalshah/css-animation-vs-lottie-which-should-you-use-in-2025-55p7)

### Inferences

- Git review: a `.lottie` file is a zip, so git shows a binary change; a Lottie JSON is a large single-line or deeply nested array of numbers (keyframes as `{"t":..,"s":[..]}`, shape paths as vertex/tangent arrays) that reviewers cannot meaningfully read. Timing or easing changes that are one-line CSS edits today would become regenerated files.
- The lucide `Landmark` geometry would be duplicated: once in lucide (used elsewhere in the app, e.g. `MuseumSwitch.tsx`, `MarketplaceCard.tsx`) and once baked into the Lottie file; a lucide upgrade that redraws the icon would silently diverge.
- Nobody on the project is identified as a motion designer; the developer would become the AE/Creator author, which is a new tool and skill to maintain for one small loader.

### Gaps

- No source found on Lottie Creator pricing/plan limits in late 2026 or whether exports require a LottieFiles account/workspace (the Handoff panel suggests so, not confirmed).
- No source found on tooling that produces readable Lottie diffs (e.g. a pretty-print or semantic diff convention).

## Runtime theming: following currentColor, light/dark and per-museum brand colors

### Takeaway

dotLottie can set any color at runtime through typed color slots (`setColorSlot(slotId, [r,g,b,a])`, 0–1 floats), so a per-museum brand color is technically reachable, but only from JavaScript: the canvas cannot read CSS `currentColor` or a CSS variable, so the app must resolve the computed color and push it into the player on every theme/museum/color-scheme change. lottie-web has no color API at all; recoloring means editing the JSON before load or overriding fills on the rendered SVG DOM.

### Cited Findings

- dotlottie-web 0.83.2 type definitions (measured): `setColorSlot(slotId: string, value: ColorSlotValue): boolean` — "Static color [r, g, b, a] or array of keyframes"; also `getSlotIds`, `getSlots`, `setSlots`, `setTheme`, `setThemeData`; the worker variant returns Promises. — [npm dotlottie-web](https://www.npmjs.com/package/@lottiefiles/dotlottie-web)
- Web slots use RGB arrays on a 0–1 scale (e.g. `[1, 0.34, 0.13]`); the docs recommend the typed slot APIs over the untyped bulk `setSlots`. Creator uses 0–255 and converts to 0–1. — [Theming and slots](https://docs.lottiefiles.com/en/runtimes/distributions/native/v0.x/theming-and-slots)
- A slot is "a named, typed placeholder" overridable "with a static value or with keyframed values that animate"; themes are named styling sets stored in the `.lottie` and applied by ID. — [How the web player works](https://docs.lottiefiles.com/en/runtimes/distributions/js/v0.x/core-concepts.md)
- dotLottie theming customizes "animation properties at runtime without modifying the original animation file", targeting Lottie slots (colors, scalars such as opacity and stroke width). — [dotLottie theming](https://docs.lottiefiles.com/en/format/dotlottie/interactivity/theming.md)
- lottie-web: the only runtime data update listed is `updateDocumentData` (text). Recoloring approaches are third-party, e.g. `lottie-palette`, which "only supports the SVG renderer". — [airbnb/lottie-web](https://github.com/airbnb/lottie-web), [lottie-palette](https://www.npmjs.com/package/lottie-palette)
- WebKit bug reports show `fill="currentColor"` combined with later CSS `color` changes not always repainting/transitioning in SVG. — [WebKit 227219](https://bugs.webkit.org/show_bug.cgi?id=227219), [WebKit 237531](https://bugs.webkit.org/show_bug.cgi?id=237531)

### Inferences

- With dotLottie (canvas): the slot must be authored in the file (a color slot on every shape's fill/stroke), then a client hook reads `getComputedStyle(el).color` (or Mantine's primary from the theme), converts it to 0–1 RGBA and calls `setColorSlot` on load and on every change of museum or color scheme. This replaces today's zero-code `currentColor` inheritance with an imperative sync, and the first frame may render in the authored default color until the slot is applied.
- Themes (named sets baked into the file) fit light/dark, but not an arbitrary per-museum color produced at runtime by Leonardo; for that, `setColorSlot` with a computed value is the only route.
- With lottie-web's SVG renderer, a CSS override like `.loader path { fill: currentColor; stroke: currentColor }` would likely work because the output is plain SVG DOM, but it fights the renderer (which writes fill attributes/styles each frame for animated colors) and is not a documented API; untested here.

### Gaps

- Not verified whether a dotLottie color slot applied before the first frame avoids a flash of the default color.
- No documentation found for a lottie-web "color override" API in 5.13.0 (it appears not to exist).

## Rendering: SVG vs canvas, crispness at 56px, main thread vs workers

### Takeaway

lottie-web's SVG renderer gives resolution-independent vector output in the DOM but runs its frame loop on the main thread via `requestAnimationFrame`; dotLottie draws raster frames into a `<canvas>` at `devicePixelRatio` (crisp if DPR is honored) and, in its default form, also runs on the main thread; only `DotLottieWorker` (OffscreenCanvas in a Web Worker) or lottie-web's worker builds move rendering off the main thread, which is the case that matters while a WebGPU scene is being built.

### Cited Findings

- lottie-web renderers: `svg`, `canvas`, `html`; `progressiveLoad` is SVG-only. — [airbnb/lottie-web](https://github.com/airbnb/lottie-web)
- lottie-web 5.13.0 builds contain `requestAnimationFrame` (measured); the package ships `lottie_worker.min.js` / `lottie_canvas_worker.min.js` builds (measured file listing). — [npm lottie-web](https://www.npmjs.com/package/lottie-web)
- dotLottie: ThorVG ("an open-source C/C++ vector graphics engine, compiled to WebAssembly") rasterizes each frame and "draws the result onto an HTML `<canvas>`"; the same engine runs on iOS/Android/React Native. — [How the web player works](https://docs.lottiefiles.com/en/runtimes/distributions/js/v0.x/core-concepts.md)
- `DotLottieWorker` "moves the whole engine into a Web Worker so rendering work leaves the main thread entirely"; same API but every call returns a Promise; it always uses the CPU renderer (no GPU backends in the worker). Animations share one worker by default; `workerId` spreads them. — [How the web player works](https://docs.lottiefiles.com/en/runtimes/distributions/js/v0.x/core-concepts.md), [Web worker guide](https://docs.lottiefiles.com/en/runtimes/distributions/js/v0.x/advanced/web-worker.md), [developers.lottiefiles.com worker](https://developers.lottiefiles.com/docs/dotlottie-player/dotlottie-web/worker)
- The worker draws through an `OffscreenCanvas`; if a CSP blocks inline (`blob:`) workers, self-host `dotlottie.worker.js` and call `DotLottieWorker.setWorkerUrl` (same-origin). — [dotlottie-web README](https://raw.githubusercontent.com/LottieFiles/dotlottie-web/main/README.md), [README 0.81.0](https://unpkg.com/@lottiefiles/dotlottie-web@0.81.0/README.md)
- OffscreenCanvas support: Chrome 69, Edge 79, Firefox 105, Safari 16.4. — [web.dev OffscreenCanvas](https://web.dev/articles/offscreen-canvas)
- dotlottie-web `renderConfig` (measured from types): `devicePixelRatio` (defaults to `window.devicePixelRatio`), `autoResize`, `freezeOnOffscreen` (default true, "Pause rendering when canvas is outside the viewport"), and a `quality` 0–100. dotlottie-react exports `DotLottieWorkerReact`. — [npm dotlottie-react](https://www.npmjs.com/package/@lottiefiles/dotlottie-react)
- The main-thread `DotLottie` class drives frames with `requestAnimationFrame` (16 occurrences in `dist/index.js`, measured).

### Inferences

- Crispness at 56 px: SVG output is always crisp; canvas at DPR 2–3 (112–168 device px) is crisp too as long as `devicePixelRatio` is kept and the canvas is sized to the CSS box (`autoResize`). Not a differentiator.
- Jank while the 3D scene builds: a main-thread Lottie (lottie-web SVG/canvas, or `DotLottie`) stops advancing whenever a long task blocks the main thread, exactly like a JS-driven animation. `DotLottieWorker` avoids that, but its worker must still be spawned and its ~1.2 MB WASM fetched and compiled before the first frame, during the same busy period. The current CSS animates `transform`/`opacity`; whether the browser composites transforms on SVG child elements off the main thread is not established here (see Gaps), so the CSS version may also stall under heavy main-thread work.
- A single WASM engine in a worker plus WebGPU scene building compete for CPU on low-end phones; the CPU-only worker renderer is a further cost.

### Gaps

- No measurement found (or made) of whether Chrome/Safari/Firefox run CSS `transform` animations on individual SVG `<path>`/`<line>` children on the compositor thread; this decides whether the existing CSS loader already survives main-thread jank. Worth a quick DevTools performance trace before choosing.
- No benchmark found of DotLottieWorker time-to-first-frame on mobile.

## Accessibility: prefers-reduced-motion and ARIA

### Takeaway

Neither Lottie player honors `prefers-reduced-motion` automatically (no reduced-motion option found in dotlottie-web/react 0.83.2/0.22.3 types); the app would keep doing it itself (matchMedia, then `autoplay={false}` and a static frame). ARIA works the same as today: the loader's status semantics live on the wrapper.

### Cited Findings

- No `reduced` / `prefers-reduced-motion` string found in dotlottie-web 0.83.2 `index.d.ts` or dotlottie-react 0.22.3 (measured grep). Lottie animations autoplay when configured to; a common pattern checks `matchMedia('(prefers-reduced-motion: reduce)')` before `loadAnimation`, listening for changes in a `useEffect`. — [dev.to Lottie accessibility](https://dev.to/fazalshah/lottie-animations-and-accessibility-prefers-reduced-motion-aria-and-best-practices-51fo)
- LottieFiles' WCAG guide: provide text alternatives with `aria-label`/`aria-labelledby`, and respect reduced-motion preferences. — [LottieFiles WCAG best practices](https://developers.lottiefiles.com/docs/resources/wcag)
- lottie-web `rendererSettings` accepts `title` and `description` for the generated SVG ("Adds SVG title element for accessible animation title"). — [airbnb/lottie-web](https://github.com/airbnb/lottie-web)
- Meaningful loaders: `role="img"`/`aria-label` or a `role="status"` live region; decorative ones `aria-hidden`. — [dev.to Lottie accessibility](https://dev.to/fazalshah/lottie-animations-and-accessibility-prefers-reduced-motion-aria-and-best-practices-51fo), [web.dev motion](https://web.dev/learn/accessibility/motion)

### Inferences

- Today's single CSS `@media (prefers-reduced-motion: reduce)` block reacts live with no JS; with Lottie it becomes a hook plus a chosen static frame (`setFrame`) and must also handle the case where the player has not loaded yet.

### Gaps

- None material beyond the absence of a built-in reduced-motion switch.

## SSR / Next.js: client-only, pre-hydration flash, lazy loading

### Takeaway

Both players are browser-only (canvas/WASM, or DOM SVG generated by JS), so the server HTML contains only an empty container; nothing animates until JS hydrates, the player chunk loads and (for dotLottie) the WASM is fetched. The current inline SVG + CSS renders and animates from the first HTML byte.

### Cited Findings

- `@lottiefiles/dotlottie-react` 0.22.3 `dist/index.js` begins with `"use client"` (measured); it exposes `setWasmUrl` and `DotLottieWorkerReact`. — [npm dotlottie-react](https://www.npmjs.com/package/@lottiefiles/dotlottie-react)
- dotlottie-react props: `autoplay` (default false), `loop` (default false), `renderConfig` (`devicePixelRatio`, `autoResize` default true), `dotLottieRefCallback` to reach the player instance. — [dotlottie-react README 0.22.3](https://unpkg.com/@lottiefiles/dotlottie-react@0.22.3/README.md)
- Nothing renders until the WASM engine is downloaded and compiled; preload recommended. — [How the web player works](https://docs.lottiefiles.com/en/runtimes/distributions/js/v0.x/core-concepts.md)
- Guides advise against bundling large animation JSON into main JS and to load it at runtime. — [dev.to Lottie performance guide](https://dev.to/fazalshah/lottie-animation-performance-the-complete-optimization-guide-2025-3e6h)

### Inferences

- In Next.js 16 the player would sit behind `next/dynamic` with `ssr: false` (or a client component gated on mount) and need a static SVG/CSS placeholder to avoid an empty box, i.e. the current implementation would survive as the fallback, so Lottie adds a layer rather than replacing one.
- lottie-web touches `document`/`window` at import time in its builds, which is the usual reason it is dynamically imported in Next.js; not re-verified for 5.13.0.

### Gaps

- No official Next.js 16 / React 19 integration guide from LottieFiles or lottie-web was found.

## When Lottie is the right tool vs overkill

### Takeaway

Sources converge: Lottie earns its cost for designer-made, illustrative or complex vector motion (character animation, morphing paths, many layers, cross-platform reuse on iOS/Android), while a short icon motion made of a few transforms and opacity fades is CSS/SVG territory. This loader (4 lines scaling, one shape translating, opacity, one color from `currentColor`, reduced-motion off-switch) is the latter.

### Cited Findings

- CSS for spinners and simple effects (0 KB extra, no JS); Lottie when a designer hands over a file or CSS would need hundreds of lines. — [dev.to CSS vs Lottie 2025](https://dev.to/fazalshah/css-animation-vs-lottie-which-should-you-use-in-2025-55p7), [dev.to Lottie vs CSS](https://dev.to/rahul_khorde_31/lottie-vs-css-animations-which-one-should-you-use-for-modern-web-experiences-2h15), [dev.to Lottie vs SVG](https://dev.to/rahul_khorde_31/lottie-vs-svg-animation-which-one-should-you-use-in-real-projects-2k2l)
- SVG icons land in single-digit KB and inline SVG can be controlled per element with CSS/JS. — [SVGator: Lottie vs SVG](https://www.svgator.com/help/export-and-file-formats/lottie-vs-svg), [SVGator: why users prefer SVG](https://www.svgator.com/blog/why-users-prefer-svg-over-lottie/)
- Lottie's strengths per its vendor: one vector animation file across web, iOS, Android; dotLottie compresses and adds themes, state machines and interactivity. — [LottieFiles: PNG vs SVG vs Lottie](https://lottiefiles.com/blog/working-with-lottie-animations/difference-png-svg-lottie), [How the web player works](https://docs.lottiefiles.com/en/runtimes/distributions/js/v0.x/core-concepts.md)
- Caveat on sources: most comparisons are dev.to posts and vendor blogs (LottieFiles, SVGator each promote their format); treat as opinion.

### Inferences

- For this case Lottie is not a "higher-level, more maintainable" implementation: it trades ~60 readable CSS lines and zero runtime for a binary/opaque asset, a 46–520 KB gzip runtime, an imperative color sync replacing `currentColor`, a client-only render with a fallback, manual reduced-motion handling, and (for dotLottie) a self-hosted 1.2 MB WASM in the standalone deploy. Its one concrete advantage here is `DotLottieWorker` rendering off the main thread during the 3D build, and that only matters if a trace shows the CSS animation actually stalls.
- Lottie becomes reasonable if the loader grows into an illustrative, designer-owned piece (e.g. a branded museum animation reused in native apps), ideally with a motion designer maintaining the source file.

### Gaps

- No first-hand comparison found measuring a CSS SVG-icon loader against a Lottie loader under a busy main thread.
