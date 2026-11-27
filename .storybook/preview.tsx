import type { Preview } from '@storybook/nextjs-vite'

import '../src/app/[lng]/(frontend)/globals.css'

import { ColorSchemeScript } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { theme } from '../src/theme'
import { AppMantineProvider } from '../src/components/mantine/AppMantineProvider'
import { mswLoader } from 'msw-storybook-addon/csf3'
import { setStoryCanvas } from './story-canvas'
import { i18n, missingKeys, STORY_LANGUAGES } from '../src/mocks/i18n'

const preview: Preview = {
  loaders: [mswLoader()],
  // Expose the rendered canvas to the visual-regression hook (vitest.visual.ts);
  // a no-op in the Storybook UI.
  afterEach: ({ canvasElement }) => {
    setStoryCanvas(canvasElement)
    // A `t()` key that is in no locale file shows its raw key to visitors:
    // fail the story that rendered it (src/mocks/i18n.ts).
    const missing = [...missingKeys]
    missingKeys.clear()
    if (missing.length)
      throw new Error(`Translation keys missing from the locale files:\n${missing.join('\n')}`)
  },
  parameters: {
    nextjs: {
      appDirectory: true,
    },
    // msw: [ //Default handlers for all stories, can be overridden in individual stories ],
    layout: 'fullscreen',
    options: {
      showPanel: false,
      storySort: (a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }),
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
  initialGlobals: { locale: 'en' },
  globalTypes: {
    locale: {
      name: 'Language',
      description: 'Language of the translated text (src/mocks/i18n.ts)',
      toolbar: {
        icon: 'globe',
        items: STORY_LANGUAGES.map((value) => ({ value, title: value.toUpperCase() })),
      },
    },
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
      // Resources are bundled, so this switches synchronously, before render.
      const locale = context.globals.locale || 'en'
      if (i18n.language !== locale) void i18n.changeLanguage(locale)
      return (
        <>
          <ColorSchemeScript />

          {/* The app's own provider: its CSS variables resolver and the
              defaults it adds (close-button labels, fixed-height text areas),
              so stories render and test what visitors get. */}
          <AppMantineProvider theme={theme} forceColorScheme={scheme}>
            <ModalsProvider>{renderStory()}</ModalsProvider>
          </AppMantineProvider>
        </>
      )
    },
  ],
}

export default preview
