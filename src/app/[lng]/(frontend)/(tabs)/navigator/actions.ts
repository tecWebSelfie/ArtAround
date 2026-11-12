'use server'

import { railMuseums, type RailMuseum } from '@/lib/discover'
import { asViewer, getSession } from '@/lib/session'
import i18nConfig from '@/../i18n.config'
import type { TypedLocale } from 'payload'
import { z } from 'zod'

/**
 * The navigator home's "Museums near you": the museums nearest to a position
 * the visitor chose to share (`MuseumsRail`). Next exposes this as a public
 * POST endpoint, so the input is validated. The browser rounds the position
 * to about a kilometre before sending it, and it is never stored or logged:
 * it only orders the list.
 */

const input = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  lng: z.enum(i18nConfig.supportedLngs as [string, ...string[]]),
})

export async function museumsNear(position: z.input<typeof input>): Promise<RailMuseum[] | null> {
  const parsed = input.safeParse(position)
  if (!parsed.success) return null
  const { latitude, longitude, lng } = parsed.data
  const [{ payload }, viewer] = await Promise.all([getSession(), asViewer()])
  return railMuseums({ payload, locale: lng as TypedLocale, viewer, near: [longitude, latitude] })
}
