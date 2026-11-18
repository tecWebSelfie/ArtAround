// V8 coverage options shared by both Vitest entry points (`pnpm
// test:coverage` → vitest.int.config.mts, `pnpm test:coverage:all` →
// vitest.config.mts): Vitest reads `coverage` only from the config it was
// started with, never from a project. What it covers and what it can't:
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
