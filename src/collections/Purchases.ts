import type { Access, CollectionConfig, PayloadRequest, Where } from 'payload'

import type { User } from '@/payload-types'

export const PURCHASES_COLLECTION_SLUG = 'purchases'

/** Collections that can be bought. Keep in sync with `@/lib/entitlements`. */
export const PURCHASABLE_COLLECTIONS = ['contents', 'tours'] as const

const isSuperAdminUser = (req: PayloadRequest): boolean =>
  Boolean((req.user as User | null)?.isSuperAdmin)

const isSuperAdmin: Access = ({ req }) => isSuperAdminUser(req)

/**
 * A purchase is the durable receipt that a user may access a paid document.
 * Rows are written by trusted server code only (the Stripe webhook and the
 * checkout reconciliation on the success page) using the Local API, which
 * bypasses this access control on purpose. The rules below only govern who can
 * read/curate purchases through the REST/Admin surface.
 */
export const Purchases: CollectionConfig = {
  slug: PURCHASES_COLLECTION_SLUG,
  admin: {
    group: 'Commerce',
    useAsTitle: 'stripeSessionID',
    defaultColumns: ['user', 'status', 'productTitle', 'amountCents', 'purchasedAt'],
    description:
      'One row per paid Stripe Checkout session. Written by Stripe, read-only in the admin panel.',
  },
  access: {
    // Users may only read their own purchases; superadmins see everything.
    read: ({ req }): boolean | Where => {
      if (isSuperAdminUser(req)) return true
      const user = req.user as User | null
      if (!user) return false
      return { user: { equals: user.id } }
    },
    // Writes happen through the Local API (overrideAccess: true) — lock the doors.
    create: isSuperAdmin,
    update: isSuperAdmin,
    delete: isSuperAdmin,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'target',
      type: 'relationship',
      relationTo: [...PURCHASABLE_COLLECTIONS],
      required: true,
      index: true,
      admin: { description: 'The purchased content or tour.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'paid',
      index: true,
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'stripeSessionID',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Stripe Checkout Session ID (cs_…). Unique — makes webhooks idempotent.',
      },
    },
    { name: 'stripePaymentIntentID', type: 'text', index: true },
    { name: 'productTitle', type: 'text' },
    {
      name: 'amountCents',
      type: 'number',
      admin: { description: 'Amount actually paid, in cents.' },
    },
    { name: 'currency', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'purchasedAt', type: 'date' },
  ],
}
