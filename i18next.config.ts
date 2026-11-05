import { defineConfig } from 'i18next-cli'
import i18nConfig from './i18n.config'

export default defineConfig({
  locales: i18nConfig.supportedLngs,
  extract: {
    input: [
      'src/app/**/*.{js,jsx,ts,tsx}',
      'src/components/**/*.{js,jsx,ts,tsx}',
      'src/lib/pascal/**/*.{ts,tsx}',
      '!**/*.stories.{js,jsx,ts,tsx}',
    ],
    output: 'src/app/i18n/locales/{{language}}/{{namespace}}.json',
    defaultNS: 'common',
    // Keys are the English text itself, so they may contain a colon
    // ("Museum: {{name}}", "Your answer:"). Namespaces come from
    // `useTranslation`/`getT`/`useT`, never from a `ns:key` prefix: a colon
    // must not split the key.
    nsSeparator: false,
  },
})
