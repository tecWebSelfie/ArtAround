// Integration specs (`pnpm test:int`): Node-only, no browser, no Storybook.
//
// Kept apart from vitest.config.mts on purpose: that root config also builds
// the Storybook browser project, and merely importing `storybookTest` and the
// Playwright provider costs ~2.5 s on every run, even with `--project int`.
// `pnpm test:int` points straight at this file; the root config lists it as
// one of its projects, so `vitest` from the root (or the IDE) still runs both.
import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { coverage } from './vitest.coverage.mts'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    name: 'int',
    // Integration specs exercise server code (Payload, jose, route handlers)
    // and none touches the DOM: under jsdom those libraries load their
    // browser builds and fail. A DOM spec opts in with `@vitest-environment jsdom`.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.{ts,tsx}'],
    // The nightly QA regression specs (tests/int/nightly/) call a RUNNING,
    // seeded server over HTTP, and some stay red until their fix merges: they
    // run only through `pnpm test:nightly` (NIGHTLY=1), against `pnpm start`
    // or `next dev` after `pnpm seed:e2e`. `pnpm test:int` (and CI, which
    // runs it before any server exists) leaves them out.
    exclude: [...configDefaults.exclude, ...(process.env.NIGHTLY ? [] : ['tests/int/nightly/**'])],
    // next-i18next's proxy build imports `next/server` without an extension,
    // which Node's ESM loader refuses; inlined, Vite resolves it (the proxy
    // spec, tests/int/printed-qr.int.spec.ts, runs `src/proxy.ts`).
    server: { deps: { inline: ['next-i18next'] } },
    // Off unless asked (`pnpm test:coverage`): see vitest.coverage.mts.
    coverage,
  },
})
