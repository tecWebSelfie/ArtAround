import { docAccessOperation, type CollectionSlug, type PayloadRequest } from 'payload'

/**
 * Per-document permissions of the request's user, computed by Payload from the
 * collection's own access functions (`docAccessOperation`, what the admin
 * panel uses). The one place that asks Payload this question: frontend pages
 * (`getDocPermissions` in `session.ts`) and custom endpoints both go through
 * it, so a rule changed in a collection applies everywhere at once.
 */
export const docPermissions = (req: PayloadRequest, collection: CollectionSlug, id: string) =>
  docAccessOperation({ collection: req.payload.collections[collection], id, req })

/**
 * Whether the request's user may update the document. Endpoints that let only
 * the owner steer an action (e.g. the object model generation) ask this,
 * and their tests replace it to cover owners and non-owners alike.
 */
export async function canUpdateDoc(
  req: PayloadRequest,
  collection: CollectionSlug,
  id: string,
): Promise<boolean> {
  return Boolean((await docPermissions(req, collection, id)).update)
}
