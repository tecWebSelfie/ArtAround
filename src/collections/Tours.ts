import type { CollectionConfig } from 'payload'

import { editorial } from '@/fields/editorial'
import { pricingField } from '@/fields/PricingField'

export const TOURS_COLLECTION_SLUG = 'tours'

export const Tour: CollectionConfig = {
  slug: TOURS_COLLECTION_SLUG,
  fields: [
    editorial({ name: 'title', type: 'text', required: true }),
    editorial({ name: 'body', type: 'richText', required: false }),
    // Price it (leave `priceCents` empty for free) to make it purchasable
    // through `POST /api/checkout`.
    pricingField(),
  ],
}
