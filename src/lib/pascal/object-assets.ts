import type { Object as MuseumObject } from '@/payload-types'
import type { AssetInput } from '@pascal-app/core'

/** Only placeable objects become assets. Keep model-less objects in the query result. */
//Adapter function to convert a Payload MuseumObject to Pascal Editor's itemsPanel catalog AssetInput
export function objectAsset(object: MuseumObject): AssetInput | null {
  //check if object has a model, if not return null AssetInput
  const model = object.model
  if (!model || typeof model !== 'object' || !model.url) return null

  const thumbnailUrl =
    model.thumbnail && typeof model.thumbnail === 'object'
      ? model.thumbnail.url
      : object.thumbnail && typeof object.thumbnail === 'object'
        ? object.thumbnail.url
        : null

  // Pascal resolves relative URLs against its own CDN, so Payload uploads
  // must be absolute before entering the catalog or scene graph.
  const payloadURL = process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000'

  return {
    id: object.id,
    category: 'museum-objects',
    name: object.name,
    thumbnail: thumbnailUrl ? new URL(thumbnailUrl, payloadURL).href : '',
    src: new URL(model.url, payloadURL).href,
    source: 'library',
  }
}
