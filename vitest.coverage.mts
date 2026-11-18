// V8 code coverage shared by both Vitest entry points: `pnpm test:coverage`
// (vitest.int.config.mts, the Node integration specs) and
// `pnpm test:coverage:all` (vitest.config.mts, the integration specs plus
// every Storybook story rendered in Chromium). Vitest only reads `coverage`
// from the config it was started with, never from a project, hence one
// object imported by both.
//
// V8 coverage needs no instrumented build: Node and Chromium count the
// executed bytes themselves, and Vitest maps them back to the sources through
// the transform's source maps (AST-aware remapping, the Vitest 4 default, so
// the numbers match what Istanbul would report). It covers whatever these
// runs execute: server code reached by the int specs, components reached by
// the stories. Code that only the Playwright e2e suite executes (route
// handlers and pages inside `next dev`/`next start`) is not counted; see
// docs/development.md → Coverage.
import type { CoverageOptions } from 'vitest/node'

export const coverage = {
  provider: 'v8',
  // Every source file, executed or not: a file no spec loads shows up at 0%
  // instead of vanishing from the report.
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    // Generated code and type-only declarations.
    'src/payload-types.ts',
    'src/app/(payload)/admin/importMap.js',
    'src/lib/pascal/mint/client/**',
    'src/@types/**',
    '**/*.d.ts',
    // Test scaffolding, not app code.
    '**/*.stories.{ts,tsx}',
    'src/stories/**',
    'src/mocks/**',
  ],
  // `text-summary` in the terminal, `html` to browse (coverage/index.html),
  // `json-summary` for scripts and CI, `lcov` for editor gutters (e.g.
  // VS Code's Coverage Gutters).
  reporter: ['text-summary', 'html', 'json-summary', 'lcov'],
  reportsDirectory: './coverage',
  // A failing spec still leaves the report of everything else that ran.
  reportOnFailure: true,
} satisfies CoverageOptions<'v8'>
