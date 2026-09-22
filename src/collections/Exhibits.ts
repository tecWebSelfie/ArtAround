import { Coordinates } from '@/fields/Coordinates'
import { CollectionConfig } from 'payload'

export const Exhibits: CollectionConfig = {
  slug: 'exhibits',
  fields: [
    {
      name: 'objects',
      type: 'relationship',
      relationTo: 'objects',
      hasMany: true,
      required: true,
      minRows: 1,
    },
    Coordinates,
  ],
}
