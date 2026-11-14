import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

import type { User } from '@/payload-types'

/**
 * What a tour purchase charges and unlocks: only the tour's VISITABLE locked
 * contents (`tours.visitableContents`, the same stored list the tour page
 * prices with), through `quoteCheckout` and the `POST /api/checkout` route
 * that feeds Stripe. No real Stripe call: the SDK client is a spy and Payload
 * is an in-memory fake that answers `findByID` like a read made as the buyer.
 */
vi.mock('server-only', () => ({}))
vi.mock('@payload-config', () => ({ default: {} }))

const createSession = vi.fn(async (_params: unknown) => ({
  id: 'cs_test_1',
  url: 'https://stripe.test/pay',
}))
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ checkout: { sessions: { create: createSession } } }),
}))

let fakePayload: Payload
vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: async () => fakePayload,
}))

const { quoteCheckout } = await import('@/lib/checkout-quote')
const { POST } = await import('@/app/api/checkout/route')

const buyer = { id: 'u1', collection: 'users' } as unknown as User

/** A paid content as the buyer reads it: `body` is withheld (null) while locked. */
const paid = (id: string, price: number, locked = true) => ({
  id,
  title: id,
  price,
  body: locked ? null : { root: {} },
})

function fakeFor(tour: Record<string, unknown>) {
  const findByID = vi.fn(async ({ collection }: { collection: string }) => {
    if (collection !== 'tours') throw new Error(`unexpected read of ${collection}`)
    return tour
  })
  fakePayload = {
    auth: async () => ({ user: buyer }),
    findByID,
  } as unknown as Payload
  return findByID
}

const tour = (contents: unknown[], visitableContents?: string[]) => ({
  id: 't1',
  title: 'Tour',
  contents,
  ...(visitableContents && { visitableContents }),
})

beforeEach(() => createSession.mockClear())

describe('quoteCheckout for a tour', () => {
  it('charges and unlocks only the visitable locked stops', async () => {
    fakeFor(tour([paid('a', 300), paid('gone', 500), paid('b', 200)], ['a', 'b']))
    const quote = await quoteCheckout(fakePayload, buyer, 'tours', 't1')
    expect(quote.amountCents).toBe(500)
    expect(quote.unlocks).toEqual(['a', 'b'])
  })

  it('skips visitable stops the buyer can already read', async () => {
    fakeFor(tour([paid('a', 300, false), paid('b', 200)], ['a', 'b']))
    const quote = await quoteCheckout(fakePayload, buyer, 'tours', 't1')
    expect(quote).toMatchObject({ amountCents: 200, unlocks: ['b'] })
  })

  it('has nothing to sell when the only locked stops are unavailable', async () => {
    fakeFor(tour([paid('a', 300, false), paid('gone', 500)], ['a']))
    const quote = await quoteCheckout(fakePayload, buyer, 'tours', 't1')
    expect(quote).toMatchObject({ amountCents: 0, unlocks: [] })
  })

  it('keeps every stop for a tour not backfilled yet (no stored list)', async () => {
    fakeFor(tour([paid('a', 300), paid('b', 200)]))
    const quote = await quoteCheckout(fakePayload, buyer, 'tours', 't1')
    expect(quote).toMatchObject({ amountCents: 500, unlocks: ['a', 'b'] })
  })
})

describe('POST /api/checkout for a tour', () => {
  const request = () =>
    new Request('http://localhost:3000/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ collection: 'tours', id: 't1' }),
    })

  it('sends Stripe the visitable total and ids only', async () => {
    fakeFor(tour([paid('a', 300), paid('gone', 500)], ['a']))
    const res = await POST(request())
    expect(res.status).toBe(200)
    const params = createSession.mock.calls[0]![0] as {
      metadata: { unlocks: string }
      line_items: { price_data: { unit_amount: number } }[]
    }
    expect(params.metadata.unlocks).toBe('a')
    expect(params.line_items[0]!.price_data.unit_amount).toBe(300)
  })

  it('answers 409 when only unavailable stops are locked, without calling Stripe', async () => {
    fakeFor(tour([paid('a', 300, false), paid('gone', 500)], ['a']))
    const res = await POST(request())
    expect(res.status).toBe(409)
    expect(createSession).not.toHaveBeenCalled()
  })

  it('counts the 20-id metadata cap on visitable stops, not on all of them', async () => {
    const many = Array.from({ length: 25 }, (_, i) => paid(`c${i}`, 100))
    // 25 locked stops, 20 of them visitable: within the cap.
    fakeFor(
      tour(
        many,
        many.slice(0, 20).map((c) => c.id),
      ),
    )
    expect((await POST(request())).status).toBe(200)
    fakeFor(
      tour(
        many,
        many.map((c) => c.id),
      ),
    )
    expect((await POST(request())).status).toBe(400)
  })
})
