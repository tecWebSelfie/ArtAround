import { nestMarkersInLevel } from './museum-plugin/marker-hierarchy'
import { rebaseAssetUrls } from './object-assets'

/**
 * A stored museum map repaired for loading in the browser, by the viewer and
 * the editor alike: legacy root markers nested under the ground level (Pascal
 * drops them otherwise) and asset URLs saved with the fallback origin pointed
 * at this site. Never mutates the stored map.
 */
export function loadableMap<T extends { nodes?: Record<string, unknown>; rootNodeIds?: string[] }>(
  map: T,
): T {
  return rebaseAssetUrls(nestMarkersInLevel(map), window.location.origin)
}
