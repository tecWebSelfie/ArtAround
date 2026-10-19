import type { I18nConfig } from 'next-i18next/proxy'

const SUPPORTED_LANGUAGES = ['en', 'it'] as const

const i18nConfig: I18nConfig = {
  supportedLngs: [...SUPPORTED_LANGUAGES],
  fallbackLng: SUPPORTED_LANGUAGES[0],
  defaultNS: 'common',
  ns: ['common', 'home', 'map-editor', 'tour-navigation', 'tour-quiz'],
  // Prefixes `createProxy` must skip entirely. Webapp routes are /{lng}/… —
  // the `(frontend)` segment is a route group: it scopes the folders but
  // never appears in the URL — so there is no `basePath` (that option is only
  // correct for a static segment BEFORE the locale, e.g. `/app/en/…`,
  // mixed-router setups). `/admin` is the Payload panel, `/monitoring` is the
  // Sentry tunnel (tunnelRoute in next.config.ts) — redirecting either would break it.
  ignoredPaths: ['/api', '/_next', '/static', '/admin', '/monitoring', '/sentry-example-page'],
  // Refetch translations on every render in dev so locale edits show up without
  // restarting `next dev`. No-op in production.
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  i18nextOptions: {
    returnEmptyString: false,
  },
  // This config is shared with client components (NavBar) and the proxy, so it
  // must stay bundler-safe: no `fs` imports here. The bundler-traceable
  // dynamic import keeps locale files in the serverless bundle, and
  // `reloadOnPrerender` (above) covers dev-time edits. For dev-only fs reads
  // see `i18n.server.ts`.
  resourceLoader: (lng, ns) => import(`./src/app/i18n/locales/${lng}/${ns}.json`),
}

export default i18nConfig
