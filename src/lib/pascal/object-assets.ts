import type { Object as MuseumObject } from '@/payload-types'
import type { AssetInput } from '@pascal-app/core'

/**
 * Adapters from Payload museum objects to Pascal catalog assets.
 *
 * Every object is placeable on the museum map: an object with a saved Mint
 * model uses it, any other one (generation failed, pending or never started)
 * uses the bundled default info standee (`public/models/default-standee.glb`,
 * built by `pnpm models:standee`). Either way the asset keeps the Payload
 * object ID and the `museum-objects` category, which `museumObjectId()`
 * (`src/lib/tour-navigation.ts`) reads back from placed nodes. When a real
 * model arrives later, `upgradeDefaultModelNode()` swaps it into placed nodes
 * on the next museum map save (`syncMuseumObjects` in `Museums.ts`).
 */

/** App-relative path of the default model; matched by pathname, so any origin works. */
export const DEFAULT_MODEL_PATH = '/models/default-standee.glb'
const DEFAULT_THUMBNAIL_PATH = '/models/default-standee.svg'
/**
 * Real-world bounding box of the standee (width, height, depth in metres), as
 * printed by the generator. Pascal renders GLBs at native size and uses these
 * only for footprint, snapping and selection, so they must match the file.
 */
const DEFAULT_MODEL_DIMENSIONS: [number, number, number] = [0.35, 1.094, 0.26]
/** Pascal's schema default, used for Mint models (Payload stores no physical size). */
const PASCAL_DEFAULT_DIMENSIONS: [number, number, number] = [1, 1, 1]

/** The fields the adapters read, so narrowed `select` reads (Museums hook) fit too. */
type CatalogObject = Pick<MuseumObject, 'id' | 'name' | 'model' | 'thumbnail'>

// Pascal resolves relative URLs against its own CDN, so Payload uploads and
// public files must be absolute before entering the catalog or scene graph.
function absolute(url: string) {
  return new URL(url, process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000').href
}

function objectThumbnail(object: CatalogObject) {
  return object.thumbnail && typeof object.thumbnail === 'object' ? object.thumbnail.url : null
}

/**
 * The object's own Mint model as a catalog asset, or null while it has none.
 * The generation modal relies on the null to offer Generate instead of Position.
 */
export function objectAsset(object: CatalogObject): AssetInput | null {
  const model = object.model
  if (!model || typeof model !== 'object' || !model.url) return null

  const thumbnailUrl =
    model.thumbnail && typeof model.thumbnail === 'object'
      ? model.thumbnail.url
      : objectThumbnail(object)

  return {
    id: object.id,
    category: 'museum-objects',
    name: object.name,
    thumbnail: thumbnailUrl ? absolute(thumbnailUrl) : '',
    src: absolute(model.url),
    source: 'library',
  }
}

/** Catalog asset for any object: its Mint model, else the default standee. */
export function placeableObjectAsset(object: CatalogObject): AssetInput {
  return (
    objectAsset(object) ?? {
      id: object.id,
      category: 'museum-objects',
      name: object.name,
      // The object's own picture identifies it better than the generic icon.
      thumbnail: absolute(objectThumbnail(object) ?? DEFAULT_THUMBNAIL_PATH),
      src: absolute(DEFAULT_MODEL_PATH),
      dimensions: DEFAULT_MODEL_DIMENSIONS,
      source: 'library',
    }
  )
}

/** Whether a placed asset still shows the default standee. */
export function usesDefaultModel(asset: { src?: unknown }): boolean {
  if (typeof asset.src !== 'string') return false
  try {
    return new URL(asset.src, 'http://localhost').pathname === DEFAULT_MODEL_PATH
  } catch {
    return false
  }
}

/**
 * A placed museum-object node with the default standee, re-pointed at the
 * object's Mint model once it exists; otherwise the node unchanged. Only the
 * model fields change, so the node's id, position, rotation and object ID stay
 * put and tours referencing it keep working.
 */
export function upgradeDefaultModelNode<T extends { asset?: Record<string, unknown> }>(
  node: T,
  object: CatalogObject,
): T {
  const real = node.asset && usesDefaultModel(node.asset) ? objectAsset(object) : null
  if (!real) return node
  return {
    ...node,
    asset: {
      ...node.asset,
      src: real.src,
      thumbnail: real.thumbnail,
      dimensions: real.dimensions ?? PASCAL_DEFAULT_DIMENSIONS,
    },
  }
}
