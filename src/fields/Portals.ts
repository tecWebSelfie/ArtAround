import { Field } from 'payload'
import { Coordinates } from './Coordinates'

export const Portal = (name: string): Field => {
  return {
    name: name,
    type: 'group',
    fields: [
      Coordinates,
      {
        name: 'type',
        type: 'select',
        options: ['entrance', 'exit', 'passway', 'lift', 'stairs'],
      },
    ],
  }
}
