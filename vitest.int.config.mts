// Integration specs (`pnpm test:int`): Node-only, no browser, no Storybook.
//
// Kept apart from vitest.config.mts on purpose: that root config also builds
// the Storybook browser project, and merely importing `storybookTest` and the
// Playwright provider costs ~2.5 s on every run, even with `--project int`.
// `pnpm test:int` points straight at this file; the root config lists it as
// one of its projects, so `vitest` from the root (or the IDE) still runs both.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

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
    // next-i18next's proxy build imports `next/server` without an extension,
    // which Node's ESM loader refuses; inlined, Vite resolves it (the proxy
    // spec, tests/int/printed-qr.int.spec.ts, runs `src/proxy.ts`).
    server: { deps: { inline: ['next-i18next'] } },
  },
})
