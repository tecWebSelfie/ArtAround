import type { GroupField, NumberField, SelectField, TextField } from 'payload'

/** Currencies we expose in the admin. Sandbox pricing only — no live money involved. */
export const PRICING_CURRENCIES = ['eur', 'usd', 'gbp'] as const
export type PricingCurrency = (typeof PRICING_CURRENCIES)[number]

/**
 * Price stored in minor units (cents) as an integer, so we never do float math
 * on money. `undefined`/`0` means the document is free.
 */
const priceCents: NumberField = {
  name: 'priceCents',
  type: 'number',
  min: 0,
  admin: {
    description: 'Price in cents (e.g. 499 = €4.99). Leave empty or 0 to keep it free.',
    step: 1,
  },
}

const currency: SelectField = {
  name: 'currency',
  type: 'select',
  required: true,
  defaultValue: 'eur',
  options: PRICING_CURRENCIES.map((value) => ({ label: value.toUpperCase(), value })),
}

const stripePriceID: TextField = {
  name: 'stripePriceID',
  type: 'text',
  admin: {
    description:
      'Optional. A pre-created Stripe Price ID (price_…). When empty, checkout builds the price inline from priceCents.',
  },
}

/**
 * Group factory for sellable documents. Not localized (prices must stay
 * identical across locales). Wrap a document with this to make it purchasable
 * through `POST /api/checkout`.
 */
export function pricingField(): GroupField {
  return {
    name: 'pricing',
    type: 'group',
    required: false,
    admin: {
      description: 'Sell this document as a one-off purchase. Free when priceCents is empty/0.',
    },
    fields: [priceCents, currency, stripePriceID],
  }
}

/** A document is paid only when it carries a positive price. */
export function isPaidDoc(pricing?: { priceCents?: number | null } | null | undefined): boolean {
  return (pricing?.priceCents ?? 0) > 0
}
