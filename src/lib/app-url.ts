import i18nConfig from '@/../i18n.config'

/**
 * QR codes carry normal app URLs; accept only local paths or same-origin HTTP(S)
 * so scanning can use Next navigation without turning into an external redirect.
 */
export function parseAppUrl(
  rawValue: string | undefined,
  origin = window.location.origin,
): URL | null {
  const raw = rawValue?.trim()
  if (!raw || (!raw.startsWith('/') && !/^https?:\/\//i.test(raw))) return null

  try {
    const url = new URL(raw, origin)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === origin
      ? url
      : null
  } catch {
    return null
  }
}

/**
 * Printed and shared QR codes carry language-free paths (`/tour/42`,
 * `/room/ABC123`) so each visitor reads in their own language: a phone camera
 * opens them through the i18n proxy (cookie → Accept-Language), and the in-app
 * scanner puts them in the app's current language. An existing `/{lng}` prefix
 * (older codes) is replaced the same way: inside the app, its language wins.
 */
export function inLanguage(pathname: string, lng: string) {
  const prefix = new RegExp(`^/(${i18nConfig.supportedLngs.join('|')})(?=/|$)`)
  return `/${lng}${pathname.replace(prefix, '')}`
}
