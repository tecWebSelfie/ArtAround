import { config } from 'dotenv'

// Match Next's local development configuration without overriding CI process variables.
config({ path: process.env.DOTENV_CONFIG_PATH ?? ['.env.local', '.env'] })

// jsdom specs (`@vitest-environment jsdom`) render Mantine, which reads
// `matchMedia` for the color scheme; jsdom has none.
if (typeof window !== 'undefined') {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}
