import { ArrayField } from 'payload'

export const SocialLinks: ArrayField = {
  name: 'socials',
  type: 'array',
  required: false,
  fields: [
    {
      name: 'platform',
      type: 'text',
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      required: true,
    },
  ],
}
