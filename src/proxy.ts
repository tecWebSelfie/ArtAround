import { createProxy } from 'next-i18next/proxy'
import { NextResponse, type NextRequest } from 'next/server'
import i18nConfig from '../i18n.config'
import { MUSEUM_COOKIE_OPTIONS, MUSEUM_MODE_COOKIE, OBJECT_ID } from './lib/museum-cookie'

// Language detection & routing (next-i18next `createProxy`, see
// https://github.com/i18next/next-i18next): bare URLs (/navigator,
// /marketplace, /museum/123…) are redirected to /{lng}/… negotiating the
// locale (cookie → Accept-Language → fallback), while localized URLs pass
// through with the language header set.
const i18nProxy = createProxy(i18nConfig)

/**
 * Printed QR codes (downloaded by museum staff, `QrCodeButton`) end with
 * `?museum=<id>`: whoever scans one is standing in that museum, so the app
 * opens in museum mode (cookie `aa-museum`, as the museum switch sets it).
 * The parameter is dropped with a redirect, so the address bar and any link
 * shared from there are the plain URL: museum mode is never forced on someone
 * who only received a link. An unknown id behaves like global mode
 * (`museumScope`).
 *
 * Printed codes are language-free, so the i18n proxy redirects them to
 * `/{lng}/…` anyway: that redirect drops the parameter too, so a scan costs a
 * single redirect.
 */
export function proxy(request: NextRequest) {
  const response = i18nProxy(request)
  const museum = request.nextUrl.searchParams.get('museum')
  if (museum === null) return response

  const location = response.headers.get('location')
  const target = new URL(location ?? request.nextUrl.href, request.url)
  target.searchParams.delete('museum')
  const redirect = NextResponse.redirect(target, location ? response.status : 307)
  // Keep whatever the i18n proxy set (its language cookie).
  for (const cookie of response.headers.getSetCookie())
    redirect.headers.append('set-cookie', cookie)
  if (OBJECT_ID.test(museum)) {
    redirect.cookies.set(MUSEUM_MODE_COOKIE, museum, MUSEUM_COOKIE_OPTIONS)
  }
  return redirect
}

export const config = {
  // The next-i18next README matcher plus `.*\..*`, so static files
  // (/compass.svg, /mockServiceWorker.js, /media/*.jpg, …) are never
  // locale-redirected (createProxy's extension skip-list has no .txt/.json).
  matcher: [
    '/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js|site.webmanifest|.*\\..*).*)',
  ],
}
