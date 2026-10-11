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
  },
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      optimizeDeps: {
        // Pascal publishes its editor as TSX. Optimize it with its CommonJS dependencies.
        extensions: ['.tsx'],
        include: ['@pascal-app/editor'],
      },
    }),
}
export default config
