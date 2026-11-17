import { nestMarkersInLevel, type MapLike } from './museum-plugin/marker-hierarchy'
import { rebaseAssetUrls } from './object-assets'

/**
 * A stored museum map repaired for loading in the browser, by the viewer and
 * the editor alike: legacy root markers nested under the ground level (Pascal
 * drops them otherwise) and asset URLs saved with the fallback origin pointed
 * at the site's public origin (the one new assets get, `absolute()` in
 * object-assets.ts), else this page's. Never mutates the stored map.
 */
export function loadableMap<T extends MapLike>(map: T): T {
  const origin = process.env.NEXT_PUBLIC_PAYLOAD_URL || window.location.origin
  return rebaseAssetUrls(nestMarkersInLevel(map), new URL(origin).origin)
}
