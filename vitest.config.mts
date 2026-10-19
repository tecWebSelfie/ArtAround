import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    projects: [{
      extends: true,
      test: {
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        include: ['tests/int/**/*.int.spec.{ts,tsx}']
      }
    }, {
      extends: true,
      // Vitest uses Vite 6 here; plugin-react 6 configures JSX through Vite 8's Oxc API.
      esbuild: { jsx: 'automatic' },
      optimizeDeps: { esbuildOptions: { jsx: 'automatic' } },
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        // A file's first story also pays for that file's cold module loads
        // (Mantine, Pascal, three). In a full run every file loads at once and
        // that alone can exceed Vitest's 15s default, so stories that pass in
        // isolation timed out. Passing stories don't wait any longer.
        testTimeout: 60_000,
        // Visual regression (`pnpm test:visual`): screenshots each story after
        // it renders; a no-op unless VISUAL_REGRESSION=1. See .storybook/vitest.visual.ts.
        setupFiles: ['./.storybook/vitest.visual.ts'],
        provide: { visualRegression: process.env.VISUAL_REGRESSION === '1' },
        browser: {
          enabled: true,
          headless: true,
          // Visual runs resize the story iframe to 390×844 and 1280×800 (see
          // .storybook/vitest.visual.ts). The test UI scales the iframe down to
          // fit the browser window, so give it room for both at 1:1 pixels.
          provider: playwright(
            process.env.VISUAL_REGRESSION === '1'
              ? { contextOptions: { viewport: { width: 1600, height: 1100 } } }
              : {},
          ),
          instances: [{
            browser: 'chromium'
          }],
          expect: {
            toMatchScreenshot: {
              // One flat folder keyed by story id instead of a __screenshots__
              // folder beside every story file. Browser and platform stay in the
              // name because font rendering differs between OSes.
              resolveScreenshotPath: ({ arg, browserName, platform, ext, root }) =>
                `${root}/__screenshots__/${arg}-${browserName}-${platform}${ext}`
            }
          }
        }
      }
    }]
  }
});
