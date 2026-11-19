/**
 * `@/i18n.server` in Storybook (resolved here by `.storybook/main.ts`): the
 * server `getT` of async Server Component stories, backed by the same bundled
 * instance as client components (src/mocks/i18n.ts), so both halves of a page
 * translate, interpolate and switch language alike. The real module reads the
 * locale files with `fs` in development, which a browser can't.
 */
import type { getT as realGetT } from '@/i18n.server'
import { i18n } from './i18n'

export const fallbackLng = 'en'

export const getT = (async (ns?: string | string[], options?: { keyPrefix?: string }) => ({
  t: i18n.getFixedT(i18n.language, ns ?? 'common', options?.keyPrefix),
  i18n,
  lng: i18n.language,
})) as unknown as typeof realGetT
