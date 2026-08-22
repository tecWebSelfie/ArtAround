import type { Preview, StoryObj } from '@storybook/nextjs-vite'

import '@mantine/core/styles.css'

import { ColorSchemeScript, MantineProvider } from '@mantine/core'
import { theme } from '../src/theme'

import type { MyStory } from '../src/types/storybook'

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    options: {
      showPanel: false,
      storySort: (a: MyStory, b: MyStory) => {
        a.title.localeCompare(b.title, undefined, { numeric: true })
      },
    },
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Mantine color scheme',
      defaultValue: 'light',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  decorators: [
    (renderStory, context) => {
      const scheme = (context.globals.theme || 'light') as 'light' | 'dark'
      return (
        <MantineProvider theme={theme} forceColorScheme={scheme}>
          <ColorSchemeScript />
          {renderStory()}
        </MantineProvider>
      )
    },
  ],
}

export default preview
