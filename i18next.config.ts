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
  },
})
