import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'
import { requireMongoDB } from '../helpers/mongodb'

let payload: Payload

describe('API', () => {
  beforeAll(async () => {
    // Fail in milliseconds with the fix, not after Payload's connect timeout.
    await requireMongoDB()
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })
})
