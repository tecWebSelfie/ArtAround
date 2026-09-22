import { Field } from 'payload'

export const Coordinates: Field = {
  name: 'coordinates',
  type: 'group',
  fields: [
    {
      name: 'x',
      type: 'number',
      required: true,
    },
    {
      name: 'y',
      type: 'number',
      required: true,
    },
  ],
}
