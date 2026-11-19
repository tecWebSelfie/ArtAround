/**
 * The i18next instance of stories (and of any jsdom spec that renders
 * translated components: import it once): every namespace's real JSON for
 * English and Italian, bundled by Vite, so `t` resolves, interpolates and
 * pluralizes exactly as in the app, synchronously (no backend, no Suspense).
 * `initReactI18next` makes it the instance `useTranslation` finds without a
 * provider. Storybook's toolbar switches the language (`.storybook/preview.tsx`).
 *
 * A key missing from the English JSON (a `t()` added without `i18next-cli
 * extract`, a typo) is recorded in `missingKeys`; the preview fails the story
 * that used it. Options mirror the app's (i18n.config.ts → i18nextOptions).
 */
import { createInstance, type Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'

export const STORY_LANGUAGES = ['en', 'it'] as const

const files = import.meta.glob<Record<string, string>>('../app/i18n/locales/{en,it}/*.json', {
  eager: true,
  import: 'default',
})

const resources: Resource = {}
for (const [path, strings] of Object.entries(files)) {
  const [, lng, ns] = path.match(/locales\/(\w+)\/([\w-]+)\.json$/)!
  ;(resources[lng] ??= {})[ns] = strings
}

/** `ns:key` of every key looked up and found in no language since the last reset. */
export const missingKeys = new Set<string>()

export const i18n = createInstance()
void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: [...STORY_LANGUAGES],
  ns: Object.keys(resources.en ?? {}),
  defaultNS: 'common',
  resources,
  initAsync: false,
  returnEmptyString: false,
  saveMissing: true,
  missingKeyHandler: (_lngs, ns, key) => missingKeys.add(`${ns}:${key}`),
})
