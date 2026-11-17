import { beforeEach, describe, expect, it, vi } from 'vitest'

// Room creation must stop before LiveKit is called when the host lacks purchase access.
const api = vi.hoisted(() => ({
  canStart: false,
  findByID: vi.fn(),
  createGroupRoom: vi.fn(),
}))
vi.mock('server-only', () => ({}))
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('@/lib/session', () => ({
  asViewer: async () => ({ user: { id: 'visitor' }, overrideAccess: false }),
}))
vi.mock('@/lib/tour-start-access', () => ({
  getTourStartAccess: async () => ({ lockedPrice: 450, canStart: api.canStart }),
}))
vi.mock('@/lib/group-room', () => ({
  createGroupRoom: (...args: unknown[]) => api.createGroupRoom(...args),
  GroupNameTaken: class extends Error {},
}))
vi.mock('@/lib/rate-limit', () => ({ allowRequest: () => true }))
vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: async () => ({ findByID: api.findByID }),
}))

const { POST } = await import('@/app/api/rooms/route')
let requestNumber = 0
const createRequest = () =>
  new Request('http://localhost/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `visitor-${++requestNumber}`,
    },
    body: JSON.stringify({ tourId: 'tour-1', name: 'Anna' }),
  })

beforeEach(() => {
  api.canStart = false
  api.findByID.mockReset().mockResolvedValue({ id: 'tour-1', contents: ['paid-stop'] })
  api.createGroupRoom.mockReset().mockResolvedValue({ code: 'AB3X9K', hostKey: 'host-key' })
})

describe('POST /api/rooms paid-tour access', () => {
  it('refuses to create a room for a tour the host has not unlocked', async () => {
    const response = await POST(createRequest())

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'locked' })
    expect(api.createGroupRoom).not.toHaveBeenCalled()
  })

  it('creates the room when the host is entitled to start the tour', async () => {
    api.canStart = true

    const response = await POST(createRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ code: 'AB3X9K', hostKey: 'host-key' })
    expect(api.createGroupRoom).toHaveBeenCalledWith('tour-1', 'Anna', false, '')
  })
})
