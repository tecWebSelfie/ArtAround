# Motion (motion.dev, `motion/react`) for the looping staggered "Landmark" SVG loader

Scope: how the current CSS @keyframes loader (4 column paths scaleY 0→1 staggered 0/0.12/0.24/0.36 s, pediment drops in at 0.5 s, roof lifts and columns fade, 2.4 s cycle, infinite, ease cubic-bezier(0.16,1,0.3,1), off under prefers-reduced-motion) would look in Motion, and what it costs. The project has `motion` 13.4.0 installed (`node_modules/motion/package.json`), which pulls in `framer-motion` 13.4.0 and `motion-dom` 13.3.0. Where the docs were vague, I read the installed library source (paths under `node_modules/.pnpm/...`). That source is the ground truth for this project's version.

## Staggered children and looping an orchestrated sequence

### Takeaway

Variants with `delayChildren: stagger(0.12)` express the stagger cleanly, but they only orchestrate the _start_. An infinite loop must then be `repeat: Infinity` on each child, with every child's keyframes padded to the same 2.4 s so they stay in phase. The cleaner fit is a `useAnimate` timeline: `animate(sequence, { repeat: Infinity })`. Sequence-level infinite repeat is supported. Per-segment `repeat: Infinity` is not.

### Cited Findings

- Current transition API: `repeat` ("Set to `Infinity` for perpetual animation"), `repeatType` (`loop` / `reverse` / `mirror`), `repeatDelay`, and `times` (0–1 offsets, one per keyframe). — [Motion: Transitions](https://motion.dev/docs/react-transitions)
- Staggering children: `transition: { delayChildren: stagger(0.1) }` on the parent variant. `stagger(0.1, { from: "last" })` and `grid` options exist. `when: "beforeChildren" | "afterChildren"` sequences a parent against its children. The current docs present `delayChildren: stagger()` as the way to stagger and do not document `staggerChildren` (that is the older Framer Motion API; whether it still works in v13 was not verified). — [Motion: Transitions](https://motion.dev/docs/react-transitions)
- Timeline sequences: `animate([[target, keyframes, options], ...])`. A segment's `at` option takes an absolute time, a label, a label offset, or a time relative to the previous segment (e.g. `{ at: "-0.2" }`). Sequences exist only in the "hybrid" `animate` (22 kB), not in mini. — [Motion: animate()](https://motion.dev/docs/animate)
- Sequence-level repeat, from the installed source: `createAnimationsFromSequence(sequence, { defaultTransition = {}, ...sequenceTransition })` spreads `sequenceTransition` (so `repeat`, `repeatType`, `repeatDelay`) onto every generated per-element animation. Each element's keyframes are normalised to the total timeline duration, so `animate(seq, { repeat: Infinity })` loops the whole timeline in sync. `SequenceOptions extends AnimationPlaybackOptions` (which has `repeat`), and also has `delay`, `duration`, `defaultTransition`, `reduceMotion`, `skipAnimations` and `onComplete`. — `framer-motion/dist/es/animation/sequence/create.mjs`, `framer-motion/dist/dom.d.ts` (installed 13.4.0)
- Per-segment infinite repeat is rejected. `MAX_REPEAT = 20`, and the source warns: "Sequence segments can't repeat ${repeat} times — ignoring repeat option. Use a value below ${MAX_REPEAT} or apply repeat at the sequence level instead." — `framer-motion/dist/es/animation/sequence/create.mjs` (installed 13.4.0)
- Sequence segments default to `ease: "easeOut"` and `duration: 0.3` unless `defaultTransition` overrides them. — same file (`defaultTransition.duration || 0.3`, `ease = defaultTransition.ease || "easeOut"`)

### Inferences

- **Variants route.** For a looping cycle, variants add little. The stagger would be expressed as `delayChildren: stagger(0.12)`, but a `delay` plus `repeat: Infinity` on a child applies the delay only before the first iteration. The 2.4 s phase alignment must therefore be encoded in each child's keyframes/`times` (like the CSS today), not in delays. Readability is then similar to the CSS.
- **Timeline route.** `useAnimate` gives the most readable form: the timing reads top to bottom ("columns grow staggered, roof drops at 0.5, lift-off/fade at ~1.9"), with `stagger(0.12)` as the segment delay and `{ repeat: Infinity }` once.

### Gaps

- No sequence page on motion.dev could be fetched (`/docs/animate-sequence` returned 404). Sequence-level `repeat` is confirmed from the installed source, not from prose docs.
- I did not verify whether `staggerChildren` still works in v13 or was removed.

## SVG specifics (transform-box/origin, scaleY on motion.path, pathLength)

### Takeaway

On SVG children, Motion sets `transform-box: fill-box` and `transform-origin: 50% 50%` when it renders a transform. "Grow from the bottom" therefore still needs `originY: 1` (or `style={{ transformOrigin: "bottom" }}`). `pathLength` gives a line-drawing alternative.

### Cited Findings

- Docs: SVG transforms natively use the viewBox's top-left corner as origin. "Motion changes this behaviour so SVGs work the same as normal elements." `transformBox: "view-box"` restores native behaviour. Shorthand transforms (`x`, `scale`, ...) on SVG components "still render via the `style` tag". Use `attrX`/`attrY`/`attrScale` to animate SVG attributes instead. — [Motion: SVG animation](https://motion.dev/docs/react-svg-animation)
- Source: `if (style.transform || attrs.transformOrigin) style.transformOrigin = attrs.transformOrigin ?? "50% 50%"`, then `style.transformBox = styleProp?.transformBox ?? "fill-box"`, commented "SVG's element transform-origin uses its own median as a reference. Therefore, transformBox becomes a fill-box". — `motion-dom/dist/es/render/svg/utils/build-attrs.mjs` (installed 13.3.0)
- `pathLength`, `pathOffset` and `pathSpacing` are 0–1 progress values on path, circle, ellipse, line, polygon, polyline and rect, e.g. `initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}`. Path morphing needs paths with the same number and type of commands (Flubber is suggested otherwise). — [Motion: SVG animation](https://motion.dev/docs/react-svg-animation)
- The Motion performance article says animating SVG attributes like `d` or a circle's radius/position "needs to repaint the shape every frame". Its advice: "to move or resize SVG graphics, stick to `transform` where possible". — [Motion: Web Animation Performance Tier List (2025-11-05)](https://motion.dev/magazine/web-animation-performance-tier-list)

### Inferences

- Pitfall 1: the fill-box/center default only applies when Motion builds the transform from independent transform values. If you animate a raw `transform` string (needed for WAAPI acceleration, see below), keep `transform-box: fill-box; transform-origin: bottom` in CSS or `style` yourself.
- Pitfall 2: `scaleY(0)` on a stroked lucide path also squashes the stroke vertically. The current CSS has the same behaviour, so this is not a regression.
- Pitfall 3: `pathLength` on stroked lucide icons would turn "columns grow" into "columns are drawn". It is paint-heavy (stroke-dasharray/offset change each frame, JS-driven), so it is a worse fit for a loader shown during main-thread-heavy work.

### Gaps

- No authoritative source on whether `originY` is honoured unchanged with fill-box on `<motion.path>` in v13. The source suggests yes (transformOrigin is built from originX/originY), but I did not test it.

## Reduced motion

### Takeaway

`MotionConfig reducedMotion="user"` makes transforms jump instantly but keeps opacity animating. An infinite opacity loop (the columns' fade, the roof's fade) would therefore still blink. For this loader, branch on `useReducedMotion()` and render a static icon, or skip starting the timeline.

### Cited Findings

- With `reducedMotion="user"`, "all `motion` components will automatically disable transform and layout animations, while preserving the animation of other values like `opacity` and `backgroundColor`". `"always"` and `"never"` override the OS setting. `useReducedMotion()` returns a boolean. — [Motion: Accessibility](https://motion.dev/docs/react-accessibility)
- Source: when reduce motion is on, values in `positionalKeys` (width/height/top/left/right/bottom plus every transform key) get `{ type: false }`, i.e. they jump to the target instantly. Other values keep their transition. — `motion-dom/dist/es/animation/interfaces/visual-element-target.mjs`, `render/utils/keys-position.mjs` (installed 13.3.0)
- `animate()` sequences accept `reduceMotion` in `SequenceOptions`. — `framer-motion/dist/dom.d.ts` (installed 13.4.0)
- In dev, Motion warns "You have Reduced Motion enabled on your device. Animations may not appear as expected." — `motion-dom/dist/es/render/VisualElement.mjs`

### Inferences

- The current CSS approach (a `prefers-reduced-motion` media query that turns the animation off) is already correct and SSR-safe. In Motion you would write `const reduce = useReducedMotion(); useEffect(() => { if (reduce) return; ... }, [reduce])` and render the final static frame.

### Gaps

- None material.

## Bundle size, hardware acceleration, main-thread cost (key question)

### Takeaway

Under heavy main-thread work (the WebGPU scene build), Motion is no better than the current CSS and probably worse. In installed v13.4.0, only values literally named `opacity`, `clipPath`, `filter`, `transform`, `backgroundColor` (and some colours) go to WAAPI. Independent transforms like `scaleY`/`y`, which give the readable API, run in Motion's JS frame loop and will stutter while the main thread is blocked. CSS @keyframes and WAAPI on `transform`/`opacity` are compositor-eligible. Whether Chrome actually composites them on SVG elements is poorly documented.

### Cited Findings

- Motion docs: "Hardware acceleration is the ability to run an animation off the main JavaScript thread." "If your app is running other JS code at the same time, your animation code could be blocked from running at all." WAAPI and CSS "can run some animations off the main JS thread, directly on the compositor". "Because Motion is built on WAAPI, it can also run hardware accelerated animations." Independent transforms (`x`, `scale`) "are hardware accelerated, just like animating `transform` directly". "Animating a CSS variable isn't hardware accelerated". "Each browser has different rules for when an animation does or doesn't receive acceleration." Treat acceleration as progressive enhancement. — [Motion: Performance](https://motion.dev/docs/performance)
- The Motion magazine (2025-11-05) says: "Motion hands `transform` animations, including independent transforms like `x` and `scale`, to the browser via WAAPI." It also says rAF-driven libraries are "vulnerable to jank whenever the main thread gets blocked". — [Web Animation Performance Tier List](https://motion.dev/magazine/web-animation-performance-tier-list)
- **This contradicts the installed source.** `acceleratedValues = new Set(["opacity","clipPath","filter","transform","backgroundColor"])`. `supportsBrowserAnimation()` first returns false unless `acceleratedValues.has(name) || colorProperties.has(name)`, so a value named `scaleY`, `y` or `scale` is never sent to WAAPI. It then also requires: the element is an `HTMLElement` or `SVGElement` (so SVG _is_ allowed), `!onUpdate`, `!repeatDelay`, `repeatType !== "mirror"`, `damping !== 0`, `type !== "inertia"`, and no `transformTemplate` for `transform`. `AsyncMotionValueAnimation` uses WAAPI only if `supportsBrowserAnimation(options)` passes. — `motion-dom/dist/es/animation/waapi/supports/waapi.mjs`, `animation/waapi/utils/accelerated-values.mjs`, `animation/AsyncMotionValueAnimation.mjs` (installed 13.3.0)
- Bundle sizes (gzip+min, Rollup): the `motion` component is 43 kB and cannot be tree-shaken further. `m` + `LazyMotion` is just over 5 kB initial, plus `domAnimation` +24 kB (animations, variants, exit, tap/hover/focus) or `domMax` +38 kB (adds drag/pan and layout). `useAnimate` is 3.3 kB mini (WAAPI-only) or 23 kB hybrid (sequences, motion values, independent transforms). `import * as m from "motion/react-m"`, and `<LazyMotion strict>` throws on `motion.*`. — [Motion: Reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size)
- `animate()` comes in mini (3.2 kB) and hybrid (22 kB) versions. Mini "can animate HTML and SVG styles using native browser APIs", supports only default keyframes or spring, has no `repeatDelay`, and has no sequences. Hybrid adds independent transforms, SVG path drawing, sequences and more. — [Motion: animate()](https://motion.dev/docs/animate)
- SVG compositing in browsers: webperf.tips lists SVG (`animateTransform`) as not compositor-accelerated. A secondary source suggests `will-change: transform` on the SVG container for complex illustrations. I found no current Chromium documentation confirming either way. — [webperf.tips](https://webperf.tips/tip/animate-on-compositor-thread/), [bersus.io guide](https://bersus.io/insights/creative-dev/smooth-animations-on-the-web-performance-guide/)

### Inferences

- The readable Motion version (`scaleY: [0, 1]`, `y: [-3, 0]`) loses acceleration for the transforms in v13.4.0. Only the opacity tracks would go to WAAPI. During WebGPU scene construction (long tasks), the columns and roof would freeze while the CSS version can keep going. This is the decisive cost for this loader.
- To keep acceleration in Motion, animate the raw `transform` key with string keyframes (`transform: ["scaleY(0)", "scaleY(1)"]`), with no `repeatDelay` and no `repeatType: "mirror"`. That passes the WAAPI check and also works in sequences (each element/value becomes its own animation via `animateSubject`). However, it gives up the independent-transform readability and the automatic fill-box, so it is essentially CSS keyframes written in JS.
- If the transforms run on WAAPI, the main-thread cost of _starting_ them still matters. The `useEffect` that starts the timeline runs only after hydration, which may itself be delayed by the same heavy work.
- Bundle: the project already ships `motion` (a 43 kB `motion` component wherever it is imported). A loader using `useAnimate` hybrid adds ~23 kB if not already in the chunk. The mini `animate` from `motion/mini` (~3.2 kB) is WAAPI-only and therefore compositor-eligible, but it has no sequences, so the stagger becomes per-element `delay` plus padded keyframes, the same as CSS.
- Practical check: Chrome DevTools > Performance, with a long task injected, plus the Animations panel / "non-composited animation" insight on the loader. Compare the CSS and Motion versions.

### Gaps

- No authoritative, current (2026) Chromium/WebKit/Gecko documentation says whether CSS/WAAPI `transform` animations on SVG child elements (`<path>`) are composited off the main thread. Treat the CSS loader's smoothness under long tasks as something to measure, not assume.
- The docs and magazine claim of WAAPI for independent transforms may describe a newer Motion release than 13.4.0 (I could not read upstream GitHub from this session) or may be inaccurate. Re-check `accelerated-values` after any upgrade.

## Next.js App Router / RSC and SSR

### Takeaway

Any `motion.*` / `useAnimate` component needs `'use client'`. Before hydration, the server HTML is a frozen frame. Unlike CSS keyframes, nothing animates until React hydrates and the effect runs, which matters for a loader shown during heavy work.

### Cited Findings

- Motion SVG components render transforms through `style`, and `build-attrs` writes `transformOrigin`/`transformBox` into the style object at render time. So the server HTML contains the `initial` frame, e.g. `scaleY(0)` with fill-box. — `motion-dom/dist/es/render/svg/utils/build-attrs.mjs`; [Motion: SVG animation](https://motion.dev/docs/react-svg-animation)
- Motion's "optimised appear" handoff (`window.MotionHandoffAnimation`) exists in the animation path for starting animations before hydration, but it is tied to Framer's export tooling. — `motion-dom/dist/es/animation/interfaces/visual-element-target.mjs`

### Inferences

- With `initial` set to "columns at scaleY 0", the pre-hydration loader shows only the base and steps (columns invisible). With `useAnimate`, the SSR'd SVG is static until the effect runs. Either way, the CSS version is strictly better before hydration.
- A hybrid is possible: keep the CSS animation and use Motion only for the enter/exit of the loader overlay (`AnimatePresence`). That is where Motion's API actually helps.

### Gaps

- Not verified whether the appear-handoff can be used outside Framer sites in Next.js.

## Motion code sketch (for comparison; v13 `motion/react`)

```tsx
'use client'
// Sketch only. The timeline version: readable, but scaleY/y run on Motion's JS
// frame loop in v13.4.0 (not WAAPI), so the loader can stutter during long tasks.
import { useAnimate, useReducedMotion, stagger } from 'motion/react'
import { useEffect } from 'react'

const ease = [0.16, 1, 0.3, 1] as const

export function LandmarkLoader() {
  const [scope, animate] = useAnimate<SVGSVGElement>()
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) return // render the static icon
    const controls = animate(
      [
        [
          '.col',
          { scaleY: [0, 1], opacity: [1, 1] },
          { duration: 0.5, delay: stagger(0.12), ease },
        ],
        ['.roof', { y: [-3, 0], opacity: [0, 1] }, { duration: 0.4, at: 0.5, ease }],
        ['.roof', { y: -3, opacity: 0 }, { duration: 0.4, at: 1.8, ease }],
        ['.col', { opacity: 0 }, { duration: 0.4, at: '<', ease }],
      ],
      { repeat: Infinity }, // sequence-level repeat is supported; per-segment Infinity is ignored
    )
    return () => controls.stop()
  }, [animate, reduce])

  return (
    <svg ref={scope} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      {/* columns grow from the bottom: Motion sets fill-box, but origin defaults to centre */}
      {COLUMN_PATHS.map((d) => (
        <path
          key={d}
          className="col"
          d={d}
          style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
        />
      ))}
      <path className="roof" d={ROOF_PATH} />
      <path d={BASE_PATH} />
    </svg>
  )
}
```

For WAAPI/compositor eligibility, replace `scaleY: [0, 1]` with `transform: ['scaleY(0)', 'scaleY(1)']` and `y` with `transform: ['translateY(-3px)', 'translateY(0)']`. Each element's transform must then be a single track, because the roof's drop and lift would both write `transform`. The variants equivalent (`<motion.svg variants={{ show: { transition: { delayChildren: stagger(0.12) } } }}>` with `<motion.path variants={{ show: { scaleY: [0, 1, 1, 0], transition: { repeat: Infinity, duration: 2.4, times: [...] } } }} />`) only staggers the first iteration. Its per-child `times` must encode the phase, as the CSS does today.
