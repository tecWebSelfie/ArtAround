import type { StorybookConfig } from '@storybook/nextjs-vite'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
  staticDirs: ['../public'],
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-mcp',
    '@storybook/addon-themes',
    'msw-storybook-addon',
  ],
  framework: '@storybook/nextjs-vite',
  features: {
    componentsManifest: true,
    experimentalRSC: true,
  },
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      // Stories can always offer the simulated GPS source (its D-pad); app
      // builds only do with NEXT_PUBLIC_GPS_SIMULATOR=true (see gps-source.ts).
      define: { 'process.env.NEXT_PUBLIC_GPS_SIMULATOR': JSON.stringify('true') },
      // The voice assistant's API routes live in the Next app: forward them to
      // a local `pnpm dev`, so the orb can be tried for real in Storybook.
      server: {
        proxy: {
          '/api/assistant': 'http://localhost:3000',
          '/api/speech': 'http://localhost:3000',
        },
      },
      optimizeDeps: {
        // Pascal publishes its editor as TSX. Optimize it with its CommonJS dependencies.
        extensions: ['.tsx'],
        include: ['@pascal-app/editor'],
        // Keep next/image out of that bundle. Pre-bundled, the real CommonJS
        // next/image reaches the editor's `import Image from 'next/image'` as
        // `{ __esModule, default }`, and React rejects the object
        // ("Element type is invalid … ControlModes"), so the map editor story
        // never renders. External, it resolves through the Next.js framework.
        exclude: ['next/image'],
      },
    }),
}
export default config
