import { GroupField } from 'payload'
import { editorial } from '@/fields/editorial'

export const TicketInfo: GroupField = {
  name: 'ticketInfo',
  type: 'group',
  required: false,
  fields: [
    editorial({ name: 'label', type: 'text', required: true }),
    {
      name: 'url',
      type: 'text',
      required: false,
    },
  ],
}
