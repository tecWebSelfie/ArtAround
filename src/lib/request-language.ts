import i18nConfig from '../../i18n.config'
import type { PayloadRequest } from 'payload'
import { parseCookies } from 'payload/shared'

/**
 * The visitor's UI language for a message the server writes itself (a
 * Payload validation error a form shows as is): the language they browse in
 * (the `i18next` cookie the i18n proxy sets), else their browser's first
 * supported language, else English. Payload's own `req.i18n` only knows the
 * admin panel's languages, not all of the app's.
 */
export function requestLanguage(req: Pick<PayloadRequest, 'headers'>): string {
  const supported = (i18nConfig.supportedLngs || []) as readonly string[]
  const isSupported = (code: string | undefined | null): code is string =>
    Boolean(code && supported.includes(code))
  const cookie = req.headers ? parseCookies(req.headers).get('i18next') : undefined
  if (isSupported(cookie)) return cookie
  const accepted = (req.headers?.get('accept-language') ?? '')
    .split(',')
    .map((part) => part.split(';')[0]?.trim().toLowerCase().split('-')[0])
    .find(isSupported)
  return accepted ?? String(i18nConfig.fallbackLng ?? 'en')
}
