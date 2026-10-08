import { createProxy } from 'next-i18next/proxy'
import i18nConfig from '../i18n.config'

// Language detection & routing (next-i18next `createProxy`, see
// https://github.com/i18next/next-i18next): bare URLs (/navigator,
// /marketplace, /museum/123…) are redirected to /{lng}/… negotiating the
// locale (cookie → Accept-Language → fallback), while localized URLs pass
// through with the language header set.
export const proxy = createProxy(i18nConfig)

export const config = {
  // The next-i18next README matcher plus `.*\..*`, so static files
  // (/compass.svg, /mockServiceWorker.js, /media/*.jpg, …) are never
  // locale-redirected (createProxy's extension skip-list has no .txt/.json).
  matcher: [
    '/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js|site.webmanifest|.*\\..*).*)',
  ],
}
