import { createServerI18next } from 'next-i18next/server'
import i18nConfig from '../i18n.config'

export const fallbackLng = i18nConfig.fallbackLng

// Server-only override: in dev, read locale files from disk so edits show up
// without restarting `next dev` (the shared config's import()-based loader is
// cached by the bundler). `i18n.config.ts` itself must stay free of `fs` — it
// is also imported by client components and the proxy.
const serverConfig =
  process.env.NODE_ENV === 'development'
    ? {
        ...i18nConfig,
        resourceLoader: async (lng: string, ns: string) => {
          const fs = await import('fs/promises')
          const path = await import('path')
          const content = await fs.readFile(
            path.resolve(process.cwd(), `src/app/i18n/locales/${lng}/${ns}.json`),
            'utf-8',
          )
          return JSON.parse(content)
        },
      }
    : i18nConfig

export const { getT, getResources, generateI18nStaticParams } = createServerI18next(serverConfig)
