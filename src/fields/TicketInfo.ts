import { GroupField } from 'payload'

export const TicketInfo: GroupField = {
  name: 'ticketInfo',
  type: 'group',
  required: false,
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      required: false,
    },
  ],
}
